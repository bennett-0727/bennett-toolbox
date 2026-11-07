import * as electron from "electron";
import type { PluginOperationResult, PluginSnapshot } from "../../src/plugins/types";
import { broadcast, isTrustedSender } from "../ipc-utils";
import {
  installPlugin,
  listPluginSnapshot,
  openPluginsFolder,
  readPluginBundle,
  refreshPluginRegistry,
  removePlugin,
  setPluginActivation,
  setPluginEnabled,
  updatePlugin,
  type PluginProgress,
} from "./install";
import { isValidPluginId } from "./manifest";

function readPluginId(payload: unknown): string {
  const id = (payload as { id?: unknown })?.id;
  if (typeof id !== "string" || !isValidPluginId(id)) throw new Error("插件 id 无效");
  return id;
}

function snapshotResult(snapshot: PluginSnapshot): PluginOperationResult {
  broadcast("plugins:changed", snapshot);
  return { ok: true, snapshot };
}

function errorResult(error: unknown): PluginOperationResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

function handle(
  channel: string,
  handler: (event: electron.IpcMainInvokeEvent, payload: unknown) => Promise<PluginOperationResult>,
): void {
  electron.ipcMain.handle(channel, async (event, payload) => {
    if (!isTrustedSender(event)) {
      return { ok: false, error: "不受信任的调用来源" } satisfies PluginOperationResult;
    }
    try {
      return await handler(event, payload);
    } catch (error) {
      return errorResult(error);
    }
  });
}

export function registerPluginIpc(): void {
  electron.ipcMain.handle("plugins:read-bundle", async (event, payload: unknown) => {
    if (!isTrustedSender(event)) return { ok: false, error: "不受信任的调用来源" };
    try {
      return { ok: true, bundle: await readPluginBundle(readPluginId(payload)) };
    } catch (error) {
      return errorResult(error);
    }
  });

  electron.ipcMain.handle("plugins:list", async (event) => {
    if (!isTrustedSender(event)) return { ok: false, error: "不受信任的调用来源" };
    try {
      return { ok: true, snapshot: await listPluginSnapshot() };
    } catch (error) {
      return errorResult(error);
    }
  });

  handle("plugins:refresh-registry", async () => snapshotResult(await refreshPluginRegistry()));

  handle("plugins:install", async (_event, payload) => {
    const id = readPluginId(payload);
    return snapshotResult(
      await installPlugin(id, (progress: PluginProgress) => {
        broadcast("plugins:install-progress", progress);
      }),
    );
  });

  handle("plugins:update", async (_event, payload) => {
    const id = readPluginId(payload);
    return snapshotResult(
      await updatePlugin(id, (progress: PluginProgress) => {
        broadcast("plugins:install-progress", progress);
      }),
    );
  });

  handle("plugins:remove", async (_event, payload) => {
    return snapshotResult(await removePlugin(readPluginId(payload)));
  });

  handle("plugins:set-enabled", async (_event, payload) => {
    const source = payload as { enabled?: unknown };
    const id = readPluginId(payload);
    if (typeof source?.enabled !== "boolean") throw new Error("插件状态参数无效");
    return snapshotResult(await setPluginEnabled(id, source.enabled));
  });

  handle("plugins:set-activation", async (_event, payload) => {
    const source = payload as { activation?: unknown };
    const id = readPluginId(payload);
    if (source.activation !== "on-demand" && source.activation !== "resident") {
      throw new Error("插件激活参数无效");
    }
    return snapshotResult(await setPluginActivation(id, source.activation));
  });

  handle("plugins:open-folder", async () => {
    await openPluginsFolder();
    return { ok: true };
  });
}
