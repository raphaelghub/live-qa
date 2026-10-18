import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL || "demo@live-qa.local";
const PASS = process.env.DEMO_PASS || "signal-host-123";
const OUT = path.resolve("artifacts/demo");

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

const log = [];
function step(msg) {
  console.log(msg);
  log.push(msg);
}

async function ensureHostQa() {
  const chip = page.locator('button.signal-chip:has-text("Popular")');
  if (await chip.isVisible().catch(() => false)) return;
  const open = page.locator('[data-demo="open-qa"]');
  if (await open.isVisible().catch(() => false)) {
    await open.click();
    return;
  }
  await page.locator(".host-qa-card").click();
}

try {
  step("1. Host login");
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

  step("2. Create session");
  await page.click('[data-demo="create-session"]');
  await page.waitForSelector('[role="dialog"] input[name="title"]', {
    timeout: 15000,
  });
  await page.fill('input[name="title"]', "Gap close demo");
  await page.click('[data-demo="create-session-submit"]');
  await page.waitForURL(/\/host\/[A-Z0-9]+/, { timeout: 20000 });
  await ensureHostQa();
  const code = page.url().split("/").pop().toUpperCase();
  step(`Session code ${code}`);
  fs.writeFileSync(path.join(OUT, "session-code.txt"), code);

  step("3. Announcement + sort/filter");
  await page.fill(
    'input[placeholder="Post an announcement"]',
    "Welcome — ask anything",
  );
  await page.click('button:has-text("Announce")');
  await page.waitForSelector("text=Welcome — ask anything", { timeout: 10000 });
  await page.click('button.signal-chip:has-text("Recent")');
  await page.click('button.signal-chip:has-text("Popular")');

  step("4. Enable moderation");
  await page.click('button:has-text("Moderation off")');
  await page.waitForSelector('button:has-text("Moderation on")', {
    timeout: 10000,
  });

  step("5. Participant ask (pending)");
  await page.goto(`${BASE}/e/${code}`);
  await page.waitForSelector("text=Welcome — ask anything");
  await page.fill("textarea[name=body]", "How does archive restore work?");
  await page.click('button:has-text("Ask anonymously")');
  await page.waitForSelector("text=in review", { timeout: 15000 });

  step("6. Host approve");
  await page.goto(`${BASE}/host/${code}`);
  await ensureHostQa();
  await page.click('button.signal-chip:has-text("Pending")');
  await page.waitForSelector("text=How does archive restore work?", {
    timeout: 15000,
  });
  await page.click("article.signal-card");
  await page.click('button:has-text("Approve")');
  await page.click('button.signal-chip:has-text("All")');

  step("7. Second question + vote");
  await page.goto(`${BASE}/e/${code}`);
  await page.fill("textarea[name=body]", "Will the wall show a QR?");
  await page.click('button:has-text("Ask anonymously")');
  await page.goto(`${BASE}/host/${code}`);
  await ensureHostQa();
  await page.click('button.signal-chip:has-text("Pending")');
  await page
    .locator("article.signal-card")
    .filter({ hasText: "Will the wall show a QR?" })
    .click();
  await page.click('button:has-text("Approve")');
  await page.click('button.signal-chip:has-text("All")');
  await page.goto(`${BASE}/e/${code}`);
  await page
    .locator("article.signal-card")
    .filter({ hasText: "Will the wall show a QR?" })
    .locator("button.signal-vote")
    .click();

  step("8. Highlight + public reply");
  await page.goto(`${BASE}/host/${code}`);
  await ensureHostQa();
  await page
    .locator("article.signal-card")
    .filter({ hasText: "How does archive restore work?" })
    .click();
  await page.click('button:has-text("Highlight")');
  await page.fill(
    'input[placeholder="Public reply"]',
    "Yes — Archive then Restore.",
  );
  await page.click('button:has-text("Reply")');
  await page.waitForSelector("text=Yes — Archive then Restore.", {
    timeout: 10000,
  });

  step("9. Archive + restore + search");
  await page
    .locator("article.signal-card")
    .filter({ hasText: "How does archive restore work?" })
    .locator('button:has-text("Send to archive")')
    .click();
  await page.click('button.signal-chip:has-text("Archive")');
  await page.fill('input[placeholder="Search questions"]', "archive restore");
  await page.waitForSelector("text=How does archive restore work?", {
    timeout: 15000,
  });
  await page
    .locator("article.signal-card")
    .filter({ hasText: "How does archive restore work?" })
    .click();
  await page.click('button:has-text("Restore")');
  await page.fill('input[placeholder="Search questions"]', "");
  await page.click('button.signal-chip:has-text("All")');

  step("10. Share + QR");
  await page.click('[data-demo="share"]');
  await page.waitForSelector("img.signal-qr", { timeout: 10000 });

  step("11. Present wall");
  await page.goto(`${BASE}/wall/${code}`);
  await page.waitForSelector("text=Latest question", { timeout: 15000 });
  await page.waitForSelector("img.signal-qr");
  await page.waitForSelector(`text=#${code}`);

  step("12. Export CSV");
  await page.goto(`${BASE}/host/${code}`);
  await ensureHostQa();
  await page.click('[data-demo="share"]');
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("Export CSV")'),
  ]);
  const csvPath = path.join(OUT, "export.csv");
  await download.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, "utf8");
  if (!csv.includes("How does archive restore work?")) {
    throw new Error("CSV missing question body");
  }
  step("CSV ok");

  fs.writeFileSync(path.join(OUT, "steps.log"), log.join("\n"));
  step("DONE");
} catch (err) {
  console.error(err);
  fs.writeFileSync(
    path.join(OUT, "error.log"),
    String(err?.stack || err) + "\n" + log.join("\n"),
  );
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
  const videos = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith(".webm") && f.startsWith("page@"));
  if (videos[0]) {
    fs.copyFileSync(
      path.join(OUT, videos[0]),
      path.join(OUT, "full-usage.webm"),
    );
  }
  console.log(
    "video:",
    path.join(OUT, "full-usage.webm"),
    "code:",
    fs.existsSync(path.join(OUT, "session-code.txt"))
      ? fs.readFileSync(path.join(OUT, "session-code.txt"), "utf8")
      : "n/a",
  );
}
