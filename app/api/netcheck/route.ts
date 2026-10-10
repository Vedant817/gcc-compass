import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const out: Record<string, unknown> = {};
  out.env = {
    key: Boolean(process.env.LLM_API_KEY),
    keyLen: process.env.LLM_API_KEY?.length ?? 0,
    keyHead: process.env.LLM_API_KEY?.slice(0, 6) ?? "",
    base: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL,
    fallback: process.env.LLM_FALLBACK_MODELS,
  };
  try {
    const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 20,
      }),
      cache: "no-store",
    });
    const text = await res.text();
    out.status = res.status;
    out.body = text.slice(0, 300);
  } catch (e) {
    out.error = (e as Error).message;
    out.stack = ((e as Error).stack ?? "").split("\n").slice(0, 4).join(" | ");
  }
  return NextResponse.json(out);
}
