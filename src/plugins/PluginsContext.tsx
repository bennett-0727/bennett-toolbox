import * as React from "react";
import {
  installPlugin,
  listPlugins,
  onInstallProgress,
  onPluginsChanged,
  openPluginsFolder,
  refreshRegistry,
  removePlugin,
  setPluginActivation,
  setPluginEnabled,
  updatePlugin,
  type PluginInstallProgress,
} from "./client";
import { activatePlugin, disposePlugin } from "./runtime";
import type { PluginSnapshot } from "./types";

interface PluginsContextValue {
  snapshot: PluginSnapshot;
  loading: boolean;
  error: string | null;
  busy: string | null;
  progress: Record<string, PluginInstallProgress>;
  refresh: () => Promise<void>;
  install: (id: string) => Promise<void>;
  installAllRecommended: () => Promise<void>;
  update: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  setActivation: (id: string, activation: "on-demand" | "resident") => Promise<void>;
  openFolder: () => Promise<void>;
}

const EMPTY_SNAPSHOT: PluginSnapshot = {
  installed: [],
  available: [],
  registryUpdatedAt: null,
};

const PluginsContext = React.createContext<PluginsContextValue | null>(null);

export function PluginsProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<PluginSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<Record<string, PluginInstallProgress>>({});
  const previousInstalled = React.useRef<Map<string, string>>(new Map());

  const applySnapshot = React.useCallback((next: PluginSnapshot) => {
    setSnapshot(next);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    listPlugins()
      .then((next) => {
        if (!cancelled) applySnapshot(next);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const removeChanged = onPluginsChanged(applySnapshot);
    const removeProgress = onInstallProgress((event) => {
      setProgress((current) => {
        if (event.phase === "done") {
          const next = { ...current };
          delete next[event.id];
          return next;
        }
        return { ...current, [event.id]: event };
      });
    });
    return () => {
      cancelled = true;
      removeChanged();
      removeProgress();
    };
  }, [applySnapshot]);

  React.useEffect(() => {
    const current = new Map<string, string>();
    for (const plugin of snapshot.installed) {
      if (!plugin.enabled) continue;
      current.set(plugin.manifest.id, plugin.manifest.version);
    }
    for (const [id, version] of previousInstalled.current) {
      if (!current.has(id) || current.get(id) !== version) {
        void disposePlugin(id);
      }
    }
    previousInstalled.current = current;
    for (const plugin of snapshot.installed) {
      if (plugin.enabled && plugin.activation === "resident") {
        void activatePlugin(plugin.manifest).catch((reason) => {
          console.error(`[plugin:${plugin.manifest.id}] 常驻加载失败`, reason);
        });
      }
    }
  }, [snapshot.installed]);

  const run = React.useCallback(
    async (id: string, operation: () => Promise<PluginSnapshot>) => {
      setBusy(id);
      setError(null);
      try {
        applySnapshot(await operation());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
        throw reason;
      } finally {
        setBusy(null);
      }
    },
    [applySnapshot],
  );

  const value = React.useMemo<PluginsContextValue>(
    () => ({
      snapshot,
      loading,
      error,
      busy,
      progress,
      refresh: async () => run("registry", refreshRegistry),
      install: async (id) => run(id, () => installPlugin(id)),
      installAllRecommended: async () => {
        const targets = snapshot.available
          .filter(
            (plugin) =>
              plugin.recommended &&
              !snapshot.installed.some((installed) => installed.manifest.id === plugin.id),
          )
          .slice()
          .sort((left, right) => (left.order ?? 1000) - (right.order ?? 1000));
        if (targets.length === 0) return;
        setBusy("all");
        setError(null);
        try {
          for (const plugin of targets) {
            applySnapshot(await installPlugin(plugin.id));
          }
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason));
          throw reason;
        } finally {
          setBusy(null);
        }
      },
      update: async (id) => run(id, () => updatePlugin(id)),
      remove: async (id) => run(id, () => removePlugin(id)),
      setEnabled: async (id, enabled) => run(id, () => setPluginEnabled(id, enabled)),
      setActivation: async (id, activation) =>
        run(id, () => setPluginActivation(id, activation)),
      openFolder: openPluginsFolder,
    }),
    [snapshot, loading, error, busy, progress, run],
  );

  return <PluginsContext.Provider value={value}>{children}</PluginsContext.Provider>;
}

export function usePlugins(): PluginsContextValue {
  const value = React.useContext(PluginsContext);
  if (!value) throw new Error("usePlugins must be used inside PluginsProvider");
  return value;
}
