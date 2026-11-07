import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
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
let zipName;

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

  app = await electron.launch({
    args: [
      ".",
      `--user-data-dir=${userData}`,
      "--disable-gpu",
      "--disable-gpu-compositing",
    ],
    cwd: ROOT,
    env: { ...process.env, BENNETT_PLUGIN_REGISTRY_DIR: registryDir },
  });
  page = await app.firstWindow();
  page.on("pageerror", (error) => console.error("PAGEERROR", error.message));
  await page.waitForSelector(".settings-button");
});

after(async () => {
  await app?.close();
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

test("插件安装、加载、停用、常驻、更新和卸载", async () => {
  await page.locator(".settings-button").click();
  await page.waitForSelector(".settings-card.plugins");
  await page.getByRole("button", { name: "刷新插件列表" }).click();
  await page.waitForSelector(".plugin-row");
  assert.match(await page.locator(".plugin-row").innerText(), /文本统计/);

  await page.getByRole("button", { name: "安装", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 12);
  assert.ok((await page.locator(".nav-label").allTextContents()).includes("文本统计"));

  await page.reload();
  await page.waitForSelector(".settings-button");
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 12);
  await page.getByRole("button", { name: "文本统计" }).click();
  await page.waitForSelector(".fixture-plugin");
  assert.equal(await page.locator(".fixture-plugin").textContent(), "示例插件");

  await page.locator(".settings-button").click();
  await page.waitForSelector(".settings-card.plugins");
  assert.match(await page.locator(".plugin-row").innerText(), /已启用/);
  await page.getByRole("button", { name: "停用", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 11);
  await page.getByRole("button", { name: "启用", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 12);
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
  await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 11);
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
  await page.locator(".settings-button").click();
  await page.waitForSelector(".settings-card.plugins");
  await page.getByRole("button", { name: "刷新插件列表" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".plugin-row").length >= 2);

  const rows = page.locator(".plugin-row");
  await rows.filter({ hasText: "坏校验和" }).first().getByRole("button", { name: "安装" }).click();
  await page.waitForSelector(".plugin-error");
  assert.match(await page.locator(".plugin-error").first().innerText(), /校验失败/);

  await rows.filter({ hasText: "不兼容" }).first().getByRole("button", { name: "安装" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".plugin-error")].some((el) => el.textContent?.includes("99.0.0")),
  );
  assert.equal(await page.locator(".nav-item").count(), 11);
});
