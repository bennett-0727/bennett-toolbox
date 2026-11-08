import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { _electron as electron } from "playwright-core";
import { preparePluginRegistry } from "../tests/helpers/plugin-fixtures.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIX = path.join(ROOT, "tests/fixtures");
const OUT = path.join(ROOT, "docs/screenshots");
const DEMO = "/tmp/bennett-demo";
const APP =
  process.env.ELECTRON_APP_PATH ||
  path.join(ROOT, "release/mac-arm64/Bennett Toolbox.app/Contents/MacOS/Bennett Toolbox");

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(DEMO, "search/sub"), { recursive: true });
fs.copyFileSync(path.join(FIX, "images/photo.png"), path.join(DEMO, "search/photo-final.png"));
fs.copyFileSync(path.join(FIX, "documents/doc.txt"), path.join(DEMO, "doc.txt"));
fs.writeFileSync(path.join(DEMO, "search/report-2026.txt"), "report content\n");
fs.writeFileSync(path.join(DEMO, "search/sub/report-draft.md"), "nested report\n");
const demoDb = path.join(DEMO, "demo.db");
fs.rmSync(demoDb, { force: true });
const demoDatabase = new DatabaseSync(demoDb);
demoDatabase.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT)");
demoDatabase.exec("INSERT INTO users (name, role) VALUES ('Alice', 'admin'), ('Bob', 'developer'), ('Carol', 'designer')");
demoDatabase.close();

const thumbPng = `data:image/png;base64,${fs.readFileSync(path.join(FIX, "images/photo.png")).toString("base64")}`;
const thumbJpg = `data:image/jpeg;base64,${fs.readFileSync(path.join(FIX, "images/picture.jpg")).toString("base64")}`;

const registryDir = preparePluginRegistry();
const userData = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-screenshots-user-"));
const app = await electron.launch({
  executablePath: APP,
  args: [`--user-data-dir=${userData}`],
  env: {
    ...process.env,
    MARKITDOWN_BIN: path.join(FIX, "markitdown/markitdown.sh"),
    BENNETT_USER_DATA_DIR: userData,
    BENNETT_PLUGIN_REGISTRY_DIR: registryDir,
  },
});
const page = await app.firstWindow();
await page.waitForLoadState("domcontentloaded");
await page.evaluate(async () => {
  const ipc = window.require("electron").ipcRenderer;
  const refreshed = await ipc.invoke("plugins:refresh-registry");
  if (!refreshed?.ok) throw new Error(refreshed?.error || "refresh failed");
  const recommended = refreshed.snapshot.available
    .filter((plugin) => plugin.recommended)
    .sort((left, right) => (left.order ?? 1000) - (right.order ?? 1000));
  for (const plugin of recommended) {
    const result = await ipc.invoke("plugins:install", { id: plugin.id });
    if (!result?.ok) throw new Error(result?.error || `install failed: ${plugin.id}`);
  }
  const optional = [
    "bennett.timestamp-tools",
    "bennett.markdown-preview",
    "bennett.qr-tools",
    "bennett.sqlite-viewer",
  ];
  for (const id of optional) {
    const result = await ipc.invoke("plugins:install", { id });
    if (!result?.ok) throw new Error(result?.error || `install failed: ${id}`);
  }
});
await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 15);

async function setLanguage(label, value) {
  await page.locator(".workbench-nav").click();
  await page.waitForSelector(".settings-embedded");
  await page.locator(".language-option", { hasText: label }).click();
  await page.waitForFunction((next) => document.documentElement.lang === next, value);
}

async function setTheme(value) {
  await page.locator(".workbench-nav").click();
  await page.waitForSelector(".settings-embedded");
  await page.locator(".theme-option").nth(value === "glass-light" ? 1 : 0).click();
  await page.waitForFunction(
    (next) => document.documentElement.dataset.theme === next,
    value,
  );
  await page.waitForTimeout(300);
}

await page.waitForSelector(".workbench-nav");
await setLanguage("中文", "zh-CN");
await setTheme("glass-dark");
await page.waitForTimeout(250);

await app.evaluate(
  ({ ipcMain }, { searchDir, docPath, thumbPng, thumbJpg }) => {
    ipcMain.removeHandler("select-directory");
    ipcMain.handle("select-directory", async () => searchDir);
    ipcMain.removeHandler("select-markitdown-file");
    ipcMain.handle("select-markitdown-file", async () => ({
      path: docPath,
      name: "doc.txt",
      size: 17,
      extension: "TXT",
    }));
    ipcMain.removeHandler("get-desktop-sources");
    ipcMain.handle("get-desktop-sources", async () => [
      { id: "demo-screen", name: "主屏幕", thumbnail: thumbPng, appIcon: null },
      { id: "demo-window", name: "应用窗口", thumbnail: thumbJpg, appIcon: null },
    ]);
  },
  { searchDir: path.join(DEMO, "search"), docPath: path.join(DEMO, "doc.txt"), thumbPng, thumbJpg },
);

await page.route("**/api.mymemory.translated.net/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: "user profile" },
    }),
  }),
);

async function openModule(label, heading = label) {
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.waitForFunction(
    (h) => (document.querySelector("h1.module-title")?.textContent || "").includes(h),
    heading,
  );
}

async function shot(name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, name), animations: "disabled" });
  console.log("shot", name);
}

async function clickButton(scope, text) {
  await scope.locator("button", { hasText: text }).first().click();
}

