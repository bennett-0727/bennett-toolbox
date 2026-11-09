import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import JSZip from "jszip";
import { _electron as electron } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const PLUGIN_ID = "bennett.text-stats";

function manifest(version) {
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
  };
}

function pluginBundle() {
  return `window.__BENNETT_REGISTER_PLUGIN__?.(${JSON.stringify(PLUGIN_ID)}, () => ({ mount() { return () => {}; } }));`;
}

async function makeZip(version) {
  const zip = new JSZip();
  zip.file("plugin.json", JSON.stringify(manifest(version)));
  zip.file("main.js", pluginBundle());
  return zip.generateAsync({ type: "nodebuffer" });
}

function cacheEntry(version) {
  const buffer = Buffer.from("cached");
  return {
    ...manifest(version),
    downloadUrl: `zips/${PLUGIN_ID}-${version}.zip`,
    size: buffer.byteLength,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

function seedCache(userData, version) {
  const pluginsDir = path.join(userData, "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginsDir, "registry-cache.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: "2026-01-01T00:00:00.000Z",
        plugins: [cacheEntry(version)],
      },
      null,
      2,
    ),
  );
}

function seedInstalled(userData, version) {
  const pluginsDir = path.join(userData, "plugins");
  const versionDir = path.join(pluginsDir, PLUGIN_ID, version);
  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(path.join(versionDir, "plugin.json"), JSON.stringify(manifest(version)));
  fs.writeFileSync(path.join(versionDir, "main.js"), pluginBundle());
  fs.writeFileSync(
    path.join(pluginsDir, "plugins-state.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        plugins: {
          [PLUGIN_ID]: {
            version,
            enabled: true,
            activation: "on-demand",
            installedAt: new Date().toISOString(),
          },
        },
      },
      null,
      2,
    ),
  );
}

function writeRegistry(registryDir, version, buffer) {
  fs.mkdirSync(path.join(registryDir, "zips"), { recursive: true });
  const filename = `${PLUGIN_ID}-${version}.zip`;
  fs.writeFileSync(path.join(registryDir, "zips", filename), buffer);
  fs.writeFileSync(
    path.join(registryDir, "registry.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        plugins: [
          {
            ...manifest(version),
            downloadUrl: `zips/${filename}`,
            size: buffer.byteLength,
            sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
          },
        ],
      },
      null,
      2,
    ),
  );
}

async function launch({ registryVersion, cacheVersion, registryAvailable = true, initScript } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-autocheck-"));
  const registryDir = path.join(tempDir, "registry");
  const userData = path.join(tempDir, "user-data");
  fs.mkdirSync(registryDir, { recursive: true });
  if (registryAvailable) {
    writeRegistry(registryDir, registryVersion, await makeZip(registryVersion));
  }
  seedCache(userData, cacheVersion);
  seedInstalled(userData, cacheVersion);

  const app = await electron.launch({
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
      BENNETT_USER_DATA_DIR: userData,
      BENNETT_SKIP_COMPONENT_WARMUP: "1",
    },
  });
  const page = await app.firstWindow();
  if (initScript) {
    await page.addInitScript(initScript);
    await page.reload();
  }
  await page.waitForSelector(".plugin-manager");
  return {
    app,
    page,
    close: async () => {
      await app.close().catch(() => {});
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

function installedRow(page) {
  return page.locator(".plugin-row").filter({ hasText: "文本统计" });
}

test("启动自动发现更新", async () => {
  const context = await launch({ registryVersion: "1.0.1", cacheVersion: "1.0.0" });
  try {
    const row = installedRow(context.page);
    await row.waitFor();
    await row.getByRole("button", { name: "更新 v1.0.1" }).waitFor({ timeout: 20000 });
    const registryTime = await context.page.locator(".plugin-registry-time").innerText();
    assert.doesNotMatch(registryTime, /尚未刷新/);
  } finally {
    await context.close();
  }
});

test("自动刷新失败", async () => {
  const context = await launch({
    registryVersion: "1.0.1",
    cacheVersion: "1.0.0",
    registryAvailable: false,
  });
  try {
    const row = installedRow(context.page);
    await row.waitFor();
    await context.page.waitForTimeout(1500);
    assert.match(await row.innerText(), /v1\.0\.0/);
    assert.equal(await row.getByRole("button", { name: /更新 v/ }).count(), 0);
    assert.equal(await context.page.locator(".plugin-error").count(), 0);
    assert.equal(await context.page.locator(".plugin-loading").count(), 0);
  } finally {
    await context.close();
  }
});

test("并发刷新合并", async () => {
  const context = await launch({
    registryVersion: "1.0.1",
    cacheVersion: "1.0.0",
    initScript: () => {
      const ipc = window.require?.("electron")?.ipcRenderer;
      window.__refreshCalls = 0;
      if (!ipc) return;
      const original = ipc.invoke.bind(ipc);
      ipc.invoke = (channel, ...args) => {
        if (channel !== "plugins:refresh-registry") return original(channel, ...args);
        window.__refreshCalls += 1;
        return new Promise((resolve, reject) => {
          setTimeout(() => original(channel, ...args).then(resolve, reject), 1000);
        });
      };
    },
  });
  try {
    const row = installedRow(context.page);
    await row.waitFor();
    await context.page.getByRole("button", { name: "刷新插件列表" }).click();
    await row.getByRole("button", { name: "更新 v1.0.1" }).waitFor({ timeout: 20000 });
    await context.page.waitForTimeout(300);
    assert.equal(await context.page.evaluate(() => window.__refreshCalls), 1);
  } finally {
    await context.close();
  }
});
