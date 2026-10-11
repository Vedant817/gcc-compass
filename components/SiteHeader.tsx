"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { seedRegistry, latestAsOf } from "@/lib/registry";
import { readOverlayFacts } from "@/lib/overlay";
const NAV = [
  { href: "/truth", label: "Truth table" },
  { href: "/navigator", label: "Navigator" },
  { href: "/ask", label: "Ask" },
  { href: "/add-source", label: "Add a source" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [overlayCount, setOverlayCount] = useState(0);

  useEffect(() => {
    const refresh = () => setOverlayCount(readOverlayFacts().length);
    refresh();
    window.addEventListener("gcc-compass:overlay", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("gcc-compass:overlay", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const facts = seedRegistry.facts.length + overlayCount;
  const updated = latestAsOf();
  const onPlan = pathname?.startsWith("/plan");

  return (
    <header className="no-print bg-ink text-white">
      <div className="max-w-page mx-auto px-6 h-14 flex items-center gap-4 lg:gap-8">
        <Link href="/truth" className="serif text-white text-lg leading-none whitespace-nowrap">
          GCC Compass
        </Link>
        <nav className="flex items-center gap-4 lg:gap-6 text-sm overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pb-1 border-b-2 whitespace-nowrap ${
                  active ? "border-sand text-white" : "border-transparent text-white/80 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          {onPlan && (
            <span className="pb-1 border-b-2 border-sand text-white whitespace-nowrap" aria-current="page">
              Plan
            </span>
          )}
        </nav>
        <div className="ml-auto hidden sm:block text-xs text-white/70 tabular-nums whitespace-nowrap">
          Registry: {facts} facts · {seedRegistry.sources.length} sources · updated {updated}
        </div>
      </div>
      <div className="sm:hidden px-6 pb-2 text-xs text-white/70 tabular-nums">
        Registry: {facts} facts · {seedRegistry.sources.length} sources · updated {updated}
      </div>
    </header>
  );
}
