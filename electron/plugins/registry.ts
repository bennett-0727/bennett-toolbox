import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { PluginRegistry, RegistryPlugin } from "../../src/plugins/types";
import {
  ALLOWED_DOWNLOAD_HOSTS,
  PLUGIN_REGISTRY_MAX_BYTES,
  PLUGIN_REGISTRY_URL,
  PLUGIN_REPO,
  pluginsRegistryCachePath,
} from "./constants";
import { PluginValidationError, validateRegistry } from "./manifest";
import { loadRegistryBuffer } from "./registry-fetch";

export interface RegistrySource {
  registry: PluginRegistry;
  dir?: string;
  cached: boolean;
}

export async function readRegistryCache(): Promise<RegistrySource | null> {
  const registry = await readCachedRegistry();
  return registry ? { registry, cached: true } : null;
}

async function readCachedRegistry(): Promise<PluginRegistry | null> {
  try {
    const raw = JSON.parse(await fs.promises.readFile(pluginsRegistryCachePath(), "utf8"));
    return validateRegistry(raw);
  } catch {
    return null;
  }
}

async function writeCachedRegistry(registry: PluginRegistry): Promise<void> {
  await fs.promises.mkdir(path.dirname(pluginsRegistryCachePath()), { recursive: true });
  await fs.promises.writeFile(
    pluginsRegistryCachePath(),
    JSON.stringify(registry, null, 2),
    "utf8",
  );
}

function validateRegistryUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
    throw new PluginValidationError("插件 registry 地址不在允许范围");
  }
}

export async function loadRegistry(options: { forceRefresh?: boolean } = {}): Promise<RegistrySource> {
  const localDir = process.env.BENNETT_PLUGIN_REGISTRY_DIR;
  if (localDir) {
    const raw = JSON.parse(
      await fs.promises.readFile(path.join(localDir, "registry.json"), "utf8"),
    );
    return { registry: validateRegistry(raw), dir: localDir, cached: false };
  }

  if (!options.forceRefresh) {
    const cached = await readCachedRegistry();
    if (cached) return { registry: cached, cached: true };
  }

  try {
    validateRegistryUrl(PLUGIN_REGISTRY_URL);
    const buffer = await loadRegistryBuffer(PLUGIN_REGISTRY_URL, PLUGIN_REGISTRY_MAX_BYTES);
    const registry = validateRegistry(JSON.parse(buffer.toString("utf8")));
    await writeCachedRegistry(registry);
    return { registry, cached: false };
  } catch (error) {
    const cached = await readCachedRegistry();
    if (cached) return { registry: cached, cached: true };
    throw error;
  }
}

export function latestPlugin(
  registry: PluginRegistry,
  id: string,
): RegistryPlugin | undefined {
  return registry.plugins
    .filter((plugin) => plugin.id === id)
    .sort((a, b) => {
      const left = a.version.split(".").map((part) => Number.parseInt(part, 10) || 0);
      const right = b.version.split(".").map((part) => Number.parseInt(part, 10) || 0);
      for (let index = 0; index < 3; index += 1) {
        const diff = (left[index] || 0) - (right[index] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    })
    .pop();
}

export function resolvePluginDownload(
  plugin: RegistryPlugin,
  source: RegistrySource,
): { kind: "file"; path: string } | { kind: "url"; url: string } {
  if (source.dir) {
    if (plugin.downloadUrl.startsWith("file://")) {
      const file = fileURLToPath(plugin.downloadUrl);
      const root = path.resolve(source.dir);
      const target = path.resolve(file);
      if (!target.startsWith(`${root}${path.sep}`)) {
        throw new PluginValidationError("插件下载路径越界");
      }
      return { kind: "file", path: target };
    }
    const target = path.resolve(source.dir, plugin.downloadUrl);
    if (!target.startsWith(`${path.resolve(source.dir)}${path.sep}`)) {
      throw new PluginValidationError("插件下载路径越界");
    }
    return { kind: "file", path: target };
  }

  const parsed = new URL(plugin.downloadUrl);
  if (parsed.protocol !== "https:" || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
    throw new PluginValidationError("插件下载地址不在允许范围");
  }
  if (!parsed.pathname.startsWith(`/${PLUGIN_REPO}/`)) {
    throw new PluginValidationError("插件下载地址不属于插件仓库");
  }
  return { kind: "url", url: parsed.toString() };
}
