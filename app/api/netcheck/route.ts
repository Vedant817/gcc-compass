import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const out: Record<string, unknown> = {};
  for (const url of [
    "https://generativelanguage.googleapis.com/v1beta/openai/models",
    "https://example.com",
  ]) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      out[url] = res.status;
    } catch (e) {
      out[url] = `throw: ${(e as Error).message}`;
    }
  }
  return NextResponse.json(out);
}
