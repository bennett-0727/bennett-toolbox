import * as electron from "electron";
import * as fs from "fs";
import * as path from "path";
import type {
  InstalledPlugin,
  PluginBundlePayload,
  PluginManifest,
  PluginSnapshot,
} from "../../src/plugins/types";
import { extractPluginZip, sha256 } from "./archive";
import {
  PLUGIN_ZIP_MAX_BYTES,
  pluginsRoot,
  pluginsStagingPath,
} from "./constants";
import {
  isCompatible,
  PluginValidationError,
  validateManifest,
} from "./manifest";
import { latestPlugin, loadRegistry, readRegistryCache, resolvePluginDownload, type RegistrySource } from "./registry";
import { loadRegistryBuffer } from "./registry-fetch";
import {
  pluginVersionDir,
  readPluginState,
  updatePluginState,
  writePluginState,
} from "./state";
import { compareVersions } from "./version";

export interface PluginProgress {
  id: string;
  phase: "download" | "install" | "done";
  percent: number;
}

export type ProgressListener = (progress: PluginProgress) => void;

async function downloadPluginZip(
  plugin: ReturnType<typeof latestPlugin>,
  source: RegistrySource,
): Promise<Buffer> {
  if (!plugin) throw new PluginValidationError("插件不存在");
  const target = resolvePluginDownload(plugin, source);
  let buffer: Buffer;
  if (target.kind === "file") {
    const stat = await fs.promises.stat(target.path);
    if (stat.size > PLUGIN_ZIP_MAX_BYTES) {
      throw new PluginValidationError("插件包超过大小限制");
    }
    buffer = await fs.promises.readFile(target.path);
  } else {
    buffer = await loadRegistryBuffer(target.url, PLUGIN_ZIP_MAX_BYTES);
  }
  if (buffer.byteLength !== plugin.size) {
    throw new PluginValidationError("插件包大小与 registry 不一致");
  }
  if (sha256(buffer) !== plugin.sha256) {
    throw new PluginValidationError("插件包校验失败");
  }
  return buffer;
}

async function readInstalledManifest(id: string, version: string): Promise<PluginManifest> {
  const dir = pluginVersionDir(id, version);
  const raw = JSON.parse(
    await fs.promises.readFile(path.join(dir, "plugin.json"), "utf8"),
  );
  const manifest = validateManifest(raw);
  if (manifest.id !== id || manifest.version !== version) {
    throw new PluginValidationError("插件清单与安装记录不一致");
  }
  const mainPath = path.resolve(dir, manifest.main);
  if (!mainPath.startsWith(`${path.resolve(dir)}${path.sep}`)) {
    throw new PluginValidationError("插件入口路径越界");
  }
  const stat = await fs.promises.stat(mainPath);
  if (!stat.isFile()) throw new PluginValidationError("插件入口不存在");
  return manifest;
}

export async function listPluginSnapshot(): Promise<PluginSnapshot> {
  const state = await readPluginState();
  const installed: InstalledPlugin[] = [];
  for (const [id, entry] of Object.entries(state.plugins)) {
    try {
      const manifest = await readInstalledManifest(id, entry.version);
      installed.push({
        manifest,
        enabled: entry.enabled,
        activation: entry.activation,
        installedAt: entry.installedAt,
      });
    } catch {
      // Corrupt installs stay out of the sidebar until reinstalled.
    }
  }
  const cached = await readRegistryCache();
  return {
    installed,
    available: cached?.registry.plugins || [],
    registryUpdatedAt: cached?.registry.generatedAt || null,
  };
}

export async function installPlugin(
  id: string,
  onProgress?: ProgressListener,
): Promise<PluginSnapshot> {
  const source = await loadRegistry();
  const plugin = latestPlugin(source.registry, id);
  if (!plugin) throw new PluginValidationError("registry 中不存在该插件");
  const appVersion = electron.app.getVersion();
  if (!isCompatible(plugin, appVersion)) {
    throw new PluginValidationError(`插件需要应用版本 ${plugin.minAppVersion} 或更高`);
  }

  onProgress?.({ id, phase: "download", percent: 5 });
  const buffer = await downloadPluginZip(plugin, source);
  onProgress?.({ id, phase: "install", percent: 60 });

  const staging = path.join(
    pluginsStagingPath(),
    `${id}-${plugin.version}-${process.pid}-${Date.now()}`,
  );
  await fs.promises.mkdir(staging, { recursive: true });
  try {
    await extractPluginZip(buffer, staging);
    const manifest = await readInstalledManifestFromDir(staging, id, plugin.version);
    const target = pluginVersionDir(id, manifest.version);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.rm(target, { recursive: true, force: true });
    await fs.promises.rename(staging, target);
    await updatePluginState((state) => {
      const previous = state.plugins[id];
      state.plugins[id] = {
        version: manifest.version,
        enabled: previous?.enabled ?? true,
        activation: previous?.activation ?? manifest.activation,
        installedAt: new Date().toISOString(),
      };
    });
    await pruneOldVersions(id, manifest.version);
  } finally {
    await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => {});
  }

  onProgress?.({ id, phase: "done", percent: 100 });
  return listPluginSnapshot();
}

