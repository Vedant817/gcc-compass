import { chromium } from "playwright";
const BASE = process.env.BASE_URL;
if (!BASE) {
  console.error("Set BASE_URL, e.g. BASE_URL=http://localhost:3100 node scripts/shot-addsource.mjs");
  process.exit(1);
}
const SHOTS = process.env.SHOTS_DIR || "screenshots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (let attempt = 1; attempt <= 10; attempt++) {
  await page.goto(`${BASE}/add-source`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Load Telangana sample" }).click();
  await page.getByRole("button", { name: "Extract facts" }).click();
  try {
    await page.waitForSelector("text=Quote found verbatim", { timeout: 120000 });
    const rowsText = await page.locator("main").innerText();
    if (!/gcc_policy_status/.test(rowsText)) throw new Error("no TS fact");
    // approve the first row; keep any second row pending so the shot shows both
    await page.getByRole("button", { name: "Approve" }).first().click();
    await page.waitForSelector("text=Recently added", { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/05_add_source_export.png` });
    console.log(`PASS add-source screenshot on attempt ${attempt}`);
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.log(`attempt ${attempt}: ${e.message.split("\n")[0]}`);
    await page.waitForTimeout(15000);
  }
}
await browser.close();
process.exit(1);
