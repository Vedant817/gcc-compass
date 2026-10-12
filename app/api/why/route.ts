import { NextResponse } from "next/server";
import { z } from "zod";
import { registry } from "@/lib/registry";
import { chatJson, llmConfigured } from "@/lib/llm";
import { buildWhySystem } from "@/lib/prompts";
import { checkGrounded } from "@/lib/grounding";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  factIds: z.array(z.string()).optional(),
  metric: z.string().optional(),
  entityIds: z.array(z.string()).optional(),
});

const NoteSchema = z.object({
  note: z.string().max(400),
  cited_ids: z.array(z.string()),
});

/** Note cache, bounded so a long-lived instance can't grow without limit. */
const MAX_CACHED_NOTES = 200;
const cache = new Map<string, { note: string; cited_ids: string[] }>();

function cacheSet(key: string, value: { note: string; cited_ids: string[] }): void {
  if (cache.size >= MAX_CACHED_NOTES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

function keyOf(ids: string[]): string {
  return [...ids].sort().join(",");
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  let facts = body.factIds
    ? body.factIds.map((id) => registry.fact(id)).filter((f): f is NonNullable<typeof f> => Boolean(f))
    : body.metric
      ? registry.factsByMetric(body.metric).filter((f) => !body.entityIds || body.entityIds.includes(f.entity_id))
      : [];

  if (facts.length < 2) {
    return NextResponse.json({ note: "", cited_ids: [] });
  }

  // only numeric-bearing or qualitative facts with a definition make a useful note
  facts = facts.filter((f) => f.value_num !== null || f.value_text);
  if (facts.length < 2) {
    return NextResponse.json({ note: "", cited_ids: [] });
  }

  if (!llmConfigured()) {
    return NextResponse.json({ aiOff: true, note: "", cited_ids: [] });
  }

  const key = keyOf(facts.map((f) => f.id));
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached);

  const system = buildWhySystem(registry, facts);

  for (let attempt = 0; attempt < 2; attempt++) {
    let parsed: unknown;
    try {
      parsed = await chatJson(
        system,
        attempt === 0
          ? "Write the note now."
          : "Your previous note contained a number that is not in the facts above. Remove it or cite the fact it comes from.",
      );
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[why] llm failure:", msg);
      return NextResponse.json(
        { error: msg.includes("rate-limited") ? msg : "Couldn't write the note.", rateLimited: msg.includes("rate-limited") },
        { status: 502 },
      );
    }
    const res = NoteSchema.safeParse(parsed);
    if (!res.success) continue;
    const check = checkGrounded(res.data.note, res.data.cited_ids, registry);
    if (!check.ok) {
      console.error("[why] ungrounded numbers:", check.ungrounded.join(", "));
      continue;
    }
    const out = { note: res.data.note, cited_ids: check.resolvedIds };
    cacheSet(key, out);
    return NextResponse.json(out);
  }
  return NextResponse.json({ error: "Couldn't write the note." }, { status: 502 });
}


