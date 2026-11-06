import assert from "node:assert/strict";
import { _electron as electron } from "playwright-core";

const app = await electron.launch(
  process.env.ELECTRON_APP_PATH
    ? { executablePath: process.env.ELECTRON_APP_PATH }
    : { args: ["."] },
);
const passed = [];

try {
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");

  assert.match(await page.title(), /Bennett Toolbox/);
  passed.push("窗口标题");

  const navCount = await page.locator(".nav-item").count();
  assert.equal(navCount, 11);
  passed.push("11 个模块");

  assert.equal(await page.locator("h1.module-title").textContent(), "JSON 格式化");

  await page.locator("textarea.json-input").fill('{"name":"张三","age":25,"tags":["a","b"]}');
  await page.locator(".json-formatter-header button", { hasText: "格式化" }).click();
  await page.waitForSelector(".json-key");
  const keys = await page.locator(".json-key").allTextContents();
  assert.ok(keys.includes('"name"'));
  assert.ok(keys.includes('"tags"'));
  passed.push("JSON 格式化");

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

  await page.getByRole("button", { name: /屏幕取色/ }).click();
  assert.match(await page.locator("h1.module-title").textContent(), /屏幕取色器/);
  passed.push("模块切换");

  console.log(`ELECTRON_E2E_PASS (${passed.length}): ${passed.join(" / ")}`);
} finally {
  await app.close();
}
