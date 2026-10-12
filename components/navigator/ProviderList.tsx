"use client";

import type { RegistryView } from "@/lib/registry";
import type { NavigatorInputs, Provider } from "@/lib/types";
import { Card } from "@/components/ui/table";
import { OurServiceBadge, SiteLinkFlag } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

const CATEGORY_LABELS: Record<string, string> = {
  setup_bot: "GCC setup / build-operate-transfer",
  eor: "Employer of record",
  recruiting: "Recruiting",
  legal_tax: "Legal and tax",
  real_estate: "Real estate",
  advisory: "Advisory",
};

export function ProviderList({
  reg,
  inputs,
}: {
  reg: RegistryView;
  inputs: NavigatorInputs;
}) {
  const reasons: { category: Provider["category"]; why: string }[] = [
    { category: "setup_bot", why: "Every first-time centre needs one." },
    { category: "legal_tax", why: "Entity, compliance and tax setup." },
    { category: "real_estate", why: "Leasing in the shortlisted city." },
  ];
  if (inputs.functions.includes("eng"))
    reasons.push({ category: "recruiting", why: "Engineering hiring was selected." });
  if (inputs.seats_y1 < 25)
    reasons.push({
      category: "eor",
      why: `At ${inputs.seats_y1} seats in year 1 you're below the point where your own entity's economics make sense; an EOR bridges that.`,
    });

  return (
    <Card
      title="Who to call"
      aside={<span className="text-xs text-muted">No ratings, no rankings — categories and names</span>}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {reasons.map(({ category, why }) => {
          const providers = reg
            .providersByCategory(category)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <section key={category}>
              <h4 className="text-[15px] font-medium">{CATEGORY_LABELS[category]}</h4>
              <p className="text-xs text-muted mb-2">{why}</p>
              <ul className="text-sm space-y-2">
                {providers.map((p) => {
                  const src = reg.source(p.source_id);
                  return (
                    <li key={p.id} className="border-b border-rule pb-2 last:border-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {p.is_flexiple && <OurServiceBadge />}
                        {p.cities.length > 0 && (
                          <span className="text-xs text-muted">
                            {p.cities.map((c) => reg.cityName(c)).join(", ")}
                          </span>
                        )}
                      </span>
                      <span className="block text-[13px] text-muted">{p.notes}</span>
                      {src && (
                        <span className="flex flex-wrap items-center gap-2 mt-1">
                          <LinkButton href={src.url} variant="ghost" className="px-0 py-0 text-xs">
                            {src.publisher}
                          </LinkButton>
                          {src.url_precision === "domain_only" && <SiteLinkFlag />}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
