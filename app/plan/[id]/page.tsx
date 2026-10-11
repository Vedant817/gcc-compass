import Link from "next/link";
import { notFound } from "next/navigation";
import { registry } from "@/lib/registry";
import { rank, PRESET_WEIGHTS, type RankedCity } from "@/lib/scoring";
import { decodePlan } from "@/lib/plan";
import { EligibilityCards } from "@/components/navigator/EligibilityCards";
import { CostTable } from "@/components/navigator/CostTable";
import { ProviderList } from "@/components/navigator/ProviderList";
import { PlanActions, LeadForm } from "@/components/plan/PlanControls";
import { PlanResults } from "@/components/plan/PlanResults";
import { ConfidenceBadge, SiteLinkFlag } from "@/components/ui/badge";
import { Card } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function collectFactIds(ranked: RankedCity[]): string[] {
  const ids = new Set<string>();
  const inc = registry.numericFact("IN", "salary_increment_pct");
  if (inc) ids.add(inc.id);
  const blr = registry.numericFact("bengaluru", "swe_ctc_mid");
  if (blr) ids.add(blr.id);
  for (const r of ranked) {
    for (const f of [
      registry.numericFact(r.city, "office_rent_grade_a", "src_office_annual_2025"),
      registry.numericFact(r.city, "gcc_talent_share_pct"),
      registry.numericFact(r.city, "attrition_pct"),
      registry.numericFact(r.city, "swe_ctc_discount_vs_blr_pct"),
    ]) {
      if (f) ids.add(f.id);
    }
    for (const e of r.eligibility) ids.add(e.policyId);
  }
  return [...ids];
}

function sourceIdsForUsedFacts(factIds: string[]): Set<string> {
  const out = new Set<string>();
  for (const id of factIds) {
    const f = registry.fact(id);
    const p = registry.policy(id);
    const sid = f?.source_id ?? p?.source_id;
    if (sid) out.add(sid);
  }
  return out;
}

