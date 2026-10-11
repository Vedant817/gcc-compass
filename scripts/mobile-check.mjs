import { chromium } from "playwright";
const BASE = "https://gcc-compas-vedants-projects-8098650d.vercel.app";
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

await page.screenshot({ path: "C:/Users/vedan/AppData/Local/Temp/opencode/gcc/tmp1hbquj3s/shots/mobile-truth.png" });
await page.goto(`${BASE}/truth`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "C:/Users/vedan/AppData/Local/Temp/opencode/gcc/tmp1hbquj3s/shots/mobile-truth-top.png" });

console.log(problems.length ? `PROBLEMS: ${problems.join(" | ")}` : "no mobile problems");
await browser.close();
