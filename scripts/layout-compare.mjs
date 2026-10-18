/**
 * Side-by-side host chrome screenshots for Signal vs Slido reference notes.
 * Signal: live localhost. Slido: uses attached reference PNGs (admin session flaky in automation).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL || "demo@live-qa.local";
const PASS = process.env.DEMO_PASS || "signal-host-123";
const OUT = path.resolve("artifacts/layout-compare");
const ASSETS = path.resolve(
  "/Users/raphael/.cursor/projects/Users-raphael-Projects-live-qa/assets",
);

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();

try {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/host/, { timeout: 20000 });

  await page.screenshot({
    path: path.join(OUT, "01-signal-sessions.png"),
    fullPage: true,
  });

  const createBtn = page.locator(
    'button:has-text("Create session"), button:has-text("+ Create")',
  );
  if (await createBtn.first().isVisible()) {
    await createBtn.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, "02-signal-create-modal.png"),
      fullPage: true,
    });
    const cancel = page.locator('button:has-text("Cancel")');
    if (await cancel.count()) await cancel.first().click();
  }

  const sessionLink = page.locator('a[href^="/host/"]').first();
  await sessionLink.click();
  await page.waitForURL(/\/host\/[A-Z0-9]+/, { timeout: 15000 });

  await page.screenshot({
    path: path.join(OUT, "03-signal-event-shell.png"),
    fullPage: true,
  });

  const share = page.locator('button:has-text("Share")').first();
  await share.click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "04-signal-share-modal.png"),
    fullPage: true,
  });

  const code = page.url().split("/").pop();
  await page.goto(`${BASE}/wall/${code}`);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, "05-signal-wall.png"),
    fullPage: true,
  });

  const refs = [
    [
      "Screenshot_2026-10-17_at_9.08.48_PM-b2d30b88-b92b-47a3-a3b2-7f4ffe607cb6.png",
      "01-slido-sessions-create.png",
    ],
    [
      "Screenshot_2026-10-17_at_9.09.01_PM-3a5d29b7-3dcd-4281-b7db-2191ef85f4f1.png",
      "03-slido-event-shell.png",
    ],
    [
      "Screenshot_2026-10-17_at_9.09.09_PM-c429ebc5-ae84-4346-a543-db02a3dc6b91.png",
      "04-slido-share-modal.png",
    ],
  ];
  for (const [src, dest] of refs) {
    const from = path.join(ASSETS, src);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(OUT, dest));
  }

  const notes = `# Layout compare (Signal vs Slido)

Generated ${new Date().toISOString()}

| Surface | Signal | Slido ref | Structure |
|---|---|---|---|
| Sessions + create | 01-signal-sessions / 02-signal-create-modal | 01-slido-sessions-create | Fill after visual review |
| Event shell | 03-signal-event-shell | 03-slido-event-shell | Fill after visual review |
| Share modal | 04-signal-share-modal | 04-slido-share-modal | Fill after visual review |
| Present wall | 05-signal-wall | (live wall auth-gated) | Fill after visual review |

Session code used: ${code}
`;
  fs.writeFileSync(path.join(OUT, "NOTES.md"), notes);
  console.log("Wrote", OUT);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
