const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const { existsSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { test } = require("node:test");
const { chromium } = require("playwright");

const root = resolve(__dirname, "..");
const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;
const artifacts = join(root, "artifacts");

mkdirSync(artifacts, { recursive: true });

test("mobile storefront supports product, cart, checkout, and admin login", async () => {
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    await waitForServer();
    const products = await fetch(`${baseUrl}/api/products`).then((response) => response.json());
    assert.ok(products.products.length >= 12);

    browser = await chromium.launch({
      headless: true,
      executablePath: getBrowserExecutablePath(),
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    page.setDefaultTimeout(8000);

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator(".hero").waitFor();
    assert.ok((await page.locator(".product-card").count()) >= 4);
    await page.screenshot({ path: join(artifacts, "home-mobile.png"), fullPage: true });

    await page.goto(`${baseUrl}/product/axis-shield-black`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "장바구니" }).click();
    await assertText(page.locator("#cart-count"), "1");

    await page.goto(`${baseUrl}/checkout`, { waitUntil: "networkidle" });
    await page.locator('input[name="name"]').fill("Kim Noir");
    await page.locator('input[name="phone"]').fill("01012345678");
    await page.locator('input[name="email"]').fill("buyer@example.com");
    await page.locator('input[name="postalCode"]').fill("06000");
    await page.locator('input[name="address1"]').fill("서울시 강남구 선글라스길 1");
    await page.locator('input[name="address2"]').fill("3층");
    await page.getByRole("button", { name: "Toss 결제하기" }).click();
    await page.waitForURL(/\/success/);
    await page.getByText("주문이 완료되었습니다").waitFor();
    await page.screenshot({ path: join(artifacts, "success-mobile.png"), fullPage: true });

    await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
    await page.locator('input[name="password"]').fill("noir-admin");
    await page.getByRole("button", { name: "로그인" }).click();
    await page.getByText(/상품 \d+개/).waitFor();
    await page.locator('[data-tab="orders"]').click();
    await page.locator(".admin-order").first().waitFor();
    await page.screenshot({ path: join(artifacts, "admin-mobile.png"), fullPage: true });

    assert.deepEqual(pageErrors, []);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill("SIGKILL");
  }
});

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(`${baseUrl}/api/products`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 120));
    }
  }
  throw new Error("Local server did not start in time");
}

async function assertText(locator, expected) {
  const text = await locator.textContent();
  assert.equal(text.trim(), expected);
}

function getBrowserExecutablePath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}
