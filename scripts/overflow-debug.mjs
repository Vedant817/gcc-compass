import { chromium } from "playwright";
const BASE = "https://gcc-compas-vedants-projects-8098650d.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const path of ["/truth", "/navigator", "/method"]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  const bad = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 1 || r.width > window.innerWidth + 1) {
        out.push(
          `${el.tagName}.${(el.className || "").toString().slice(0, 60)} w=${Math.round(r.width)} right=${Math.round(r.right)}`,
        );
      }
    });
    return out.slice(0, 8);
  });
  console.log(`== ${path}`);
  for (const b of bad) console.log("  ", b);
}
await browser.close();
