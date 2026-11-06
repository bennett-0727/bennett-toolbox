import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { _electron as electron } from "playwright-core";
import JSZip from "jszip";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIX = path.join(ROOT, "tests/fixtures");
const SEARCH_DIR = path.join(FIX, "search");
const MD_BIN = path.join(FIX, "markitdown.sh");
const DOWNLOAD_DIR = "/tmp/bennett-e2e/downloads";

let app;
let page;

const waitForText = (selector, text, timeout = 20000) =>
  page.waitForFunction(
    ([sel, txt]) =>
      [...document.querySelectorAll(sel)].some((el) => (el.textContent || "").includes(txt)),
    [selector, text],
    { timeout },
  );

async function openModule(label, heading = label) {
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.waitForFunction(
    (h) => (document.querySelector("h1.module-title")?.textContent || "").includes(h),
    heading,
  );
}

async function uploadFiles(...files) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(files.map((file) => path.join(FIX, file)));
}

async function clickButton(scope, text) {
  await scope.locator("button", { hasText: text }).first().click();
}

async function downloadFrom(locator, timeout = 20000) {
  const waiter = app.evaluate(
    () =>
      new Promise((resolve) => {
        globalThis.__downloadWaiters.push(resolve);
      }),
  );
  await locator.click();
  const result = await Promise.race([
    waiter,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("下载事件超时")), timeout),
    ),
  ]);
  if (result.state !== "completed") {
    throw new Error(`下载未完成: ${result.filename} (${result.state})`);
  }
  return result.filename;
}

const readClipboardText = () => app.evaluate(({ clipboard }) => clipboard.readText());

const downloadPath = (name) => path.join(DOWNLOAD_DIR, name);
const downloadBytes = (name) => fs.readFileSync(downloadPath(name));

