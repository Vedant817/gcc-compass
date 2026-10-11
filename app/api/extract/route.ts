import { NextResponse } from "next/server";
import { z } from "zod";
import { Extracted } from "@/lib/types";
import { chatJson, llmConfigured } from "@/lib/llm";
import { buildExtractSystem } from "@/lib/prompts";

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

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Check the source fields and try again." }, { status: 400 });
  }

  let text = body.text?.trim() ?? "";
  if (!text && body.url) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(body.url, {
        headers: { "User-Agent": "GCC-Compass/0.1 (prototype)" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(String(res.status));
      text = htmlToText(await res.text()).slice(0, 20_000);
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
  if (!llmConfigured()) {
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
    return NextResponse.json(
      { error: msg.includes("rate-limited") ? msg : "Extraction failed. Try again." },
      { status: 502 },
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
    console.error(
      `[extract] schema issues: ${JSON.stringify(res.error.issues.slice(0, 6))}`,
    );
    return NextResponse.json({ error: "The model's reply didn't match the fact schema." }, { status: 502 });
  }

  const normalisedText = text.replace(/\s+/g, " ").trim();
  const facts = res.data.facts.map((f) => {
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

  return NextResponse.json({ facts, warnings: res.data.warnings });
}
