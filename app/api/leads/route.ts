import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  // the plan id is the URL-encoded plan payload, so it can be a few hundred chars
  planId: z.string().max(600).optional(),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  note: z.string().max(2_000).optional().default(""),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Check the name, email and consent box." }, { status: 400 });
  }
  // Prototype: the lead is logged server-side (and kept in the browser's
  // localStorage). No email is sent. Name and a masked email are logged for
  // follow-up; the free-text note is not persisted in logs.
  const masked = body.email.replace(/^(.).*(@.*)$/, "$1***$2");
  console.log(
    `[lead] ${new Date().toISOString()} plan=${(body.planId ?? "-").slice(0, 24)} name=${body.name} email=${masked} note=${body.note ? `(${body.note.length} chars, not logged)` : "none"}`,
  );
  return NextResponse.json({ ok: true });
}
