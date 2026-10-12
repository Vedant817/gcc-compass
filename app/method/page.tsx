import Link from "next/link";
import { Disclosure, Card } from "@/components/ui/table";
import { registry } from "@/lib/registry";
import { PRESET_WEIGHTS } from "@/lib/scoring";
import { COST_ASSUMPTIONS, COST_EXCLUDES } from "@/lib/cost";

export const metadata = {
  title: "Method · GCC Compass",
};

export default function MethodPage() {
  const c = registry.counts;
  return (
    <>
      <h1>Method</h1>
      <p className="text-sm text-muted mb-5 max-w-2xl">
        How the numbers on this site are handled, how the score is built, and where AI is allowed
        near it.
      </p>

      <div className="flex flex-col gap-4 max-w-3xl">
        <Card title="What a fact is">
          <p className="text-sm">
            A fact is a value plus its source, date, definition and confidence. Two publishers
            reporting the same metric are two rows, shown side by side; the registry never averages,
            merges or picks a winner. Ranges keep their published text (“1,800-1,900”); the number
            stored is the midpoint, used for charting only. The seed holds {c.facts} facts and{" "}
            {c.sources} sources, updated {c.updated}.
          </p>
        </Card>

        <Card title="Confidence">
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="text-left border-b border-rule px-2 py-1 text-muted font-medium">Level</th>
                <th className="text-left border-b border-rule px-2 py-1 text-muted font-medium">Means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-rule px-2 py-1">High</td>
                <td className="border-b border-rule px-2 py-1">Official policy or primary report.</td>
              </tr>
              <tr>
                <td className="border-b border-rule px-2 py-1">Medium</td>
                <td className="border-b border-rule px-2 py-1">Reputable news or secondary source.</td>
              </tr>
              <tr>
                <td className="border-b border-rule px-2 py-1">Low</td>
                <td className="border-b border-rule px-2 py-1">
                  Single vendor source or hedged wording. Facts that could not be confirmed carry an
                  [UNVERIFIED] badge and stay Low.
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2">
            A “site-level link” flag means the research recorded the publisher&apos;s site, not the
            exact page. It opens the site rather than a guessed URL.
          </p>
        </Card>

        <Card title="The city score">
          <p className="text-sm mb-2">
            Five components — talent share, Grade A rent, estimated mid-level SWE CTC, attrition and
            best incentive eligibility — are min-max normalised across the candidate cities that have
            the value, then weighted:
          </p>
          <p className="font-mono text-[13px] bg-paper border border-rule rounded px-2 py-1 mb-2">
            score = 100 × Σ(w × x) ÷ Σ w over components with data · rank if coverage ≥ 0.60
          </p>
          <p className="text-sm">
            Missing components stay missing; a city without them is listed as “Not enough data to
            rank” rather than guessed. Weights are a product judgment, not data, and the sliders let
            you change them:
          </p>
          <ul className="text-[13px] mt-2 space-y-1">
            {Object.entries(PRESET_WEIGHTS).map(([k, w]) => (
              <li key={k}>
                <span className="font-medium capitalize">{k}</span>: talent {w.talent} · rent{" "}
                {w.rent} · salary {w.salary} · attrition {w.attrition} · incentives{" "}
                {w.incentives}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="The 3-year cost estimate">
          <ul className="text-[13px] space-y-1">
            {COST_ASSUMPTIONS.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.id}</span> {a.text}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-2">{COST_EXCLUDES}</p>
        </Card>

        <Card title="Where AI is used, and how it's constrained">
          <ul className="text-sm space-y-2">
            <li>
              <span className="font-medium">Ask the registry.</span> The model sees the whole
              registry (facts and policies as compact JSON) and the system prompt forbids outside
              knowledge. The server then checks that every number in the answer appears in a cited
              fact or policy; if not, the answer is retried once and then dropped. Unanswerable
              questions get a “this isn&apos;t in the registry yet” banner, not a guess.
            </li>
            <li>
              <span className="font-medium">“Why they differ” notes.</span> Same grounding check,
              written only from definition, date and source-type fields.
            </li>
            <li>
              <span className="font-medium">Extraction.</span> The model proposes facts with an
              exact quote from the pasted text. A row whose quote isn&apos;t found verbatim cannot be
              approved. Nothing enters the registry without your Approve click; approved facts are
              stamped <span className="font-mono text-[11px]">extracted_by=ai, verified_by_human=true</span>.
            </li>
          </ul>
        </Card>

        <Card title="Neutrality">
          <p className="text-sm">
          Flexiple is listed as a provider with an “Our service” tag, alphabetically alongside the
          alternatives, and takes no part in the score. The registry&apos;s facts about Flexiple (the
          Managed Teams fee) are one row among {c.facts}, cited like any other.
          </p>
        </Card>

        <Disclosure summary="Reproduce the numbers">
          <p className="text-sm">
            The scoring, eligibility and cost logic is a port of{" "}
            <span className="font-mono text-[12px]">pack/scripts/reference_scoring.py</span>, and the
            unit tests reproduce{" "}
            <span className="font-mono text-[12px]">data/seed/expected_demo_output.json</span> (Pune 77.2,
            Hyderabad 57.2, Bengaluru 31.8 on Lowest cost; Pune 3-year ≈ ₹44.69 Cr). Run{" "}
            <span className="font-mono text-[12px]">npm test</span> and{" "}
            <span className="font-mono text-[12px]">python3 pack/scripts/validate_seed.py</span>.
          </p>
        </Disclosure>

        <p className="text-sm">
          <Link href="/truth" className="text-slate underline">
            Back to the truth table
          </Link>
          .
        </p>
      </div>
    </>
  );
}
