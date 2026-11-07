import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright-core";
import { preparePluginRegistry } from "./helpers/plugin-fixtures.mjs";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-smoke-user-"));
const registryDir = process.env.BENNETT_PLUGIN_REGISTRY_DIR
  ? process.env.BENNETT_PLUGIN_REGISTRY_DIR
  : null;
const app = await electron.launch({
  ...(process.env.ELECTRON_APP_PATH
    ? {
        executablePath: process.env.ELECTRON_APP_PATH,
        args: ["--disable-gpu", `--user-data-dir=${userData}`],
      }
    : { args: [".", "--disable-gpu", `--user-data-dir=${userData}`] }),
  env: {
    ...process.env,
    BENNETT_USER_DATA_DIR: userData,
    ...(registryDir ? { BENNETT_PLUGIN_REGISTRY_DIR: registryDir } : {}),
  },
});
const passed = [];

try {
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  assert.match(await page.title(), /Bennett Toolbox/);
  passed.push("窗口标题");

  if (registryDir) {
    const registry = preparePluginRegistry();
    await page.evaluate(async (dir) => {
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
      return dir;
    }, registry);
    await page.waitForFunction(() => document.querySelectorAll(".nav-item").length === 11);
    passed.push("安装 11 个插件");
    await page.getByRole("button", { name: /JSON 格式化/ }).click();
    await page.locator("textarea.json-input").fill('{"name":"张三","age":25,"tags":["a","b"]}');
    await page.locator(".json-formatter-header button", { hasText: "格式化" }).click();
    await page.waitForSelector(".json-key");
    passed.push("JSON 插件");
  } else {
    assert.equal(await page.locator(".nav-item").count(), 0);
    assert.equal(await page.locator(".workbench-page").count(), 1);
    passed.push("默认工作台");
    await page.waitForSelector(".plugin-manager");
    passed.push("工作台插件管理");
  }

  const electronApi = await page.evaluate(() => {
    const { ipcRenderer, shell } = window.require("electron");
    return Boolean(ipcRenderer && shell);
  });
  assert.ok(electronApi);
  passed.push("window.require('electron')");

  const permission = await page.evaluate(() =>
    window.require("electron").ipcRenderer.invoke("check-screen-permission"),
  );
  assert.ok(["granted", "denied", "restricted", "not-determined", "unknown"].includes(permission));
  passed.push(`IPC check-screen-permission = ${permission}`);

  const windowCount = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  assert.equal(windowCount, 1);
  passed.push("主进程窗口数");

  console.log(`ELECTRON_E2E_PASS (${passed.length}): ${passed.join(" / ")}`);
} finally {
  await app.close();
  fs.rmSync(userData, { recursive: true, force: true });
}