async function readInstalledManifestFromDir(
  dir: string,
  id: string,
  version: string,
): Promise<PluginManifest> {
  const raw = JSON.parse(
    await fs.promises.readFile(path.join(dir, "plugin.json"), "utf8"),
  );
  const manifest = validateManifest(raw);
  if (manifest.id !== id || manifest.version !== version) {
    throw new PluginValidationError("插件清单与 registry 不一致");
  }
  const mainPath = path.resolve(dir, manifest.main);
  if (!mainPath.startsWith(`${path.resolve(dir)}${path.sep}`)) {
    throw new PluginValidationError("插件入口路径越界");
  }
  const stat = await fs.promises.stat(mainPath);
  if (!stat.isFile()) throw new PluginValidationError("插件入口不存在");
  return manifest;
}

async function pruneOldVersions(id: string, keepVersion: string): Promise<void> {
  const dir = path.join(pluginsRoot(), id);
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name !== keepVersion)
        .map((entry) => fs.promises.rm(path.join(dir, entry.name), { recursive: true, force: true })),
    );
  } catch {}
}

export async function updatePlugin(
  id: string,
  onProgress?: ProgressListener,
): Promise<PluginSnapshot> {
  const state = await readPluginState();
  const current = state.plugins[id];
  const source = await loadRegistry();
  const latest = latestPlugin(source.registry, id);
  if (!latest) throw new PluginValidationError("registry 中不存在该插件");
  if (current && compareVersions(latest.version, current.version) <= 0) {
    throw new PluginValidationError("插件已是最新版本");
  }
  return installPlugin(id, onProgress);
}

export async function removePlugin(id: string): Promise<PluginSnapshot> {
  await fs.promises.rm(path.join(pluginsRoot(), id), { recursive: true, force: true });
  await updatePluginState((state) => {
    delete state.plugins[id];
  });
  return listPluginSnapshot();
}

export async function setPluginEnabled(id: string, enabled: boolean): Promise<PluginSnapshot> {
  await updatePluginState((state) => {
    const entry = state.plugins[id];
    if (!entry) throw new PluginValidationError("插件未安装");
    entry.enabled = enabled;
  });
  return listPluginSnapshot();
}

export async function setPluginActivation(
  id: string,
  activation: "on-demand" | "resident",
): Promise<PluginSnapshot> {
  await updatePluginState((state) => {
    const entry = state.plugins[id];
    if (!entry) throw new PluginValidationError("插件未安装");
    entry.activation = activation;
  });
  return listPluginSnapshot();
}

export async function refreshPluginRegistry(): Promise<PluginSnapshot> {
  const source = await loadRegistry({ forceRefresh: true });
  const state = await readPluginState();
  if (Object.keys(state.plugins).length === 0) {
    await writePluginState(state);
  }
  return {
    installed: (await listPluginSnapshot()).installed,
    available: source.registry.plugins,
    registryUpdatedAt: source.registry.generatedAt,
  };
}

export async function readPluginBundle(id: string): Promise<PluginBundlePayload> {
  const state = await readPluginState();
  const entry = state.plugins[id];
  if (!entry) throw new PluginValidationError("插件未安装");
  const manifest = await readInstalledManifest(id, entry.version);
  const dir = pluginVersionDir(id, entry.version);
  const mainPath = path.resolve(dir, manifest.main);
  if (!mainPath.startsWith(`${path.resolve(dir)}${path.sep}`)) {
    throw new PluginValidationError("插件入口路径越界");
  }
  const code = await fs.promises.readFile(mainPath, "utf8");
  return { manifest, code };
}

export async function openPluginsFolder(): Promise<void> {
  await fs.promises.mkdir(pluginsRoot(), { recursive: true });
  await electron.shell.openPath(pluginsRoot());
}