await openModule("JSON 格式化");
await page.locator("textarea.json-input").fill(
  '{\n  "name": "张三",\n  "age": 25,\n  "tags": ["工具", "效率"],\n  "profile": {\n    "city": "杭州",\n    "active": true\n  }\n}',
);
await clickButton(page.locator(".json-formatter-header"), "格式化");
await page.waitForSelector(".json-key");
await shot("01-overview.png");
await shot("02-json-formatter.png");

await openModule("变量命名");
await page.locator(".translate-input").fill("用户信息");
await page.locator(".translate-btn").click();
await page.waitForSelector(".result-value");
await shot("03-naming.png");

await openModule("图片转换");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "images/photo.png"));
await page.waitForSelector(".image-batch-card");
await page.locator(".batch-format-selector .format-btn", { hasText: "WebP" }).click();
await page.locator(".batch-convert-btn").click();
await page.waitForSelector(".batch-success");
await shot("04-image-converter.png");

await openModule("图片压缩", "图片批量压缩");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "images/big.jpg"));
await page.waitForSelector(".compress-card");
await page.locator('input[type="number"]').fill("0.1");
await clickButton(page.locator(".compress-control-body"), "批量压缩");
await page.waitForSelector(".compress-result-meta");
await shot("05-image-compressor.png");

await openModule("图片去水印");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "images/photo.png"));
await page.waitForSelector(".watermark-mask-canvas");
await clickButton(page.locator(".tool-mode-switch"), "框选");
const mask = page.locator(".watermark-mask-canvas");
const maskBox = await mask.boundingBox();
await page.mouse.move(maskBox.x + maskBox.width * 0.28, maskBox.y + maskBox.height * 0.3);
await page.mouse.down();
await page.mouse.move(maskBox.x + maskBox.width * 0.68, maskBox.y + maskBox.height * 0.62, { steps: 8 });
await page.mouse.up();
await clickButton(page.locator(".watermark-actions"), "去除水印");
await page.waitForSelector(".watermark-result-preview img", { timeout: 60000 });
await shot("06-watermark.png");

await openModule("PDF 转图片");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "documents/doc.pdf"));
await page.waitForSelector(".pdf-file-name");
await page.locator(".pdf-format-switch button", { hasText: "JPG" }).click();
await clickButton(page.locator(".pdf-settings-card"), "转换全部页面");
await page.waitForSelector(".pdf-page-card", { timeout: 60000 });
await shot("07-pdf.png");

await openModule("视频转 GIF");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "video/clip.webm"));
await page.waitForSelector(".video-summary");
await clickButton(page.locator(".gif-settings-card"), "生成 GIF");
await page.waitForSelector(".gif-preview-image", { timeout: 60000 });
await shot("08-video-gif.png");

await openModule("文件搜索");
await page.locator(".path-input").fill(path.join(DEMO, "search"));
await page.locator(".search-input").fill("report");
await page.waitForFunction(() => document.querySelectorAll(".result-item").length === 2);
await shot("09-file-search.png");

await openModule("文档转 MD", "文档转 Markdown");
await clickButton(page.locator(".document-drop-zone"), "选择文件");
await page.waitForSelector(".document-summary");
await clickButton(page.locator(".document-summary"), "转换为 Markdown");
await page.waitForFunction(
  () => document.querySelector(".markdown-output")?.value?.includes("Converted"),
);
await shot("10-document-converter.png");

await openModule("截图悬浮");
await clickButton(page.locator(".screenshot-float-header .header-actions"), "刷新源");
await page.waitForSelector(".source-item");
await page.locator(".source-item").first().click();
await shot("11-screenshot.png");

await openModule("屏幕取色");
await page.evaluate(() => {
  window.EyeDropper = class {
    open() {
      return Promise.resolve({ sRGBHex: "#3366ff" });
    }
  };
});
await page.locator(".pick-btn-overlay").click();
await page.waitForFunction(
  () => document.querySelector(".color-value-large")?.textContent === "#3366FF",
);
await shot("12-color-picker.png");

await openModule("SQLite 查看器");
await page.locator('.btp-sqlite-app input[type="file"]').setInputFiles(demoDb);
await page.waitForSelector(".btp-sqlite-results", { timeout: 30000 });
await page.locator(".btp-sqlite-object-name").filter({ hasText: /^users$/ }).click();
await page.waitForSelector(".btp-sqlite-pager", { timeout: 20000 });
await shot("16-sqlite-viewer.png");

await openModule("Markdown / Mermaid");
await page.waitForSelector(".btp-md-diagram svg", { timeout: 30000 });
await shot("17-markdown-mermaid.png");

await openModule("二维码工具");
await page.waitForSelector(".btp-qr canvas", { timeout: 20000 });
await shot("18-qr-tools.png");

await openModule("时间与 Cron");
await page.locator(".btp-time-tabs button", { hasText: "Cron" }).click();
await page.waitForSelector(".btp-time-list code", { timeout: 20000 });
await shot("19-time-cron.png");

await page.locator(".workbench-nav").click();
await page.waitForSelector(".workbench-page");
await page.locator(".theme-option").nth(1).click();
await page.waitForFunction(() => document.documentElement.dataset.theme === "glass-light");
await page.waitForTimeout(350);
await page.evaluate(() => {
  document.querySelector(".workbench-settings-section")?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(250);
await shot("14-settings.png");
await page.evaluate(() => {
  for (const selector of [".canvas-content", ".main-content"]) {
    const element = document.querySelector(selector);
    if (element) element.scrollTop = 0;
  }
});
await page.waitForTimeout(250);
await shot("15-workbench.png");
await openModule("JSON 格式化");
await shot("13-overview-light.png");
await setTheme("glass-dark");

await app.close();
fs.rmSync(userData, { recursive: true, force: true });