export default function PlanPage({ params }: { params: { id: string } }) {
  const plan = decodePlan(params.id);
  if (!plan) {
    console.error(
      `[plan] decode failed: id length ${params.id.length}, tail ${params.id.slice(-40)}, hasPlus=${params.id.includes("+")}, hasDollar=${params.id.includes("$")}`,
    );
    return (
      <>
        <h1>Plan not found</h1>
        <p className="text-sm text-muted mt-2">
          This link is broken or truncated. Build a shortlist in the{" "}
          <Link href="/navigator" className="text-slate underline">
            Setup Navigator
          </Link>{" "}
          and save it again.
        </p>
      </>
    );
  }

  const weights = plan.weights;
  const ranked = rank(registry, plan.inputs, weights);
  const rankedCities = ranked.filter((r) => r.score !== null);
  const unranked = ranked.filter((r) => r.score === null);
  const top3 = rankedCities.slice(0, 3);
  const factIds = collectFactIds(ranked);
  const usedSourceIds = sourceIdsForUsedFacts(factIds);
  const sources = registry.sources
    .filter((s) => usedSourceIds.has(s.id))
    .sort((a, b) => a.publisher.localeCompare(b.publisher));

  const created = new Date(plan.created_at);
  const createdLabel = Number.isNaN(created.getTime())
    ? plan.created_at
    : created.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="print-full flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1>Your GCC plan</h1>
          <p className="text-sm text-muted">
            Saved {createdLabel}. Computed from the registry on this page; nothing is re-ranked when
            the link is opened later.
          </p>
        </div>
        <PlanActions planId={params.id} />
      </div>

      <Card title="Company inputs" className="print-section">
        <dl className="grid md:grid-cols-3 gap-x-6 gap-y-1 text-[13px]">
          {[
            ["HQ", plan.inputs.hq_country],
            ["Company size", `${plan.inputs.company_size.toLocaleString("en-IN")} employees`],
            ["Global 2000", plan.inputs.global2000 ? "Yes" : "No"],
            ["Seats year 1 → year 3", `${plan.inputs.seats_y1} → ${plan.inputs.seats_y3}`],
            ["Functions", plan.inputs.functions.join(", ")],
            ["Priority", plan.priority],
            ["Open to Tier-2", plan.inputs.open_to_tier2 ? "Yes" : "No"],
            [
              "Planned investment",
              plan.inputs.investment_inr_cr === null
                ? "Not stated"
                : `₹${plan.inputs.investment_inr_cr} Cr`,
            ],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted inline">{k}: </dt>
              <dd className="inline">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Ranked cities" className="print-section">
        {rankedCities.length === 0 ? (
          <p className="text-sm text-muted">No city had enough data to rank for this profile.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="text-left border-b border-rule px-2 py-1 text-muted font-medium">Rank</th>
                <th className="text-left border-b border-rule px-2 py-1 text-muted font-medium">City</th>
                <th className="text-right border-b border-rule px-2 py-1 text-muted font-medium">Score</th>
                <th className="text-right border-b border-rule px-2 py-1 text-muted font-medium">Talent</th>
                <th className="text-right border-b border-rule px-2 py-1 text-muted font-medium">Rent ₹/sq ft</th>
                <th className="text-right border-b border-rule px-2 py-1 text-muted font-medium">Est. CTC ₹L</th>
                <th className="text-right border-b border-rule px-2 py-1 text-muted font-medium">Attrition</th>
              </tr>
            </thead>
            <tbody>
              {rankedCities.map((r, i) => (
                <tr key={r.city} className="even:bg-paper">
                  <td className="border-b border-rule px-2 py-1">{i + 1}</td>
                  <td className="border-b border-rule px-2 py-1 font-medium">{registry.cityName(r.city)}</td>
                  <td className="border-b border-rule px-2 py-1 text-right tabular-nums">
                    {r.score?.toFixed(1)}
                  </td>
                  <td className="border-b border-rule px-2 py-1 text-right tabular-nums">
                    {r.raw.talent === null ? "—" : `${r.raw.talent}%`}
                  </td>
                  <td className="border-b border-rule px-2 py-1 text-right tabular-nums">
                    {r.raw.rent === null ? "—" : r.raw.rent}
                  </td>
                  <td className="border-b border-rule px-2 py-1 text-right tabular-nums">
                    {r.raw.salary === null ? "—" : r.raw.salary.toFixed(1)}
                  </td>
                  <td className="border-b border-rule px-2 py-1 text-right tabular-nums">
                    {r.raw.attrition === null ? "—" : `${r.raw.attrition}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <p className="text-xs text-muted mt-2">
          Weights on this plan: talent {Math.round(plan.weights.talent)} · rent{" "}
          {Math.round(plan.weights.rent)} · salary {Math.round(plan.weights.salary)} · attrition{" "}
          {Math.round(plan.weights.attrition)} · incentives {Math.round(plan.weights.incentives)}{" "}
          (normalised to 100%). Cities under the 60% coverage line:{" "}
          {unranked.length === 0
            ? "none"
            : unranked.map((r) => registry.cityName(r.city)).join(", ")}
          .
        </p>
      </Card>

      <div className="print-section">
        <PlanResults inputs={plan.inputs} weights={plan.weights} />
      </div>

      <Card title="Sources" className="print-section">
        <ol className="text-[13px] space-y-2 list-decimal ml-4">
          {sources.map((s) => {
            const used = factIds.filter((id) => {
              const f = registry.fact(id);
              const p = registry.policy(id);
              return (f?.source_id ?? p?.source_id) === s.id;
            });
            return (
              <li key={s.id}>
                <span className="font-medium">{s.publisher}</span> — {s.title}
                {s.published_date ? `, ${s.published_date}` : ""}.{" "}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-slate underline">
                    {s.url}
                  </a>
                ) : (
                  <span className="text-muted">no link recorded</span>
                )}{" "}
                <span className="inline-flex flex-wrap items-center gap-1 align-middle">
                  <ConfidenceBadge level={s.reliability} />
                  {s.url_precision === "domain_only" && <SiteLinkFlag />}
                </span>
                <span className="block text-xs text-muted">
                  Backs: {used.join(", ")}
                  {s.notes ? ` — ${s.notes}` : ""}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted mt-3">
          {registry.facts.length} facts and {registry.policies.length} policies in the registry seed as
          of 11 Oct 2026. AI-approved facts added after this plan was saved are not included.
        </p>
      </Card>

      <div className="no-print">
        <LeadForm planId={params.id} />
      </div>
    </div>
  );
}

