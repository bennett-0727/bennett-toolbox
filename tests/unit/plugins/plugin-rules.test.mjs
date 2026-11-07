import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import JSZip from "jszip";

let manifestModule;
let archiveModule;
let versionModule;
let tempDir;

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-plugin-unit-"));
  await build({
    entryPoints: [
      path.resolve("electron/plugins/manifest.ts"),
      path.resolve("electron/plugins/archive.ts"),
      path.resolve("electron/plugins/version.ts"),
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    outdir: tempDir,
    entryNames: "[name]",
    logLevel: "silent",
  });
  manifestModule = await import(pathToFileURL(path.join(tempDir, "manifest.js")));
  archiveModule = await import(pathToFileURL(path.join(tempDir, "archive.js")));
  versionModule = await import(pathToFileURL(path.join(tempDir, "version.js")));
});

after(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

const manifest = (overrides = {}) => ({
  schemaVersion: 1,
  id: "bennett.text-stats",
  name: { "zh-CN": "文本统计", "en-US": "Text Stats" },
  description: { "zh-CN": "统计", "en-US": "Count" },
  version: "1.0.0",
  apiVersion: 1,
  minAppVersion: "1.2.0",
  main: "main.js",
  icon: "📊",
  activation: "on-demand",
  ...overrides,
});

test("manifest 校验与兼容性", () => {
  assert.equal(manifestModule.validateManifest(manifest()).id, "bennett.text-stats");
  assert.equal(manifestModule.isValidPluginId("bennett.text-stats"), true);
  assert.equal(manifestModule.isValidPluginId("Bad Id"), false);
  assert.throws(() => manifestModule.validateManifest(manifest({ id: "bad" })));
  assert.throws(() => manifestModule.validateManifest(manifest({ main: "../main.js" })));
  assert.throws(() => manifestModule.validateManifest(manifest({ apiVersion: 2 })));
  assert.equal(manifestModule.isCompatible(manifest(), "1.2.0"), true);
  assert.equal(manifestModule.isCompatible(manifest(), "1.1.9"), false);
  assert.equal(manifestModule.isCompatible(manifest({ minAppVersion: "9.0.0" }), "1.2.0"), false);
});

test("registry 校验拒绝重复 id 与错误校验和", () => {
  const entry = {
    ...manifest(),
    downloadUrl: "https://github.com/bennett-0727/bennett-toolbox-plugins/releases/download/plugin-v1.0.0/a.zip",
    sha256: "a".repeat(64),
    size: 10,
  };
  const registry = manifestModule.validateRegistry({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    plugins: [entry],
  });
  assert.equal(registry.plugins.length, 1);
  assert.throws(() =>
    manifestModule.validateRegistry({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      plugins: [entry, entry],
    }),
  );
  assert.throws(() =>
    manifestModule.validateRegistry({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      plugins: [{ ...entry, sha256: "bad" }],
    }),
  );
});

test("版本比较", () => {
  assert.ok(versionModule.compareVersions("1.2.0", "1.1.9") > 0);
  assert.ok(versionModule.compareVersions("v1.0.0", "1.0.0") === 0);
  assert.ok(versionModule.compareVersions("1.0.0", "1.0.1") < 0);
});

test("ZIP 路径校验拒绝穿越与绝对路径", () => {
  for (const name of ["../evil.js", "/etc/passwd", "C:/evil.js", "a\\b.js", "a/../../b.js"]) {
    assert.throws(() => archiveModule.safeZipEntryPath(name), name);
  }
  assert.equal(archiveModule.safeZipEntryPath("main.js"), "main.js");
  assert.equal(archiveModule.safeZipEntryPath("assets/icon.svg"), "assets/icon.svg");
});

test("ZIP 解压正常包", async () => {
  const zip = new JSZip();
  zip.file("plugin.json", "{}");
  zip.file("main.js", "window.__BENNETT_REGISTER_PLUGIN__?.('bennett.text-stats', () => ({}));");
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const destination = path.join(tempDir, "extract-ok");
  await archiveModule.extractPluginZip(buffer, destination);
  assert.equal(fs.readFileSync(path.join(destination, "main.js"), "utf8").includes("REGISTER"), true);
});

test("SHA-256 计算稳定", () => {
  assert.equal(
    archiveModule.sha256(Buffer.from("bennett")),
    "34e049b1c46aa37d88ad6d669e54dab4112eed8621565605495e54643fd00025",
  );
});