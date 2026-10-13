import { NextResponse } from "next/server";
import { z } from "zod";
import { AskResponse, FactSchema, NavigatorInputsSchema, SourceSchema } from "@/lib/types";
import { RegistryView } from "@/lib/registry";
import { chatJson, llmConfigured, LLMError } from "@/lib/llm";
import { buildAskSystem } from "@/lib/prompts";
import { checkGrounded } from "@/lib/grounding";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  question: z.string().min(2).max(500),
  plan: NavigatorInputsSchema.optional(),
  overlay: z
    .object({
      sources: z.array(SourceSchema).max(20).optional(),
      facts: z.array(FactSchema).max(50).optional(),
    })
    .optional(),
});

/** Per-IP in-memory rate limit (best effort on serverless: per warm instance). */
const MAX_TRACKED_IPS = 500;
const RETRY_AFTER_S = "60";

/**
 * Generous on purpose. This limit exists to stop one client looping the route, not
 * to ration a reader: at 20/min a two-minute demo could still trip it on a shared
 * office IP, and on a free-tier model key the scarce resource is upstream anyway.
 * The model client already cools off a model after a 429, which is the limit that
 * actually protects the quota.
 */
const ASKS_PER_MINUTE = 60;
const hits = new Map<string, { count: number; reset: number }>();

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
  return rec.count > ASKS_PER_MINUTE;
}

/** Rate-limited by the model service: a 429 the browser can act on. */
function busyResponse() {
  return NextResponse.json(
    { error: "Busy, try again in a minute." },
    { status: 429, headers: { "Retry-After": RETRY_AFTER_S } },
  );
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return busyResponse();

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Question missing or too long." }, { status: 400 });
  }

  if (!llmConfigured()) {
    return NextResponse.json({ aiOff: true });
  }

  const reg = RegistryView.load({
    sources: body.overlay?.sources ?? [],
    facts: body.overlay?.facts ?? [],
  });
  const planJson = body.plan ? JSON.stringify(body.plan) : "";
  const system = buildAskSystem(reg, planJson, body.plan);

  for (let attempt = 0; attempt < 2; attempt++) {
    let parsed: unknown;
    try {
      parsed = await chatJson(system, body.question);
    } catch (e) {
      // 429/503/timeout on the model service is a "come back in a minute", not a bug
      if (e instanceof LLMError && e.transient) return busyResponse();
      return NextResponse.json(
        {
          error:
            (e as Error).message === "AI is off in this deployment (no LLM_API_KEY)."
              ? (e as Error).message
              : "The model didn't answer. Try again.",
        },
        { status: 502 },
      );
    }
    const res = AskResponse.safeParse(parsed);
    if (!res.success) continue;

    const check = checkGrounded(res.data.answer, res.data.cited_ids, reg, planJson);
    if (!check.ok) {
      console.error(
        `[ask] ungrounded number(s) in answer: ${check.ungrounded.join(", ")} (question: ${body.question})`,
      );
      if (attempt === 0) {
        // retry once, telling the model exactly what was ungrounded
        try {
          const retry = await chatJson(
            system,
            `${body.question}\n\nYour previous answer contained an ungrounded number: ${check.ungrounded.join(
              ", ",
            )}. Remove it or cite the fact it comes from.`,
          );
          const retryRes = AskResponse.safeParse(retry);
          if (retryRes.success) {
            const recheck = checkGrounded(retryRes.data.answer, retryRes.data.cited_ids, reg, planJson);
            if (recheck.ok) {
              return NextResponse.json(withCitations(reg, retryRes.data, recheck.resolvedIds));
            }
          }
        } catch {
          /* fall through to the grounded-answer failure */
        }
      }
      return NextResponse.json({
        answer:
          "Couldn't produce a grounded answer. Every number in an answer has to come from a cited fact, so this one was dropped. Try rephrasing.",
        cited_ids: [],
        not_in_registry: false,
        missing: null,
        guardrail: true,
      });
    }

    return NextResponse.json(withCitations(reg, res.data, check.resolvedIds));
  }

  return NextResponse.json({
    answer: "Couldn't produce a grounded answer. Try rephrasing.",
    cited_ids: [],
    not_in_registry: false,
    missing: null,
    guardrail: true,
  });
}

function withCitations(
  reg: RegistryView,
  res: z.infer<typeof AskResponse>,
  resolvedIds: string[],
) {
  const citations = resolvedIds.map((id) => {
    const f = reg.fact(id);
    const p = reg.policy(id);
    const source = reg.source(f?.source_id ?? p?.source_id);
    return {
      id,
      kind: f ? "fact" : "policy",
      title: f ? `${f.metric} for ${f.entity_id}` : p?.name ?? id,
      publisher: source?.publisher ?? null,
      url: source?.url ?? null,
      url_precision: source?.url_precision ?? null,
      as_of: f?.as_of ?? (p?.year ? String(p.year) : null),
      value: f?.value_text ?? (f?.value_num !== null && f?.value_num !== undefined ? String(f.value_num) : null),
      confidence: f?.confidence ?? null,
      unverified: f?.unverified ?? false,
      sourced: Boolean(f || p),
    };
  });
  return { ...res, cited_ids: resolvedIds, citations };
}