function assertPng(name) {
  const bytes = downloadBytes(name);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${name} 不是 PNG`);
}

function assertJpeg(name) {
  const bytes = downloadBytes(name);
  assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff", `${name} 不是 JPEG`);
}

function assertGif(name) {
  const bytes = downloadBytes(name);
  assert.equal(bytes.subarray(0, 4).toString(), "GIF8", `${name} 不是 GIF`);
}

function assertWebp(name) {
  const bytes = downloadBytes(name);
  assert.equal(bytes.subarray(0, 4).toString(), "RIFF", `${name} 不是 RIFF`);
  assert.equal(bytes.subarray(8, 12).toString(), "WEBP", `${name} 不是 WebP`);
}

async function zipEntries(name) {
  const zip = await JSZip.loadAsync(downloadBytes(name));
  return Object.keys(zip.files).filter((entry) => !zip.files[entry].dir);
}

before(async () => {
  app = await electron.launch({
    ...(process.env.ELECTRON_APP_PATH
      ? { executablePath: process.env.ELECTRON_APP_PATH }
      : { args: ["."] }),
    env: { ...process.env, MARKITDOWN_BIN: MD_BIN },
  });
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");

  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  await app.evaluate(({ session }, dir) => {
    globalThis.__downloadWaiters = [];
    session.defaultSession.on("will-download", (event, item) => {
      const filename = item.getFilename();
      item.setSavePath(`${dir}/${filename}`);
      item.once("done", (doneEvent, state) => {
        const waiters = globalThis.__downloadWaiters.splice(0);
        waiters.forEach((resolve) => resolve({ filename, state }));
      });
    });
  }, DOWNLOAD_DIR);

  await app.evaluate(
    ({ ipcMain }, { searchDir, docPath }) => {
      ipcMain.removeHandler("select-directory");
      ipcMain.handle("select-directory", async () => searchDir);
      ipcMain.removeHandler("select-markitdown-file");
      ipcMain.handle("select-markitdown-file", async () => ({
        path: docPath,
        name: "doc.txt",
        size: 17,
        extension: "TXT",
      }));
    },
    { searchDir: SEARCH_DIR, docPath: path.join(FIX, "doc.txt") },
  );
});

after(async () => {
  await app?.close();
});

test("基础环境与 Electron 能力", async () => {
  assert.match(await page.title(), /Bennett Toolbox/);
  assert.equal(await page.locator(".nav-item").count(), 11);

  const hasElectron = await page.evaluate(() => {
    const { ipcRenderer, shell } = window.require("electron");
    return Boolean(ipcRenderer && shell);
  });
  assert.ok(hasElectron);

  const permission = await page.evaluate(() =>
    window.require("electron").ipcRenderer.invoke("check-screen-permission"),
  );
  assert.ok(["granted", "denied", "restricted", "not-determined", "unknown"].includes(permission));
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
});

test("侧边栏拖拽排序并持久化", async () => {
  const initial = await page.locator(".nav-item .nav-label").allTextContents();
  const items = page.locator(".nav-item-wrapper");
  await items.nth(0).dragTo(items.nth(2));
  await page.waitForFunction(
    (first) => document.querySelector(".nav-item .nav-label")?.textContent !== first,
    initial[0],
  );
  const reordered = await page.locator(".nav-item .nav-label").allTextContents();
  assert.deepEqual(reordered.slice(0, 3), [initial[1], initial[2], initial[0]]);

  await page.reload();
  await page.waitForSelector(".nav-item");
  assert.deepEqual(await page.locator(".nav-item .nav-label").allTextContents(), reordered);
});

test("JSON 格式化：格式化、压缩、复制、清空、错误提示", async () => {
  await openModule("JSON 格式化");
  const input = page.locator("textarea.json-input");
  const source = '{"name":"张三","age":25,"tags":["a","b"]}';

  await input.fill(source);
  await clickButton(page.locator(".json-formatter-header"), "格式化");
  await page.waitForSelector(".json-key");
  const keys = await page.locator(".json-key").allTextContents();
  assert.ok(keys.includes('"name"'));
  assert.ok(keys.includes('"tags"'));

  await clickButton(page.locator(".json-formatter-header"), "压缩");
  assert.equal(await input.inputValue(), JSON.stringify(JSON.parse(source)));

  await clickButton(page.locator(".json-formatter-header"), "复制结果");
  assert.equal(await readClipboardText(), JSON.stringify(JSON.parse(source), null, 2));

  await clickButton(page.locator(".json-formatter-header"), "清空");
  assert.equal(await input.inputValue(), "");

  await input.fill("{ invalid json }");
  await waitForText(".error-message", "JSON 语法错误");
});

test("变量命名：中译英、英译中、失败提示", async () => {
  const routeHandler = (route) => {
    const url = decodeURIComponent(route.request().url());
    const toEnglish = url.includes("langpair=zh|en");
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        responseStatus: 200,
        responseData: { translatedText: toEnglish ? "user profile" : "用户信息" },
      }),
    });
  };
  await page.route("**/api.mymemory.translated.net/**", routeHandler);

  await openModule("变量命名");
  const input = page.locator(".translate-input");

  await input.fill("用户信息");
  await page.locator(".translate-btn").click();
  await page.waitForSelector(".result-value");
  const results = await page.locator(".result-value").allTextContents();
  for (const expected of [
    "userProfile",
    "UserProfile",
    "user_profile",
    "USER_PROFILE",
    "user-profile",
    "userprofile",
  ]) {
    assert.ok(results.includes(expected), `缺少命名结果 ${expected}`);
  }

  await page.getByRole("button", { name: "英 -> 中" }).click();
  await input.fill("user profile");
  await page.locator(".translate-btn").click();
  await waitForText(".translation-text", "用户信息");

  await page.unroute("**/api.mymemory.translated.net/**", routeHandler);
  await page.route("**/api.mymemory.translated.net/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ responseStatus: 403, responseData: null }),
    }),
  );
  await input.fill("测试失败");
  await page.locator(".translate-btn").click();
  await waitForText(".error-box", "在线翻译失败");
  await page.unroute("**/api.mymemory.translated.net/**");
});

test("图片转换：PNG/HEIC 转 WebP、SVG 代码复制与下载", async () => {
  await openModule("图片转换");

  await uploadFiles("photo.png");
  await page.waitForSelector(".image-batch-card");
  await page.locator(".batch-format-selector .format-btn", { hasText: "WebP" }).click();
  await page.locator(".batch-convert-btn").click();
  await waitForText(".batch-success", "张已转换");
  assert.ok((await page.locator(".image-batch-card .format-badge.success").count()) >= 1);

  const singleZip = await downloadFrom(
    page.locator(".batch-actions button", { hasText: "下载全部 ZIP" }),
  );
  assert.match(singleZip, /\.zip$/i);

  await clickButton(page.locator(".image-converter-header"), "清空");
  await uploadFiles("photo.heic");
  await page.waitForSelector(".image-batch-card");
  await page.locator(".batch-convert-btn").click();
  await waitForText(".batch-success", "张已转换");

  await clickButton(page.locator(".image-converter-header"), "清空");
  await uploadFiles("icon.svg");
  await page.waitForSelector(".svg-code-section");
  assert.match(await page.locator(".svg-code-content").textContent(), /<svg/);
  await clickButton(page.locator(".svg-code-actions"), "复制代码");
  assert.match(await readClipboardText(), /<svg/);
  const svgFile = await downloadFrom(
    page.locator(".svg-code-actions button", { hasText: "下载 SVG" }),
  );
  assert.match(svgFile, /\.svg$/i);
});

test("图片压缩：按目标大小批量压缩、切换格式、ZIP", async () => {
  await openModule("图片压缩", "图片批量压缩");
  await uploadFiles("big.jpg");
  await page.waitForSelector(".compress-card");

  await page.locator('input[type="number"]').fill("0.1");
  await page.locator(".compress-format-buttons .format-btn", { hasText: "WEBP" }).click();
  await clickButton(page.locator(".compress-control-body"), "批量压缩");
  await page.waitForSelector(".compress-result-meta");
  await waitForText(".compress-result-meta", "减少");
  assert.ok((await page.locator(".compress-success").count()) >= 1);

  const zipFile = await downloadFrom(
    page.locator(".compress-actions button", { hasText: "下载全部 ZIP" }),
  );
  assert.match(zipFile, /\.zip$/i);
});

test("图片去水印：框选遮罩并处理", async () => {
  await openModule("图片去水印");
  await uploadFiles("photo.png");
  await page.waitForSelector(".watermark-mask-canvas");

  await clickButton(page.locator(".tool-mode-switch"), "框选");
  const mask = page.locator(".watermark-mask-canvas");
  const box = await mask.boundingBox();
  assert.ok(box && box.width > 10 && box.height > 10);
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(
    () => [...document.querySelectorAll(".watermark-image-info strong")].some(
      (el) => el.textContent !== "0 px" && el.textContent.includes("px"),
    ),
  );

  await clickButton(page.locator(".watermark-actions"), "去除水印");
  await page.waitForSelector(".watermark-result-preview img", { timeout: 60000 });
  assert.ok(await page.locator(".watermark-download-btn").isEnabled());

  await clickButton(page.locator(".watermark-actions"), "清除遮罩");
  await page.waitForFunction(
    () => [...document.querySelectorAll(".watermark-image-info strong")].some(
      (el) => el.textContent === "0 px",
    ),
  );
});

test("PDF 转图片：JPG 输出、页面预览、ZIP", async () => {
  await openModule("PDF 转图片");
  await uploadFiles("doc.pdf");
  await page.waitForSelector(".pdf-file-name");

  await page.locator(".pdf-format-switch button", { hasText: "JPG" }).click();
  await clickButton(page.locator(".pdf-settings-card"), "转换全部页面");
  await page.waitForSelector(".pdf-page-card", { timeout: 60000 });
  assert.equal(await page.locator(".pdf-page-card").count(), 1);
  await waitForText(".pdf-page-meta", "第 1 页");

  const zipFile = await downloadFrom(
    page.locator(".pdf-result-actions button", { hasText: "下载全部 ZIP" }),
  );
  assert.match(zipFile, /\.zip$/i);
});

test("视频转 GIF：生成并下载", async () => {
  await openModule("视频转 GIF");
  await uploadFiles("clip.webm");
  await page.waitForSelector(".video-summary");
  await waitForText(".video-summary", "2");

  await clickButton(page.locator(".gif-settings-card"), "生成 GIF");
  await page.waitForSelector(".gif-preview-image", { timeout: 60000 });
  const width = await page
    .locator(".gif-preview-image")
    .evaluate((img) => img.naturalWidth);
  assert.ok(width > 0);

  const gifFile = await downloadFrom(
    page.locator(".gif-result-footer button", { hasText: "下载 GIF" }),
  );
  assert.match(gifFile, /\.gif$/i);
});

test("文件搜索：目录选择、搜索、清空", async () => {
  await openModule("文件搜索");
  await page.locator(".path-selector button").click();
  assert.equal(await page.locator(".path-input").inputValue(), SEARCH_DIR);

  await page.locator(".search-input").fill("report");
  await page.waitForFunction(
    () => document.querySelectorAll(".result-item").length === 2,
    null,
    { timeout: 20000 },
  );
  const names = await page.locator(".result-item .file-name").allTextContents();
  assert.deepEqual(new Set(names), new Set(["report-2026.txt", "report-draft.md"]));

  await page.locator(".results-header .size-cell").click();
  await page.waitForFunction(
    () => document.querySelector(".result-item .file-name")?.textContent === "report-draft.md",
  );
  await page.locator(".results-header .size-cell").click();
  await page.waitForFunction(
    () => document.querySelector(".result-item .file-name")?.textContent === "report-2026.txt",
  );

  await clickButton(page.locator(".file-search-header"), "清空");
  await page.waitForSelector(".empty-state");
});

test("文档转 Markdown：转换、复制、保存、失败提示", async () => {
  await openModule("文档转 MD", "文档转 Markdown");
  await clickButton(page.locator(".document-drop-zone"), "选择文件");
  await page.waitForSelector(".document-summary");

  await clickButton(page.locator(".document-summary"), "转换为 Markdown");
  await page.waitForFunction(
    () => document.querySelector(".markdown-output")?.value?.includes("Converted"),
    null,
    { timeout: 30000 },
  );
  await waitForText(".command-badge", "MARKITDOWN_BIN");

  await clickButton(page.locator(".document-converter-header"), "复制");
  assert.match(await readClipboardText(), /# Converted/);

  const mdFile = await downloadFrom(
    page.locator(".document-converter-header button", { hasText: "保存 .md" }),
  );
  assert.match(mdFile, /\.md$/i);

  await app.evaluate(({ ipcMain }, failPath) => {
    ipcMain.removeHandler("select-markitdown-file");
    ipcMain.handle("select-markitdown-file", async () => ({
      path: failPath,
      name: "fail.txt",
      size: 10,
      extension: "TXT",
    }));
  }, path.join(FIX, "fail.txt"));

  await clickButton(page.locator(".document-converter-header"), "清空");
  await clickButton(page.locator(".document-drop-zone"), "选择文件");
  await page.waitForSelector(".document-summary");
  await clickButton(page.locator(".document-summary"), "转换为 Markdown");
  await waitForText(".error-box", "boom", 30000);
});

test("截图悬浮：整屏截图、裁剪、悬浮窗、复制、删除", async () => {
  await openModule("截图悬浮");
  await clickButton(page.locator(".screenshot-float-header .header-actions"), "刷新源");
  await page.waitForSelector(".source-item", { timeout: 30000 });
  await page.locator(".source-item").first().click();

  await clickButton(page.locator(".screenshot-float-header .header-actions"), "截取整屏");
  await page.waitForSelector(".crop-overlay", { timeout: 30000 });
  const preview = page.locator(".crop-preview-wrapper");
  const box = await preview.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 6 });
  await page.mouse.up();
  await page.waitForSelector(".screenshot-card", { timeout: 30000 });

  const card = page.locator(".screenshot-card").first();
  const floatPromise = app.waitForEvent("window");
  await card.locator('button[title="创建悬浮窗"]').click();
  const floatWindow = await floatPromise;
  await floatWindow.waitForLoadState("domcontentloaded");
  assert.match(floatWindow.url(), /^data:text\/html/);
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 2);
  await floatWindow.locator("#pinBtn").click();
  const pinned = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().startsWith("data:text/html"),
    );
    return win?.isAlwaysOnTop();
  });
  assert.equal(pinned, false);
  const closed = app.evaluate(
    ({ BrowserWindow }) =>
      new Promise((resolve) => {
        const win = BrowserWindow.getAllWindows().find((w) =>
          w.webContents.getURL().startsWith("data:text/html"),
        );
        if (!win) return resolve(true);
        win.once("closed", () => resolve(true));
      }),
  );
  await floatWindow.locator("#closeBtn").click();
  await closed;

  await card.locator('button[title="复制到剪贴板"]').click();
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readImage().isEmpty()), false);

  const pngFile = await downloadFrom(card.locator('button[title="下载"]'));
  assert.match(pngFile, /\.png$/i);

  await card.locator('button[title="删除"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll(".screenshot-card").length === 0,
  );
});

test("截图悬浮：系统框选截图回传", async () => {
  await page.reload();
  await page.waitForSelector(".nav-item");
  await openModule("截图悬浮");
  const selectionPromise = app.waitForEvent("window", { timeout: 45000 });
  await clickButton(page.locator(".screenshot-float-header .header-actions"), "框选截图");
  const selectionPage = await selectionPromise;
  await selectionPage.waitForLoadState("domcontentloaded");
  await selectionPage.mouse.move(120, 120);
  await selectionPage.mouse.down();
  await selectionPage.mouse.move(420, 320, { steps: 8 });
  await selectionPage.mouse.up();

  await page.waitForSelector(".screenshot-card", { timeout: 30000 });
  assert.equal(await page.locator(".screenshot-card").count(), 1);
});

test("屏幕取色：取色、格式转换、历史、复制、清空", async () => {
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
  const formats = await page.locator(".format-value").allTextContents();
  assert.ok(formats.some((value) => value.startsWith("rgb(51, 102, 255")));
  assert.ok(formats.some((value) => value.startsWith("hsl(")));
  await waitForText(".history-item", "#3366FF");

  await page.locator(".format-item .copy-btn-icon").first().click();
  assert.equal((await readClipboardText()).toUpperCase(), "#3366FF");

  await clickButton(page.locator(".history-panel"), "清空");
  await page.waitForSelector(".empty-history");
});

test("JSON 折叠节点、无效状态与空状态", async () => {
  await openModule("JSON 格式化");
  const input = page.locator("textarea.json-input");
  await input.fill('{"a":{"b":1},"c":[1,2]}');
  await clickButton(page.locator(".json-formatter-header"), "格式化");

  const expandable = page.locator(".json-line.expandable").first();
  await expandable.click();
  assert.match(await expandable.getAttribute("class"), /collapsed/);
  await expandable.click();
  assert.doesNotMatch(await expandable.getAttribute("class"), /collapsed/);

  await clickButton(page.locator(".json-formatter-header"), "清空");
  assert.equal(
    await page.locator(".json-formatter-header button", { hasText: "复制结果" }).isDisabled(),
    true,
  );
  assert.equal(await page.locator(".json-viewer-empty").count(), 1);
});

test("变量命名：复制、回车提交与清空", async () => {
  const handler = (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ responseStatus: 200, responseData: { translatedText: "user profile" } }),
    });
  await page.route("**/api.mymemory.translated.net/**", handler);
  await openModule("变量命名");
  const input = page.locator(".translate-input");
  await input.fill("用户信息");
  await input.press("Enter");
  await page.waitForSelector(".result-value");

  const card = page.locator(".result-card").first();
  const value = await card.locator(".result-value").textContent();
  await card.click();
  assert.equal(await readClipboardText(), value);
  assert.match(await card.getAttribute("class"), /copied/);

  await clickButton(page.locator(".translate-naming-header"), "清空");
  assert.equal(await input.inputValue(), "");
  assert.equal(await page.locator(".empty-state").count(), 1);
  await page.unroute("**/api.mymemory.translated.net/**");
});

test("图片转换：非法文件、JPG 输出、多文件与单张下载", async () => {
  await openModule("图片转换");
  await uploadFiles("doc.txt");
  await waitForText(".error-box", "请选择支持的图片文件");

  await clickButton(page.locator(".image-converter-header"), "清空");
  await uploadFiles("photo.png", "picture.jpg");
  await page.waitForFunction(() => document.querySelectorAll(".image-batch-card").length === 2);
  await page.locator(".batch-format-selector .format-btn", { hasText: "JPG" }).click();
  await page.locator(".batch-convert-btn").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".image-batch-card .format-badge.success").length === 2,
    null,
    { timeout: 30000 },
  );

  const single = await downloadFrom(
    page.locator(".image-batch-card").first().locator("button", { hasText: "下载" }),
  );
  assert.match(single, /\.jpg$/i);
  assertJpeg(single);

  const zip = await downloadFrom(
    page.locator(".batch-actions button", { hasText: "下载全部 ZIP" }),
  );
  const entries = await zipEntries(zip);
  assert.equal(entries.length, 2);
  assert.ok(entries.every((entry) => entry.endsWith(".jpg")));
});

test("图片压缩：非法文件、JPG 输出与单张下载", async () => {
  await openModule("图片压缩", "图片批量压缩");
  await uploadFiles("doc.txt");
  await waitForText(".compress-error-box", "请选择支持的图片文件");

  await clickButton(page.locator(".image-compressor-header"), "清空");
  await uploadFiles("big.jpg");
  await page.waitForSelector(".compress-card");
  await page.locator(".compress-format-buttons .format-btn", { hasText: "JPG" }).click();
  await clickButton(page.locator(".compress-control-body"), "批量压缩");
  await page.waitForSelector(".compress-result-meta", { timeout: 60000 });

  const single = await downloadFrom(
    page.locator(".compress-card").first().locator("button", { hasText: "下载" }),
  );
  assert.match(single, /\.jpg$/i);
  assertJpeg(single);
});

test("图片去水印：画笔模式与下载", async () => {
  await openModule("图片去水印");
  await uploadFiles("photo.png");
  await page.waitForSelector(".watermark-mask-canvas");
  await clickButton(page.locator(".tool-mode-switch"), "画笔");

  const mask = page.locator(".watermark-mask-canvas");
  const box = await mask.boundingBox();
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.42);
  await page.mouse.down();
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(
      box.x + box.width * (0.42 + step * 0.02),
      box.y + box.height * (0.42 + step * 0.01),
    );
  }
  await page.mouse.up();
  await clickButton(page.locator(".watermark-actions"), "去除水印");
  await page.waitForSelector(".watermark-result-preview img", { timeout: 60000 });

  const image = await downloadFrom(page.locator(".watermark-download-btn"));
  assert.match(image, /\.png$/i);
  assertPng(image);
});

test("PDF：非法文件、多页 PNG、单页下载与 ZIP 内容", async () => {
  await openModule("PDF 转图片");
  await uploadFiles("doc.txt");
  await waitForText(".error-box", "请选择 PDF 文件");

  await clickButton(page.locator(".pdf-to-images-header"), "清空");
  await uploadFiles("multi.pdf");
  await page.waitForSelector(".pdf-file-name");
  await page.locator(".pdf-format-switch button", { hasText: "PNG" }).click();
  await clickButton(page.locator(".pdf-settings-card"), "转换全部页面");
  await page.waitForFunction(
    () => document.querySelectorAll(".pdf-page-card").length === 2,
    null,
    { timeout: 60000 },
  );

  const pageFile = await downloadFrom(
    page.locator(".pdf-page-card").first().locator("button", { hasText: "下载" }),
  );
  assert.match(pageFile, /\.png$/i);
  assertPng(pageFile);

  const zip = await downloadFrom(
    page.locator(".pdf-result-actions button", { hasText: "下载全部 ZIP" }),
  );
  const entries = await zipEntries(zip);
  assert.equal(entries.length, 2);
  assert.ok(entries.every((entry) => entry.endsWith(".png")));
});

test("视频转 GIF：MP4 输入与非法文件", async () => {
  await openModule("视频转 GIF");
  await uploadFiles("doc.txt");
  await waitForText(".error-box", "请选择视频文件");

  await clickButton(page.locator(".video-to-gif-header"), "清空");
  await uploadFiles("clip.mp4");
  await page.waitForSelector(".video-summary");
  await clickButton(page.locator(".gif-settings-card"), "生成 GIF");
  await page.waitForSelector(".gif-preview-image", { timeout: 60000 });

  const gif = await downloadFrom(
    page.locator(".gif-result-footer button", { hasText: "下载 GIF" }),
  );
  assert.match(gif, /\.gif$/i);
  assertGif(gif);
});

test("文件搜索：无效目录静默返回空结果，恢复有效目录后可搜索", async () => {
  await openModule("文件搜索");
  await page.locator(".path-input").fill("/tmp/bennett-missing-directory");
  await page.locator(".search-input").fill("report");
  await page.waitForSelector(".error-box", { timeout: 20000 });
  await waitForText(".error-box", "搜索失败");
  assert.equal(await page.locator(".result-item").count(), 0);

  await page.locator(".path-input").fill(SEARCH_DIR);
  await page.locator(".search-input").fill("photo");
  await page.waitForFunction(
    () => document.querySelectorAll(".result-item").length === 1,
    null,
    { timeout: 20000 },
  );
  assert.equal(await page.locator(".result-item .file-name").first().textContent(), "photo-final.png");
});

test("文件搜索：子目录不可读仍继续", async () => {
  const dir = "/tmp/bennett-e2e-locked";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "blocked"), { recursive: true });
  fs.writeFileSync(path.join(dir, "hello.txt"), "hello\n");
  fs.chmodSync(path.join(dir, "blocked"), 0o000);
  try {
    await openModule("文件搜索");
    await page.locator(".path-input").fill(dir);
    await page.locator(".search-input").fill("hello");
    await page.waitForFunction(
      () => document.querySelectorAll(".result-item").length === 1,
      null,
      { timeout: 20000 },
    );
    assert.equal(await page.locator(".error-box").count(), 0);
  } finally {
    fs.chmodSync(path.join(dir, "blocked"), 0o755);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("文档转 Markdown：清空与不支持类型", async () => {
  await openModule("文档转 MD", "文档转 Markdown");
  await app.evaluate(({ ipcMain }, goodPath) => {
    ipcMain.removeHandler("select-markitdown-file");
    ipcMain.handle("select-markitdown-file", async () => ({
      path: goodPath,
      name: "doc.txt",
      size: 17,
      extension: "TXT",
    }));
  }, path.join(FIX, "doc.txt"));
  await clickButton(page.locator(".document-drop-zone"), "选择文件");
  await page.waitForSelector(".document-summary");
  await clickButton(page.locator(".document-summary"), "转换为 Markdown");
  await page.waitForFunction(
    () => document.querySelector(".markdown-output")?.value?.includes("Converted"),
  );
  await clickButton(page.locator(".document-converter-header"), "清空");
  assert.equal(await page.locator(".document-summary").count(), 0);
  assert.equal(await page.locator(".markdown-output").inputValue(), "");

  await app.evaluate(({ ipcMain }, badPath) => {
    ipcMain.removeHandler("select-markitdown-file");
    ipcMain.handle("select-markitdown-file", async () => ({
      path: badPath,
      name: "bad.xyz",
      size: 10,
      extension: "XYZ",
    }));
  }, path.join(FIX, "bad.xyz"));
  await clickButton(page.locator(".document-drop-zone"), "选择文件");
  await waitForText(".error-box", "暂不支持此文件类型");
  assert.equal(await page.locator(".document-summary").count(), 0);

  await app.evaluate(({ ipcMain }, goodPath) => {
    ipcMain.removeHandler("select-markitdown-file");
    ipcMain.handle("select-markitdown-file", async () => ({
      path: goodPath,
      name: "doc.txt",
      size: 17,
      extension: "TXT",
    }));
  }, path.join(FIX, "doc.txt"));
  await clickButton(page.locator(".document-drop-zone"), "选择文件");
  await page.waitForSelector(".document-summary");
  await clickButton(page.locator(".document-converter-header"), "清空");

  await page.evaluate(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.id = "e2e-temp-file";
    document.body.appendChild(input);
  });
  await page.locator("#e2e-temp-file").setInputFiles(path.join(FIX, "bad.xyz"));
  await page.evaluate(() => {
    const input = document.getElementById("e2e-temp-file");
    const transfer = new DataTransfer();
    transfer.items.add(input.files[0]);
    document.querySelector(".document-drop-zone").dispatchEvent(
      new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }),
    );
    input.remove();
  });
  await waitForText(".error-box", "暂不支持此文件类型");
});

test("截图悬浮：取消裁剪", async () => {
  await page.reload();
  await openModule("截图悬浮");
  await clickButton(page.locator(".screenshot-float-header .header-actions"), "刷新源");
  await page.waitForSelector(".source-item", { timeout: 30000 });
  await page.locator(".source-item").first().click();
  await clickButton(page.locator(".screenshot-float-header .header-actions"), "截取整屏");
  await page.waitForSelector(".crop-overlay", { timeout: 30000 });
  await clickButton(page.locator(".crop-overlay"), "取消");
  assert.equal(await page.locator(".crop-overlay").count(), 0);
  assert.equal(await page.locator(".screenshot-card").count(), 0);
});

test("截图悬浮：Esc 取消框选", async () => {
  await page.reload();
  await openModule("截图悬浮");
  const selectionPromise = app.waitForEvent("window", { timeout: 45000 });
  await clickButton(page.locator(".screenshot-float-header .header-actions"), "框选截图");
  const selectionPage = await selectionPromise;
  await selectionPage.waitForLoadState("domcontentloaded");
  await selectionPage.keyboard.press("Escape").catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll(".screenshot-card").length === 0);
});

test("截图悬浮：权限拒绝提示", async () => {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("check-screen-permission");
    ipcMain.handle("check-screen-permission", async () => "denied");
  });
  await page.reload();
  await openModule("截图悬浮");
  await page.waitForSelector(".permission-warning");
  await waitForText(".permission-warning", "denied");

  await app.evaluate(({ ipcMain, systemPreferences }) => {
    ipcMain.removeHandler("check-screen-permission");
    ipcMain.handle("check-screen-permission", async () =>
      process.platform === "darwin" ? systemPreferences.getMediaAccessStatus("screen") : "granted",
    );
  });
});

test("截图悬浮：屏幕源获取失败", async () => {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("get-desktop-sources");
    ipcMain.handle("get-desktop-sources", async () => {
      throw new Error("mock failure");
    });
  });
  await page.reload();
  await openModule("截图悬浮");
  await clickButton(page.locator(".screenshot-float-header .header-actions"), "刷新源");
  await page.waitForSelector(".error-box", { timeout: 30000 });
  await waitForText(".error-box", "获取屏幕源失败");
});

test("屏幕取色：不支持提示、历史回选与持久化", async () => {
  await openModule("屏幕取色");
  await page.evaluate(() => {
    window.EyeDropper = undefined;
  });
  await page.locator(".pick-btn-overlay").click();
  await waitForText(".error-message", "不支持原生取色器");

  await page.evaluate(() => {
    window.__nextColor = "#3366ff";
    window.EyeDropper = class {
      open() {
        return Promise.resolve({ sRGBHex: window.__nextColor });
      }
    };
  });
  await page.locator(".pick-btn-overlay").click();
  await page.waitForFunction(
    () => document.querySelector(".color-value-large")?.textContent === "#3366FF",
  );
  await page.evaluate(() => {
    window.__nextColor = "#ff6600";
  });
  await page.locator(".pick-btn-overlay").click();
  await page.waitForFunction(
    () => document.querySelector(".color-value-large")?.textContent === "#FF6600",
  );
  assert.equal(await page.locator(".history-item").count(), 2);

  await page.locator(".pick-btn-overlay").click();
  await page.waitForFunction(() => !document.querySelector(".pick-btn-overlay")?.disabled);
  assert.equal(await page.locator(".history-item").count(), 2);

  await page.locator(".history-item").nth(1).click();
  await page.waitForFunction(
    () => document.querySelector(".color-value-large")?.textContent === "#3366FF",
  );

  await page.reload();
  await openModule("屏幕取色");
  assert.equal(await page.locator(".history-item").count(), 2);
  await clickButton(page.locator(".history-panel"), "清空");
  await page.waitForSelector(".empty-history");
});

test("侧边栏：损坏的本地顺序回退默认", async () => {
  await page.evaluate(() => localStorage.setItem("bennett-module-order", "{bad"));
  await page.reload();
  await page.waitForSelector(".nav-item");
  assert.equal(await page.locator(".nav-item").count(), 11);
  assert.equal(await page.locator(".nav-item .nav-label").first().textContent(), "JSON 格式化");
});

test("主进程 IPC 错误路径", async () => {
  const missingHeic = await page.evaluate(() =>
    window.require("electron").ipcRenderer.invoke("convert-heic-image", {
      filePath: "/tmp/does-not-exist.heic",
      targetFormat: "png",
    }),
  );
  assert.equal(missingHeic.success, false);

  const badFormat = await page.evaluate((heicPath) =>
    window.require("electron").ipcRenderer.invoke("convert-heic-image", {
      filePath: heicPath,
      targetFormat: "gif",
    }),
    "/Users/pms/bennett/bennett-toolbox-source/recovered/tests/fixtures/photo.heic");
  assert.equal(badFormat.success, false);

  const missingDoc = await page.evaluate(() =>
    window.require("electron").ipcRenderer.invoke("convert-file-to-markdown", "/tmp/does-not-exist.pdf"),
  );
  assert.equal(missingDoc.success, false);
});
