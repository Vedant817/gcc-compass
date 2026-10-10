import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  planId: z.string().max(200).optional(),
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
  // localStorage). No email is sent.
  console.log(
    `[lead] ${new Date().toISOString()} plan=${body.planId ?? "-"} name=${body.name} email=${body.email} note="${body.note.replace(/\s+/g, " ").slice(0, 120)}"`,
  );
  return NextResponse.json({ ok: true });
}
