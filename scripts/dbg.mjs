import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 400)));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE:", m.type(), m.text().slice(0, 400));
});
await page.goto("http://localhost:3100/truth", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const titles = await page.locator("section h3").allTextContents();
console.log("section titles:", titles);
const first = page.locator("section").first();
console.log("first section html (first 500):", (await first.innerHTML()).slice(0, 500));
console.log("recharts svg:", await page.locator(".recharts-surface").count());
console.log("empty state:", await page.locator("text=No facts for this metric yet").count());
await browser.close();
