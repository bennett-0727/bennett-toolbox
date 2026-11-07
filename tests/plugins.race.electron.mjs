import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import JSZip from "jszip";
import { _electron as electron } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const IDS = ["race-a", "race-b", "race-c", "race-d"].map((name) => `bennett.${name}`);

let app;
let page;
let tempDir;
let userData;
let registryDir;

function manifest(id) {
  return {
    schemaVersion: 1,
    id,
    name: { "zh-CN": id, "en-US": id },
    description: { "zh-CN": "并发状态测试插件", "en-US": "Race fixture" },
    version: "1.0.0",
    apiVersion: 1,
    minAppVersion: "2.0.0",
    main: "main.js",
    icon: "*",
    activation: "on-demand",
  };
}

function bundle(id) {
  return `window.__BENNETT_REGISTER_PLUGIN__?.(${JSON.stringify(id)}, () => ({
  mount(container) {
    const node = document.createElement("div");
    node.textContent = ${JSON.stringify(id)};
    container.appendChild(node);
    return () => node.remove();
  }
}));`;
}

async function writeRegistry() {
  const zipsDir = path.join(registryDir, "zips");
  fs.mkdirSync(zipsDir, { recursive: true });
  const plugins = [];
  for (const id of IDS) {
    const zip = new JSZip();
    zip.file("plugin.json", JSON.stringify(manifest(id)));
    zip.file("main.js", bundle(id));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const filename = `${id}-1.0.0.zip`;
    fs.writeFileSync(path.join(zipsDir, filename), buffer);
    plugins.push({
      ...manifest(id),
      downloadUrl: `zips/${filename}`,
      size: buffer.byteLength,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    });
  }
  fs.writeFileSync(
    path.join(registryDir, "registry.json"),
    JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), plugins }, null, 2),
  );
}

function launchOptions() {
  return {
    args: [".", `--user-data-dir=${userData}`, "--disable-gpu", "--disable-gpu-compositing"],
    cwd: ROOT,
    env: {
      ...process.env,
      BENNETT_PLUGIN_REGISTRY_DIR: registryDir,
      BENNETT_USER_DATA_DIR: userData,
      BENNETT_SKIP_COMPONENT_WARMUP: "1",
    },
  };
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-plugin-race-e2e-"));
  userData = path.join(tempDir, "user-data");
  registryDir = path.join(tempDir, "registry");
  await writeRegistry();

  app = await electron.launch(launchOptions());
  page = await app.firstWindow();
  page.on("pageerror", (error) => console.error("PAGEERROR", error.message));
  await page.waitForSelector(".workbench-nav");
});

after(async () => {
  await app?.close();
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

test("并发安装保留全部插件状态", async () => {
  const results = await page.evaluate(async (ids) => {
    const ipc = window.require("electron").ipcRenderer;
    const refreshed = await ipc.invoke("plugins:refresh-registry");
    if (!refreshed?.ok) throw new Error(refreshed?.error || "registry refresh failed");
    return Promise.all(ids.map((id) => ipc.invoke("plugins:install", { id })));
  }, IDS);

  assert.equal(results.every((result) => result?.ok), true, JSON.stringify(results));

  const state = JSON.parse(
    fs.readFileSync(path.join(userData, "plugins", "plugins-state.json"), "utf8"),
  );
  assert.deepEqual(Object.keys(state.plugins).sort(), [...IDS].sort());

  const installed = await page.evaluate(async () => {
    const snapshot = await window.require("electron").ipcRenderer.invoke("plugins:list");
    return snapshot?.ok ? snapshot.snapshot.installed.map((plugin) => plugin.manifest.id) : [];
  });
  assert.deepEqual(installed.slice().sort(), [...IDS].sort());
});

test("重复启动不创建第二个主窗口", async () => {
  let second = null;
  try {
    second = await electron.launch({ ...launchOptions(), timeout: 15000 });
  } catch {
    // 单实例锁生效时，第二实例在连接前退出。
  }
  if (second) {
    assert.equal(second.windows().length, 0);
    await second.close().catch(() => {});
  }
  assert.equal(app.windows().length, 1);
  assert.match(await page.title(), /Bennett Toolbox/);
});
