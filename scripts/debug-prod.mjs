import { chromium } from "playwright";
const BASE = "https://gcc-compass.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => console.log("CONSOLE:", m.type(), m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 300)));
const t0 = Date.now();
await page.goto(`${BASE}/truth`, { waitUntil: "domcontentloaded", timeout: 60000 });
console.log("domcontentloaded in", Date.now() - t0, "ms");
console.log("title:", await page.title());
console.log("h1s:", await page.locator("h1").allTextContents());
console.log("select count:", await page.locator("#metric-preset").count());
try {
  await page.waitForSelector("h1 >> text=Truth table", { timeout: 10000 });
  console.log("h1 selector ok");
} catch {
  console.log("h1 selector MISSING");
}
await browser.close();
