import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderInline } from "../lib/markdown";

/** Rendered once and reused, so the assertions read like the browser's output. */
const html = (s: string) => renderToStaticMarkup(createElement("div", null, renderInline(s)));

describe("renderInline", () => {
  it("renders a single id as a citation chip", () => {
    const out = html("Policy 2025 [pol_mh_2025] applies.");
    expect(out).toContain('[pol_mh_2025]</a>');
    expect(out).toContain("font-mono"); // the chip's styling, not plain text
  });

  it("renders a comma-separated id list as chips, never as literal text", () => {
    const out = html("Ranges [f001, f008] and mixed [f001, pol_tn_2024].");
    // every id becomes its own chip
    expect(out).toContain('[f001]</a>');
    expect(out).toContain('[f008]</a>');
    expect(out).toContain('[pol_tn_2024]</a>');
    // and the list form itself never reaches the page as text
    expect(out).not.toContain(">[f001, f008]<");
    expect(out).not.toContain(">[f001, pol_tn_2024]<");
  });

  it("chips sentence text around them, including bullets", () => {
    const out = html("* **Capital:** 20% up to ₹100 Cr [pol_mh_2025]");
    expect(out).toContain(">Capital:</strong>");
    expect(out).toContain("20% up to ₹100 Cr");
    expect(out).toContain('[pol_mh_2025]</a>');
  });

  it("leaves an unmatched bracket alone", () => {
    const out = html("a [nonsense] bracket stays");
    expect(out).toContain("[nonsense]");
    expect(out).not.toContain("font-mono");
  });
});
