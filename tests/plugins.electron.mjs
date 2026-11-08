import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import JSZip from "jszip";
import { _electron as electron } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const PLUGIN_ID = "bennett.text-stats";
let app;
let page;
let tempDir;
let registryDir;
let componentServer;
let componentBaseUrl;

function pluginBundle(version, labelZh, labelEn) {
  return `
window.__BENNETT_REGISTER_PLUGIN__?.(${JSON.stringify(PLUGIN_ID)}, () => ({
  mount(container, api) {
    const node = document.createElement("div");
    node.className = "fixture-plugin";
    node.textContent = api.locale === "en-US" ? ${JSON.stringify(labelEn)} : ${JSON.stringify(labelZh)};
    container.appendChild(node);
    return () => node.remove();
  }
}));
`;
}

function manifest(version, overrides = {}) {
  return {
    schemaVersion: 1,
    id: PLUGIN_ID,
    name: { "zh-CN": "文本统计", "en-US": "Text Stats" },
    description: { "zh-CN": "测试插件", "en-US": "Fixture plugin" },
    version,
    apiVersion: 1,
    minAppVersion: "1.2.0",
    main: "main.js",
    icon: "📊",
    activation: "on-demand",
    ...overrides,
  };
}

async function makeZip(version, labelZh, labelEn, overrides = {}) {
  const zip = new JSZip();
  zip.file("plugin.json", JSON.stringify(manifest(version, overrides)));
  zip.file("main.js", pluginBundle(version, labelZh, labelEn));
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}

async function writeRegistry(entries) {
  fs.mkdirSync(path.join(registryDir, "zips"), { recursive: true });
  const plugins = [];
  for (const entry of entries) {
    const id = entry.id || PLUGIN_ID;
    const filename = `${id}-${entry.version}.zip`;
    fs.writeFileSync(path.join(registryDir, "zips", filename), entry.buffer);
    plugins.push({
      ...manifest(entry.version, { id, ...entry.overrides }),
      downloadUrl: `zips/${filename}`,
      size: entry.buffer.byteLength,
      sha256: entry.sha256 || crypto.createHash("sha256").update(entry.buffer).digest("hex"),
    });
  }
  fs.writeFileSync(
    path.join(registryDir, "registry.json"),
    JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), plugins }, null, 2),
  );
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-plugin-e2e-"));
  registryDir = path.join(tempDir, "registry");
  const userData = path.join(tempDir, "user-data");
  const v1 = await makeZip("1.0.0", "示例插件", "Fixture plugin");
  await writeRegistry([{ version: "1.0.0", buffer: v1 }]);

  const componentDir = path.join(tempDir, "component");
  fs.mkdirSync(componentDir, { recursive: true });
  const asset = `markitdown-${process.platform}-${process.arch}.zip`;
  const binary = process.platform === "win32" ? "fake" : "#!/bin/sh\necho hello component\n";
  const componentZip = new JSZip();
  componentZip.file(process.platform === "win32" ? "markitdown.exe" : "markitdown", binary);
  componentZip.file("filler.bin", crypto.randomBytes(256 * 1024));
  const zipBuffer = await componentZip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(path.join(componentDir, asset), zipBuffer);
  const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");
  fs.writeFileSync(path.join(componentDir, `${asset}.sha256`), `${hash}  ${asset}\n`);
  componentServer = http.createServer((request, response) => {
    const name = path.basename(request.url || "");
    const file = path.join(componentDir, name);
    if (!fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const data = fs.readFileSync(file);
    response.writeHead(200, { "Content-Length": data.byteLength });
    const chunkSize = Math.max(1, Math.ceil(data.byteLength / 16));
    let offset = 0;
    const timer = setInterval(() => {
      const next = data.subarray(offset, offset + chunkSize);
      offset += next.byteLength;
      response.write(next);
      if (offset >= data.byteLength) {
        clearInterval(timer);
        response.end();
      }
    }, 30);
    response.on("close", () => clearInterval(timer));
  });
  await new Promise((resolve) => componentServer.listen(0, "127.0.0.1", resolve));
  componentBaseUrl = `http://127.0.0.1:${componentServer.address().port}`;

  app = await electron.launch({
    args: [
      ".",
      `--user-data-dir=${userData}`,
      "--disable-gpu",
      "--disable-gpu-compositing",
    ],
    cwd: ROOT,
    env: {
      ...process.env,
      BENNETT_PLUGIN_REGISTRY_DIR: registryDir,
      BENNETT_MARKITDOWN_COMPONENT_BASE_URL: componentBaseUrl,
      BENNETT_SKIP_COMPONENT_WARMUP: "1",
      BENNETT_USER_DATA_DIR: userData,
    },
  });
  page = await app.firstWindow();
  page.on("pageerror", (error) => console.error("PAGEERROR", error.message));
  await page.waitForSelector(".workbench-nav");
});

