import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "screenshots");
const EXECUTIVE_HTML = path.join(ROOT, "reports", "executive-summary", "index.html");
const ALLURE_DIR = path.join(ROOT, "reports", "allure-report");
const ALLURE_PORT = 9340;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".csv": "text/csv; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fileUrl(filePath: string): string {
  return `file:///${filePath.replace(/\\/g, "/")}`;
}

function startStaticServer(dir: string, port: number): Promise<http.Server> {
  const root = path.resolve(dir);

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    const filePath = path.normalize(path.join(root, relative));

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end();
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function captureScreenshots(): Promise<void> {
  if (!fs.existsSync(EXECUTIVE_HTML)) {
    throw new Error("Executive report missing. Run: npm run test:report:all");
  }
  if (!fs.existsSync(path.join(ALLURE_DIR, "index.html"))) {
    throw new Error("Allure report missing. Run: npm run test:report:all");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(fileUrl(EXECUTIVE_HTML), { waitUntil: "networkidle" });

  await page.locator(".card").first().screenshot({
    path: path.join(OUT_DIR, "executive-report.png"),
  });

  await page.locator(".card").filter({ hasText: "Test Stability Intelligence" }).screenshot({
    path: path.join(OUT_DIR, "flaky-intelligence.png"),
  });

  const allureServer = await startStaticServer(ALLURE_DIR, ALLURE_PORT);
  try {
    await page.goto(`http://127.0.0.1:${ALLURE_PORT}/`, { waitUntil: "networkidle" });
    await sleep(2500);

    const overviewTab = page.getByRole("link", { name: /overview/i }).first();
    if (await overviewTab.isVisible().catch(() => false)) {
      await overviewTab.click();
      await sleep(1500);
    }

    await page.locator(".widget").first().waitFor({ state: "visible", timeout: 15_000 });
    await sleep(1000);

    await page.screenshot({
      path: path.join(OUT_DIR, "allure-report.png"),
      fullPage: false,
    });
  } finally {
    allureServer.close();
  }

  await browser.close();

  for (const name of ["executive-report.png", "allure-report.png", "flaky-intelligence.png"]) {
    const file = path.join(OUT_DIR, name);
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
      throw new Error(`Screenshot not created: ${name}`);
    }
    console.log(`Created: docs/screenshots/${name}`);
  }
}

captureScreenshots().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
