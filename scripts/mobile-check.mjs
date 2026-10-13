/**
 * Mobile layout check: no horizontal overflow at 390 px on every page.
 * Usage: BASE_URL=https://gcc-compas.vercel.app node scripts/mobile-check.mjs
 *        BASE_URL=http://localhost:3100 node scripts/mobile-check.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 120)}`));

for (const path of ["/truth", "/navigator", "/ask", "/add-source", "/method"]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log(`${path}: scrollWidth overflow = ${overflow}`);
  if (overflow) problems.push(`${path} overflows horizontally`);
}

// navigator flow at mobile width
await page.goto(`${BASE}/navigator`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Build my shortlist" }).click();
await page.waitForSelector("section:has-text('City ranking')", { timeout: 30000 });
const text = await page.locator("main").innerText();
console.log("mobile navigator ranking renders:", text.includes("77.2"));
if (!text.includes("77.2")) problems.push("mobile navigator ranking broken");

console.log(problems.length ? `PROBLEMS: ${problems.join(" | ")}` : "no mobile problems");
await browser.close();
process.exit(problems.length ? 1 : 0);