after(async () => {
  await app?.close();
  await new Promise((resolve) => componentServer?.close(resolve));
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

test("插件安装、加载、停用、常驻、更新和卸载", async () => {
  await page.waitForSelector(".plugin-manager");
  await page.getByRole("button", { name: "刷新插件列表" }).click();
  const availableRow = page.locator(".plugin-row").filter({ hasText: "文本统计" });
  await availableRow.waitFor();
  assert.match(await availableRow.innerText(), /文本统计/);

  const registryTime = await page.locator(".plugin-registry-time").innerText();
  assert.match(registryTime, /^更新于 .+\d{2}:\d{2}$/);
  assert.doesNotMatch(registryTime, /T\d{2}:\d{2}:\d{2}/);

  await page.getByRole("button", { name: "安装", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 1);
  assert.ok((await page.locator(".nav-label").allTextContents()).includes("文本统计"));

  await page.reload();
  await page.waitForSelector(".workbench-nav");
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 1);
  await page.getByRole("button", { name: "文本统计" }).click();
  await page.waitForSelector(".fixture-plugin");
  assert.equal(await page.locator(".fixture-plugin").textContent(), "示例插件");
  await page.locator(".workbench-nav").click();

  await page.waitForSelector(".plugin-manager");
  const installedRow = page.locator(".plugin-row").filter({ hasText: "文本统计" });
  await installedRow.waitFor();
  assert.match(await installedRow.innerText(), /已启用/);
  await installedRow.getByRole("button", { name: "停用", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 0);
  await page.getByRole("button", { name: "启用", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 1);
  await page.getByRole("button", { name: "设为常驻", exact: true }).click();
  await page.waitForSelector('.plugin-actions button:has-text("改为按需")');

  const v2 = await makeZip("1.0.1", "示例插件 v2", "Fixture plugin v2");
  await writeRegistry([{ version: "1.0.1", buffer: v2 }]);
  await page.getByRole("button", { name: "刷新插件列表" }).click();
  await page.getByRole("button", { name: /更新 v1\.0\.1/ }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".plugin-meta")].some((el) => el.textContent?.includes("v1.0.1")),
  );
  await page.getByRole("button", { name: "卸载", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 0);
});

test("拒绝校验和不匹配与版本不兼容的插件", async () => {
  const bad = await makeZip("2.0.0", "坏校验和", "Bad checksum", {
    id: "bennett.bad-checksum",
    name: { "zh-CN": "坏校验和", "en-US": "Bad checksum" },
  });
  const incompatible = await makeZip("3.0.0", "不兼容", "Incompatible", {
    id: "bennett.incompatible",
    name: { "zh-CN": "不兼容", "en-US": "Incompatible" },
    minAppVersion: "99.0.0",
  });
  await writeRegistry([
    {
      id: "bennett.bad-checksum",
      version: "2.0.0",
      buffer: bad,
      sha256: "0".repeat(64),
      overrides: {
        id: "bennett.bad-checksum",
        name: { "zh-CN": "坏校验和", "en-US": "Bad checksum" },
      },
    },
    {
      id: "bennett.incompatible",
      version: "3.0.0",
      buffer: incompatible,
      overrides: {
        id: "bennett.incompatible",
        name: { "zh-CN": "不兼容", "en-US": "Incompatible" },
        minAppVersion: "99.0.0",
      },
    },
  ]);
  await page.waitForSelector(".plugin-manager");
  await page.getByRole("button", { name: "刷新插件列表" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".plugin-row")].some((el) =>
      el.textContent?.includes("坏校验和"),
    ),
  );

  const rows = page.locator(".plugin-row");
  await rows.filter({ hasText: "坏校验和" }).first().getByRole("button", { name: "安装" }).click();
  await page.waitForSelector(".plugin-error");
  assert.match(await page.locator(".plugin-error").first().innerText(), /校验失败/);

  await rows.filter({ hasText: "不兼容" }).first().getByRole("button", { name: "安装" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".plugin-error")].some((el) => el.textContent?.includes("99.0.0")),
  );
  assert.equal(await page.locator(".nav-item").count(), 0);
});

test("下载 MarkItDown 组件并显示已安装", async () => {
  await page.waitForSelector(".plugin-manager");
  const component = page.locator(".plugin-row").filter({ hasText: "文档转换组件" });
  await component.waitFor();
  assert.match(await component.innerText(), /未安装/);

  const progressSeen = [];
  await component.getByRole("button", { name: "下载组件" }).click();
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const text = await component.innerText();
    const match = text.match(/(?:下载中|安装中) (\d+)%/);
    if (match) progressSeen.push(Number(match[1]));
    if (text.includes("已安装") && !/下载中|安装中/.test(text)) break;
    await page.waitForTimeout(50);
  }
  assert.ok(
    progressSeen.some((percent) => percent > 20 && percent < 80),
    `未观察到递增下载进度: ${progressSeen.join(",")}`,
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".plugin-row")].some(
      (el) => el.textContent?.includes("文档转换组件") && el.textContent.includes("已安装"),
    ),
  );
  assert.match(await component.innerText(), /已安装/);
});

test("组件跨版本复用", async () => {
  const componentsRoot = path.join(tempDir, "user-data", "components", "markitdown");
  fs.rmSync(componentsRoot, { recursive: true, force: true });
  const oldDir = path.join(componentsRoot, "1.0.0");
  fs.mkdirSync(oldDir, { recursive: true });
  const binary = process.platform === "win32" ? "markitdown.exe" : "markitdown";
  fs.writeFileSync(
    path.join(oldDir, binary),
    process.platform === "win32" ? "fake" : "#!/bin/sh\necho old component\n",
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(oldDir, "component.json"),
    JSON.stringify(
      { name: "fixture", version: "1.0.0", sha256: "0".repeat(64), installedAt: new Date().toISOString() },
      null,
      2,
    ),
  );

  await page.reload();
  await page.waitForSelector(".workbench-nav");
  const component = page.locator(".plugin-row").filter({ hasText: "文档转换组件" });
  await component.waitFor();
  const status = await page.evaluate(async () =>
    window.require("electron").ipcRenderer.invoke("components:markitdown-status"),
  );
  assert.equal(status.ok, true);
  assert.equal(status.status.installed, true);
  assert.equal(status.status.version, "1.0.0");
  assert.ok(status.status.path.includes("1.0.0"));
  assert.match(await component.innerText(), /已安装/);
  assert.match(await component.innerText(), /v1\.0\.0/);
});
