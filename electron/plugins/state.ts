import * as fs from "fs";
import * as path from "path";
import type { PluginActivation } from "../../src/plugins/types";
import { pluginsRoot, pluginsStatePath } from "./constants";
import { isValidPluginId } from "./manifest";

export interface PluginStateEntry {
  version: string;
  enabled: boolean;
  activation: PluginActivation;
  installedAt: string;
}

export interface PluginState {
  schemaVersion: 1;
  plugins: Record<string, PluginStateEntry>;
}

const emptyState = (): PluginState => ({ schemaVersion: 1, plugins: {} });

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function sanitizeEntry(value: unknown): PluginStateEntry | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (typeof source.version !== "string" || !VERSION_PATTERN.test(source.version)) return null;
  if (source.activation !== "on-demand" && source.activation !== "resident") return null;
  return {
    version: source.version,
    enabled: source.enabled !== false,
    activation: source.activation,
    installedAt: typeof source.installedAt === "string" ? source.installedAt : new Date().toISOString(),
  };
}

export async function readPluginState(): Promise<PluginState> {
  try {
    const raw = JSON.parse(await fs.promises.readFile(pluginsStatePath(), "utf8"));
    if (!raw || typeof raw !== "object" || raw.schemaVersion !== 1 || typeof raw.plugins !== "object") {
      return emptyState();
    }
    const plugins: Record<string, PluginStateEntry> = {};
    for (const [id, value] of Object.entries(raw.plugins as Record<string, unknown>)) {
      if (!isValidPluginId(id)) continue;
      const entry = sanitizeEntry(value);
      if (entry) plugins[id] = entry;
    }
    return { schemaVersion: 1, plugins };
  } catch {
    return emptyState();
  }
}

let stateWriteQueue: Promise<void> = Promise.resolve();

export function writePluginState(state: PluginState): Promise<void> {
  const write = async () => {
    const target = pluginsStatePath();
    await fs.promises.mkdir(pluginsRoot(), { recursive: true });
    const temp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(state, null, 2), "utf8");
    try {
      await fs.promises.rename(temp, target);
    } catch {
      await fs.promises.rm(target, { force: true }).catch(() => {});
      await fs.promises.rename(temp, target);
    }
  };
  const next = stateWriteQueue.then(write, write);
  stateWriteQueue = next.catch(() => {});
  return next;
}

export async function updatePluginState(
  mutate: (state: PluginState) => void,
): Promise<PluginState> {
  const state = await readPluginState();
  mutate(state);
  await writePluginState(state);
  return state;
}

export function pluginVersionDir(id: string, version: string): string {
  return path.join(pluginsRoot(), id, version);
}

export async function cleanupPluginStaging(): Promise<void> {
  await fs.promises.rm(path.join(pluginsRoot(), ".staging"), {
    recursive: true,
    force: true,
  }).catch(() => {});
}
