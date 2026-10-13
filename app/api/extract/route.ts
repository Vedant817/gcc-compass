import { NextResponse } from "next/server";
import { z } from "zod";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Extracted } from "@/lib/types";
import { chatJson, llmConfigured, LLMError } from "@/lib/llm";
import { buildExtractSystem } from "@/lib/prompts";
import { findCachedExtraction } from "@/lib/cachedExtractions";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  text: z.string().max(20_000).optional(),
  url: z.string().url().optional(),
  meta: z.object({
    title: z.string().max(200),
    publisher: z.string().max(120),
    url: z.string().url().optional().or(z.literal("")),
    published_date: z.string().max(20).optional().or(z.literal("")),
    type: z.enum(["official_policy", "industry_report", "broker_report", "news", "vendor_blog"]),
  }),
});

/* --------------------------------- rate limit ------------------------------ */

const hits = new Map<string, { count: number; reset: number }>();
const MAX_TRACKED_IPS = 500;
const EXTRACT_LIMIT = 5; // per minute

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    if (hits.size >= MAX_TRACKED_IPS) {
      for (const [key, r] of hits) if (now > r.reset) hits.delete(key);
      if (hits.size >= MAX_TRACKED_IPS) hits.clear();
    }
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  rec.count += 1;
  return rec.count > EXTRACT_LIMIT;
}

/* ----------------------------------- SSRF ---------------------------------- */

const MAX_FETCH_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 8_000;

/** Private, loopback and link-local ranges we refuse to fetch. */
function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    const [a, b] = p;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    // IPv4-mapped (::ffff:10.0.0.1) and 6to4/teredo embedded v4
    const mapped = /(?:^::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (lower.startsWith("2002")) return true;
    return false;
  }
  return true; // not a parseable IP: refuse
}

class UnsafeUrlError extends Error {}

/** Only http/https, and only hosts that resolve to public addresses. */
async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That URL isn't valid.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs can be fetched.");
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError("That host isn't fetchable.");
    return u;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError("Couldn't resolve that host.");
  }
  if (addresses.length === 0) throw new UnsafeUrlError("Couldn't resolve that host.");
  for (const a of addresses) {
    if (isPrivateAddress(a.address)) {
      throw new UnsafeUrlError("That host resolves to a private address.");
    }
  }
  return u;
}

/** Strip HTML to plain text for extraction. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Runs the cheap, model-free checks over a candidate result and shapes it. */
function shapeFacts(result: z.infer<typeof Extracted>, text: string) {
  const normalisedText = text.replace(/\s+/g, " ").trim();
  return result.facts.map((f) => {
    const value_num = f.value_num ?? null;
    const value_text = f.value_text ?? null;
    const quote = f.quote.replace(/\s+/g, " ").trim();
    const quoteFound = normalisedText.includes(quote);
    const digits = (value_num !== null ? String(value_num) : "").replace(/,/g, "");
    const valueInQuote =
      value_num === null || digits.length === 0 || quote.replace(/,/g, "").includes(digits);
    return {
      entity_type: f.entity_type,
      entity_id: f.entity_id ?? null,
      entity_name: f.entity_name ?? null,
      metric: f.metric,
      new_metric: f.new_metric,
      value_num,
      value_text,
      unit: f.unit ?? null,
      as_of: f.as_of ?? null,
      definition_note: f.definition_note ?? null,
      quote,
      suggested_confidence: f.suggested_confidence,
      quote_found: quoteFound,
      value_in_quote: valueInQuote,
    };
  });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many extractions from this address. Wait a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Check the source fields and try again." }, { status: 400 });
  }

  let text = body.text?.trim() ?? "";
  if (!text && body.url) {
    let target: URL;
    try {
      target = await assertSafeUrl(body.url);
    } catch (e) {
      const msg =
        e instanceof UnsafeUrlError
          ? e.message
          : "That URL can't be fetched. Paste the text instead.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      // no redirect following: a 3xx would move us to an unvalidated host
      const res = await fetch(target.toString(), {
        headers: { "User-Agent": "GCC-Compass/0.1 (research tool)" },
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timer);
      if (res.status < 200 || res.status >= 300) {
        return NextResponse.json(
          { error: "Couldn't read that URL from here. Paste the text instead." },
          { status: 400 },
        );
      }
      // cap the body: read only what we need, then abort
      const buf = new Uint8Array(MAX_FETCH_BYTES);
      let read = 0;
      const reader = res.body?.getReader();
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          const remaining = MAX_FETCH_BYTES - read;
          if (remaining <= 0) break;
          buf.set(value.subarray(0, remaining), read);
          read += Math.min(value.length, remaining);
          if (value.length > remaining) break;
        }
        void reader.cancel().catch(() => {});
      }
      text = htmlToText(new TextDecoder().decode(buf.subarray(0, read))).slice(0, 20_000);
    } catch {
      return NextResponse.json(
        { error: "Couldn't read that URL from here. Paste the text instead." },
        { status: 400 },
      );
    }
  }
  if (text.length < 40) {
    return NextResponse.json({ error: "Paste at least a few sentences of the source text." }, { status: 400 });
  }

  // The built-in sample has a pre-validated result, so "Add a source" keeps working
  // when the model is unavailable. Consulted only once the live path has failed.
  const cached = findCachedExtraction(text);
  /** Serve the pre-validated rows, labelled as cached, instead of failing. */
  const fallback = (entry: { result: z.infer<typeof Extracted> }) =>
    NextResponse.json({
      facts: shapeFacts(entry.result, text),
      warnings: entry.result.warnings,
      cached: true,
    });

  if (!llmConfigured()) {
    if (cached) return fallback(cached);
    return NextResponse.json({ aiOff: true });
  }

  let parsed: unknown;
  try {
    parsed = await chatJson(buildExtractSystem(body.meta, text), "Extract the facts now.", {
      maxTokens: 8192,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[extract] llm failure:", msg);
    if (cached) return fallback(cached);
    // an unavailable model is a 429 the caller can retry, not a 502 it can't
    const status = e instanceof LLMError && e.transient ? 429 : 502;
    return NextResponse.json(
      { error: msg },
      { status, ...(status === 429 ? { headers: { "Retry-After": "60" } } : {}) },
    );
  }
  // Drop rows the model left structurally incomplete (no metric or no quote):
  // a fact without either is not reviewable, so it never reaches the human.
  const loose = parsed as { facts?: unknown[]; warnings?: unknown } | null;
  if (loose && Array.isArray(loose.facts)) {
    loose.facts = loose.facts.filter(
      (f) =>
        f &&
        typeof f === "object" &&
        typeof (f as { metric?: unknown }).metric === "string" &&
        (f as { metric: string }).metric.length > 0 &&
        typeof (f as { quote?: unknown }).quote === "string" &&
        (f as { quote: string }).quote.trim().length > 0,
    );
  }

  const res = Extracted.safeParse(parsed);
  if (!res.success) {
    console.error(`[extract] schema issues: ${JSON.stringify(res.error.issues.slice(0, 6))}`);
    if (cached) return fallback(cached);
    return NextResponse.json({ error: "The model's reply didn't match the fact schema." }, { status: 502 });
  }

  return NextResponse.json({ facts: shapeFacts(res.data, text), warnings: res.data.warnings });
}
