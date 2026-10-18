import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL || "demo@live-qa.local";
const PASS = process.env.DEMO_PASS || "signal-host-123";
const OUT = path.resolve("artifacts/session-list-verify");

fs.mkdirSync(OUT, { recursive: true });

const beforeSrc =
  "/Users/raphael/.cursor/projects/Users-raphael-Projects-live-qa/assets/Screenshot_2026-10-17_at_9.53.49_PM-6dc79338-3de9-4e60-a5dc-a06fd15853b4.png";
if (fs.existsSync(beforeSrc)) {
  fs.copyFileSync(beforeSrc, path.join(OUT, "00-before-my-sessions.png"));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];
function step(msg) {
  console.log(msg);
  log.push(msg);
}

async function login() {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/host/, { timeout: 20000 });
  await page.waitForFunction(
    () => document.body.dataset.hostList === "ready",
    null,
    { timeout: 20000 },
  );
}

async function createSession(title) {
  await page.goto(`${BASE}/host`);
  await page.waitForFunction(() => document.body.dataset.hostList === "ready");
  await page.click('[data-demo="create-session"]');
  await page.waitForSelector('[role="dialog"] input[name="title"]');
  await page.fill('input[name="title"]', title);
  await page.click('[data-demo="create-session-submit"]');
  await page.waitForURL(/\/host\/[A-Z0-9]+/, { timeout: 20000 });
  return page.url().split("/").pop().toUpperCase();
}

async function openRowMenu(code) {
  const row = page.locator(`[data-session-code="${code}"]`);
  await row.locator('[data-demo="session-menu"]').click();
  return row;
}

try {
  step("1. Host login");
  await login();
  await page.screenshot({
    path: path.join(OUT, "01-after-tabs-all.png"),
    fullPage: true,
  });

  step("2. Create session to end + delete");
  const code = await createSession("List lifecycle");
  step(`Created ${code}`);
  await page.goto(`${BASE}/host`);
  await page.waitForFunction(() => document.body.dataset.hostList === "ready");
  await page.waitForSelector(`[data-session-code="${code}"][data-session-status="active"]`);

  step("3. Duplicate");
  await openRowMenu(code);
  await page.click('[data-demo="session-duplicate"]');
  await page.waitForSelector("text=List lifecycle (copy)", { timeout: 15000 });
  await page.screenshot({
    path: path.join(OUT, "02-after-duplicate.png"),
    fullPage: true,
  });

  step("4. End session");
  await openRowMenu(code);
  await page.click('[data-demo="session-end"]');
  await page.waitForSelector(
    `[data-session-code="${code}"][data-session-status="past"]`,
    { timeout: 15000 },
  );

  step("5. Past tab");
  await page.click('[data-demo="session-tab-past"]');
  await page.waitForSelector(`[data-session-code="${code}"]`);
  const pastActive = await page
    .locator('[data-session-status="active"]')
    .count();
  if (pastActive !== 0) throw new Error("Past tab still shows active rows");
  await page.screenshot({
    path: path.join(OUT, "03-after-past-tab.png"),
    fullPage: true,
  });

  step("6. Active tab hides ended row");
  await page.click('[data-demo="session-tab-active"]');
  await page.waitForSelector("text=List lifecycle (copy)");
  if (await page.locator(`[data-session-code="${code}"]`).count()) {
    throw new Error("Ended session still on Active tab");
  }
  await page.screenshot({
    path: path.join(OUT, "04-after-active-tab.png"),
    fullPage: true,
  });

  step("7. Delete ended session");
  await page.click('[data-demo="session-tab-all"]');
  await openRowMenu(code);
  await page.click('[data-demo="session-delete"]');
  await page.click('[data-demo="confirm-delete"]');
  await page.waitForSelector(`[data-session-code="${code}"]`, {
    state: "detached",
    timeout: 15000,
  });
  await page.screenshot({
    path: path.join(OUT, "05-after-delete.png"),
    fullPage: true,
  });

  step("8. Join/wall 404 for deleted code");
  const join = await page.goto(`${BASE}/e/${code}`);
  const joinStatus = join?.status() ?? 0;
  await page.screenshot({
    path: path.join(OUT, "06-join-deleted.png"),
    fullPage: true,
  });
  const wall = await page.goto(`${BASE}/wall/${code}`);
  const wallStatus = wall?.status() ?? 0;
  await page.screenshot({
    path: path.join(OUT, "07-wall-deleted.png"),
    fullPage: true,
  });
  if (joinStatus !== 404) throw new Error(`Join status ${joinStatus}, expected 404`);
  if (wallStatus !== 404) throw new Error(`Wall status ${wallStatus}, expected 404`);
  const joinText = await page.goto(`${BASE}/e/${code}`).then(async () => page.locator("body").innerText());
  if (!/not found|deleted|isn't available|not an open session/i.test(joinText)) {
    step(`Join 404 copy was: ${joinText.slice(0, 200)}`);
  }

  step("9. Delete leftover copy");
  await page.goto(`${BASE}/host`);
  await page.waitForFunction(() => document.body.dataset.hostList === "ready");
  const copy = page.locator(".host-session-row", {
    hasText: "List lifecycle (copy)",
  });
  if (await copy.count()) {
    const copyCode = await copy.getAttribute("data-session-code");
    await copy.locator('[data-demo="session-menu"]').click();
    await page.click('[data-demo="session-delete"]');
    await page.click('[data-demo="confirm-delete"]');
    if (copyCode) {
      await page.waitForSelector(`[data-session-code="${copyCode}"]`, {
        state: "detached",
        timeout: 15000,
      });
    }
  }

  fs.writeFileSync(path.join(OUT, "log.txt"), log.join("\n"));
  step("OK");
} catch (err) {
  await page.screenshot({
    path: path.join(OUT, "FAIL.png"),
    fullPage: true,
  });
  fs.writeFileSync(
    path.join(OUT, "log.txt"),
    `${log.join("\n")}\nFAIL ${err.stack || err}`,
  );
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
