import { NextResponse } from "next/server";
import { registry } from "@/lib/registry";

export const runtime = "nodejs";

/** The full registry as JSON, for debugging and for the README's curl example. */
export async function GET() {
  return NextResponse.json({
    sources: registry.sources,
    facts: registry.facts,
    cities: registry.cities,
    states: registry.states,
    policies: registry.policies,
    providers: registry.providers,
  });
}
