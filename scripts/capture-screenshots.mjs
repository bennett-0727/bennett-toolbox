import fs from "node:fs";
import path from "node:path";
import { _electron as electron } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIX = path.join(ROOT, "tests/fixtures");
const OUT = path.join(ROOT, "docs/screenshots");
const DEMO = "/tmp/bennett-demo";
const APP =
  process.env.ELECTRON_APP_PATH ||
  path.join(ROOT, "release/mac-arm64/Bennett Toolbox.app/Contents/MacOS/Bennett Toolbox");

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(DEMO, "search/sub"), { recursive: true });
fs.copyFileSync(path.join(FIX, "photo.png"), path.join(DEMO, "search/photo-final.png"));
fs.copyFileSync(path.join(FIX, "doc.txt"), path.join(DEMO, "doc.txt"));
fs.writeFileSync(path.join(DEMO, "search/report-2026.txt"), "report content\n");
fs.writeFileSync(path.join(DEMO, "search/sub/report-draft.md"), "nested report\n");

const thumbPng = `data:image/png;base64,${fs.readFileSync(path.join(FIX, "photo.png")).toString("base64")}`;
const thumbJpg = `data:image/jpeg;base64,${fs.readFileSync(path.join(FIX, "picture.jpg")).toString("base64")}`;

const app = await electron.launch({
  executablePath: APP,
  env: { ...process.env, MARKITDOWN_BIN: path.join(FIX, "markitdown.sh") },
});
const page = await app.firstWindow();
await page.waitForLoadState("domcontentloaded");

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
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "photo.png"));
await page.waitForSelector(".image-batch-card");
await page.locator(".batch-format-selector .format-btn", { hasText: "WebP" }).click();
await page.locator(".batch-convert-btn").click();
await page.waitForSelector(".batch-success");
await shot("04-image-converter.png");

await openModule("图片压缩", "图片批量压缩");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "big.jpg"));
await page.waitForSelector(".compress-card");
await page.locator('input[type="number"]').fill("0.1");
await clickButton(page.locator(".compress-control-body"), "批量压缩");
await page.waitForSelector(".compress-result-meta");
await shot("05-image-compressor.png");

await openModule("图片去水印");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "photo.png"));
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
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc.pdf"));
await page.waitForSelector(".pdf-file-name");
await page.locator(".pdf-format-switch button", { hasText: "JPG" }).click();
await clickButton(page.locator(".pdf-settings-card"), "转换全部页面");
await page.waitForSelector(".pdf-page-card", { timeout: 60000 });
await shot("07-pdf.png");

await openModule("视频转 GIF");
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "clip.webm"));
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

await app.close();
