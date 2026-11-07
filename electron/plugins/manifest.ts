import type {
  LocalizedText,
  PluginActivation,
  PluginManifest,
  PluginRegistry,
  RegistryPlugin,
} from "../../src/plugins/types";
import { compareVersions } from "./version";

export class PluginValidationError extends Error {}

const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ACTIVATIONS: PluginActivation[] = ["on-demand", "resident"];

function fail(message: string): never {
  throw new PluginValidationError(message);
}

function localizedText(value: unknown, field: string): LocalizedText {
  if (!value || typeof value !== "object") fail(`${field} 必须是双语对象`);
  const source = value as Record<string, unknown>;
  const zh = source["zh-CN"];
  const en = source["en-US"];
  if (typeof zh !== "string" || !zh.trim()) fail(`${field}.zh-CN 必须是非空字符串`);
  if (typeof en !== "string" || !en.trim()) fail(`${field}.en-US 必须是非空字符串`);
  return { "zh-CN": zh.trim(), "en-US": en.trim() };
}

function versionText(value: unknown, field: string): string {
  if (typeof value !== "string" || !VERSION_PATTERN.test(value)) {
    fail(`${field} 必须是语义化版本`);
  }
  return value;
}

function relativeEntry(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) fail("main 必须是非空字符串");
  const normalized = value.replace(/\\/g, "/");
  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    fail("main 必须是包内相对路径");
  }
  return normalized;
}

export function isValidPluginId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function validateManifest(raw: unknown): PluginManifest {
  if (!raw || typeof raw !== "object") fail("插件清单必须是对象");
  const source = raw as Record<string, unknown>;
  if (source.schemaVersion !== 1) fail("不支持的插件 schemaVersion");
  const id = source.id;
  if (typeof id !== "string" || !isValidPluginId(id)) fail("插件 id 格式无效");
  const activation = source.activation;
  if (!ACTIVATIONS.includes(activation as PluginActivation)) fail("activation 无效");
  if (source.apiVersion !== 1) fail("不支持的插件 apiVersion");
  const icon = source.icon;
  if (typeof icon !== "string" || !icon.trim()) fail("icon 必须是非空字符串");
  return {
    schemaVersion: 1,
    id,
    name: localizedText(source.name, "name"),
    description: localizedText(source.description, "description"),
    version: versionText(source.version, "version"),
    apiVersion: 1,
    minAppVersion: versionText(source.minAppVersion, "minAppVersion"),
    main: relativeEntry(source.main),
    icon: icon.trim(),
    activation: activation as PluginActivation,
    author: typeof source.author === "string" ? source.author : undefined,
    homepage: typeof source.homepage === "string" ? source.homepage : undefined,
  };
}

export function validateRegistryPlugin(raw: unknown): RegistryPlugin {
  const manifest = validateManifest(raw);
  const source = raw as Record<string, unknown>;
  const downloadUrl = source.downloadUrl;
  if (typeof downloadUrl !== "string" || !downloadUrl.trim()) fail("downloadUrl 必须是非空字符串");
  const sha256 = source.sha256;
  if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) fail("sha256 必须是 64 位小写十六进制");
  const size = source.size;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) fail("size 必须是正数");
  return { ...manifest, downloadUrl, sha256, size };
}

export function validateRegistry(raw: unknown): PluginRegistry {
  if (!raw || typeof raw !== "object") fail("registry 必须是对象");
  const source = raw as Record<string, unknown>;
  if (source.schemaVersion !== 1) fail("不支持的 registry schemaVersion");
  if (typeof source.generatedAt !== "string") fail("registry generatedAt 无效");
  if (!Array.isArray(source.plugins)) fail("registry plugins 必须是数组");
  const ids = new Set<string>();
  const plugins = source.plugins.map((item) => {
    const plugin = validateRegistryPlugin(item);
    if (ids.has(plugin.id)) fail(`registry 中插件 id 重复: ${plugin.id}`);
    ids.add(plugin.id);
    return plugin;
  });
  return { schemaVersion: 1, generatedAt: source.generatedAt, plugins };
}

export function isCompatible(manifest: PluginManifest, appVersion: string): boolean {
  return manifest.apiVersion === 1 && compareVersions(manifest.minAppVersion, appVersion) <= 0;
}
