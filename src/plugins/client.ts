import type {
  PluginBundlePayload,
  PluginOperationResult,
  PluginSnapshot,
} from "./types";

const EMPTY_SNAPSHOT: PluginSnapshot = {
  installed: [],
  available: [],
  registryUpdatedAt: null,
};

function ipcRenderer() {
  if (typeof window === "undefined" || typeof window.require !== "function") return null;
  try {
    return window.require("electron").ipcRenderer;
  } catch {
    return null;
  }
}

async function invoke(
  channel: string,
  payload?: unknown,
): Promise<PluginOperationResult> {
  const ipc = ipcRenderer();
  if (!ipc) return { ok: false, error: "插件功能仅支持桌面应用" };
  return ipc.invoke(channel, payload);
}

export async function listPlugins(): Promise<PluginSnapshot> {
  if (!ipcRenderer()) return EMPTY_SNAPSHOT;
  const result = await invoke("plugins:list");
  if (!result.ok) throw new Error(result.error || "读取插件列表失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

let refreshInFlight: Promise<PluginSnapshot> | null = null;

export function refreshRegistry(): Promise<PluginSnapshot> {
  if (refreshInFlight) return refreshInFlight;
  const request = runRefreshRegistry();
  refreshInFlight = request;
  void request
    .finally(() => {
      if (refreshInFlight === request) refreshInFlight = null;
    })
    .catch(() => {});
  return request;
}

async function runRefreshRegistry(): Promise<PluginSnapshot> {
  const result = await invoke("plugins:refresh-registry");
  if (!result.ok) throw new Error(result.error || "刷新插件 registry 失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

export async function installPlugin(id: string): Promise<PluginSnapshot> {
  const result = await invoke("plugins:install", { id });
  if (!result.ok) throw new Error(result.error || "安装插件失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

export async function updatePlugin(id: string): Promise<PluginSnapshot> {
  const result = await invoke("plugins:update", { id });
  if (!result.ok) throw new Error(result.error || "更新插件失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

export async function removePlugin(id: string): Promise<PluginSnapshot> {
  const result = await invoke("plugins:remove", { id });
  if (!result.ok) throw new Error(result.error || "卸载插件失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

export async function setPluginEnabled(
  id: string,
  enabled: boolean,
): Promise<PluginSnapshot> {
  const result = await invoke("plugins:set-enabled", { id, enabled });
  if (!result.ok) throw new Error(result.error || "更新插件状态失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

export async function setPluginActivation(
  id: string,
  activation: "on-demand" | "resident",
): Promise<PluginSnapshot> {
  const result = await invoke("plugins:set-activation", { id, activation });
  if (!result.ok) throw new Error(result.error || "更新插件激活方式失败");
  return result.snapshot || EMPTY_SNAPSHOT;
}

export async function readPluginBundle(id: string): Promise<PluginBundlePayload> {
  const ipc = ipcRenderer();
  if (!ipc) throw new Error("插件功能仅支持桌面应用");
  const result = await ipc.invoke("plugins:read-bundle", { id });
  if (!result?.ok || !result.bundle) throw new Error(result?.error || "读取插件失败");
  return result.bundle;
}

export async function openPluginsFolder(): Promise<void> {
  const result = await invoke("plugins:open-folder");
  if (!result.ok) throw new Error(result.error || "打开插件目录失败");
}

export function onPluginsChanged(callback: (snapshot: PluginSnapshot) => void): () => void {
  const ipc = ipcRenderer();
  if (!ipc) return () => {};
  const listener = (_event: unknown, snapshot: PluginSnapshot) => callback(snapshot);
  ipc.on("plugins:changed", listener);
  return () => ipc.removeListener("plugins:changed", listener);
}

export interface MarkitdownStatus {
  installed: boolean;
  available: boolean;
  version: string;
  path: string | null;
  assetName: string;
  platform: string;
  arch: string;
}

export async function getMarkitdownStatus(): Promise<MarkitdownStatus> {
  const ipc = ipcRenderer();
  if (!ipc) {
    return { installed: false, available: false, version: "", path: null, assetName: "", platform: "", arch: "" };
  }
  const result = await ipc.invoke("components:markitdown-status");
  if (!result?.ok || !result.status) throw new Error(result?.error || "读取组件状态失败");
  return result.status;
}

export async function downloadMarkitdown(): Promise<MarkitdownStatus> {
  const result = await invoke("components:markitdown-download");
  if (!result.ok) throw new Error(result.error || "下载组件失败");
  return (result as unknown as { status: MarkitdownStatus }).status;
}

export function onMarkitdownProgress(callback: (percent: number) => void): () => void {
  const ipc = ipcRenderer();
  if (!ipc) return () => {};
  const listener = (_event: unknown, payload: { percent: number }) => callback(payload.percent);
  ipc.on("components:markitdown-progress", listener);
  return () => ipc.removeListener("components:markitdown-progress", listener);
}

export interface PluginInstallProgress {
  id: string;
  phase: "download" | "install" | "done";
  percent: number;
}

export function onInstallProgress(callback: (progress: PluginInstallProgress) => void): () => void {
  const ipc = ipcRenderer();
  if (!ipc) return () => {};
  const listener = (_event: unknown, progress: PluginInstallProgress) => callback(progress);
  ipc.on("plugins:install-progress", listener);
  return () => ipc.removeListener("plugins:install-progress", listener);
}
