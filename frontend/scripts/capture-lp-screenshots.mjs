import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:5173";
const OUTPUT_DIR = path.resolve("public/lp");

const EMAIL = "625.somq2525@gmail.com";
const PASSWORD = "password123";

async function ensureDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function hideUi(page) {
  await page.addStyleTag({
    content: `
      [data-testid="app-header"],
      .appHeader,
      .appFooterTabs,
      .appFooterTabs__safeArea,
      nav[aria-label="mode tabs"] {
        display: none !important;
      }
      body {
        background: #f4f7fb !important;
      }
    `,
  });
}

async function captureLocator(locator, fileName, label) {
  console.log(`capture:start ${fileName} <- ${label}`);
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await locator.screenshot({
    path: path.join(OUTPUT_DIR, fileName),
  });
  console.log(`capture:done ${fileName}`);
}

async function captureElement(page, selector, fileName) {
  return captureLocator(page.locator(selector).first(), fileName, selector);
}

async function login(page) {
  console.log("login:start");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.locator("input").nth(0).fill(EMAIL);
  await page.locator("input[type='password']").first().fill(PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL(/\/log/, { timeout: 15000 });
  await page.locator(".logPage").first().waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(4000);
  console.log("login:done");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1.25,
});

try {
  await ensureDir();
  await login(page);

  console.log("page:log");
  await page.goto(`${BASE_URL}/log`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureLocator(
    page.locator(".logPage__card").filter({ has: page.locator(".logPage__cardTitle", { hasText: "サマリー" }) }).first(),
    "log-summary-pc.png",
    "summary-card",
  );
  await captureLocator(page.locator(".logAi").first(), "log-ai-recommendation-pc.png", "logAi");

  console.log("page:training");
  await page.goto(`${BASE_URL}/training`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureElement(page, ".trainingPage__grid", "training-player-pc.png");

  const measurementCard = page.locator(".trainingPage__measurementPresetItemBtn").filter({ hasText: "音域" }).first();
  if (await measurementCard.isVisible().catch(() => false)) {
    await measurementCard.click();
    await page.waitForTimeout(1000);
  }
  await captureElement(page, ".trainingPage__measurementPanel", "training-range-pc.png");

  console.log("page:insights");
  await page.goto(`${BASE_URL}/insights`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureElement(page, ".insightsPage", "insights-top-pc.png");

  console.log("page:insights-notes");
  await page.goto(`${BASE_URL}/insights/notes`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureElement(page, ".insightsPage", "insights-detail-pc.png");

  console.log("page:community");
  await page.goto(`${BASE_URL}/community`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureElement(page, ".communityPage__post.communityPage__listCard", "community-posts-pc.png");

  console.log("page:rankings");
  await page.goto(`${BASE_URL}/community/rankings`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureElement(page, ".communityRanking", "community-ranking-pc.png");

  console.log("page:ai-settings");
  await page.goto(`${BASE_URL}/settings/ai`, { waitUntil: "networkidle" });
  await hideUi(page);
  await captureElement(page, ".aiSettingsPage", "ai-settings-pc.png");
} finally {
  await browser.close();
}
