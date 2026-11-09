import * as React from "react";
import type { Language } from "../i18n";
import { usePlugins } from "../plugins/PluginsContext";
import type { InstalledPlugin, RegistryPlugin } from "../plugins/types";
import { comparePluginVersions } from "../plugins/version";
import MarkitdownComponentRow from "./MarkitdownComponentRow";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRegistryTime(value: string, language: Language): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function PluginManagerCard({
  language,
  onOpenPlugin,
}: {
  language: Language;
  onOpenPlugin?: (id: string) => void;
}) {
  const {
    snapshot,
    loading,
    error,
    busy,
    progress,
    refresh,
    install,
    installAllRecommended,
    update,
    remove,
    setEnabled,
    setActivation,
    openFolder,
  } = usePlugins();
  const [localError, setLocalError] = React.useState<string | null>(null);
  const registryTime = snapshot.registryUpdatedAt
    ? formatRegistryTime(snapshot.registryUpdatedAt, language)
    : null;

  const latestById = React.useMemo(() => {
    const map = new Map<string, RegistryPlugin>();
    for (const plugin of snapshot.available) {
      const current = map.get(plugin.id);
      if (!current || comparePluginVersions(plugin.version, current.version) > 0) {
        map.set(plugin.id, plugin);
      }
    }
    return map;
  }, [snapshot.available]);

  const installedIds = new Set(snapshot.installed.map((plugin) => plugin.manifest.id));
  const available = [...latestById.values()].filter((plugin) => !installedIds.has(plugin.id));
  const recommended = available.filter((plugin) => plugin.recommended);
  const disabled = Boolean(busy) || loading;

  const run = (operation: () => Promise<void>) => {
    setLocalError(null);
    void operation().catch((reason) => {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    });
  };

  const renderInstalled = (plugin: InstalledPlugin) => {
    const manifest = plugin.manifest;
    const latest = latestById.get(manifest.id);
    const canUpdate = latest && comparePluginVersions(latest.version, manifest.version) > 0;
    const activeProgress = progress[manifest.id];
    return (
      <div className="plugin-row" key={manifest.id}>
        <span className="plugin-icon">{manifest.icon}</span>
        <div className="plugin-info">
          <span className="plugin-name">{manifest.name[language]}</span>
          <span className="plugin-meta">
            v{manifest.version}
            <span className="plugin-meta-sep">·</span>
            {plugin.enabled ? "已启用" : "已停用"}
            <span className="plugin-meta-sep">·</span>
            {plugin.activation === "resident" ? "常驻" : "按需"}
          </span>
          {activeProgress && (
            <span className="plugin-progress">
              安装中 {activeProgress.percent}%
            </span>
          )}
        </div>
        <div className="plugin-actions">
          {onOpenPlugin && plugin.enabled && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onOpenPlugin(manifest.id)}
            >
              打开
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            aria-pressed={plugin.enabled}
            disabled={disabled}
            onClick={() => run(() => setEnabled(manifest.id, !plugin.enabled))}
          >
            {plugin.enabled ? "停用" : "启用"}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={disabled}
            onClick={() =>
              run(() =>
                setActivation(manifest.id, plugin.activation === "resident" ? "on-demand" : "resident"),
              )
            }
          >
            {plugin.activation === "resident" ? "改为按需" : "设为常驻"}
          </button>
          {canUpdate && (
            <button
              className="btn btn-primary btn-sm"
              disabled={disabled}
              onClick={() => run(() => update(manifest.id))}
            >
              更新 v{latest.version}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            disabled={disabled}
            onClick={() => run(() => remove(manifest.id))}
          >
            卸载
          </button>
        </div>
      </div>
    );
  };

  const renderAvailable = (plugin: RegistryPlugin) => (
    <div className="plugin-row" key={plugin.id}>
      <span className="plugin-icon">{plugin.icon}</span>
      <div className="plugin-info">
        <span className="plugin-name">{plugin.name[language]}</span>
        <span className="plugin-meta">
          v{plugin.version}
          <span className="plugin-meta-sep">·</span>
          {formatSize(plugin.size)}
          <span className="plugin-meta-sep">·</span>
          {plugin.activation === "resident" ? "常驻" : "按需"}
        </span>
        <span className="plugin-description">{plugin.description[language]}</span>
      </div>
      <div className="plugin-actions">
        {progress[plugin.id] ? (
          <span className="plugin-progress">安装中 {progress[plugin.id].percent}%</span>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            disabled={disabled}
            onClick={() => run(() => install(plugin.id))}
          >
            安装
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-toolbar">
        <span className="plugin-registry-time">
          {registryTime ? `更新于 ${registryTime}` : "尚未刷新"}
        </span>
        {recommended.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            disabled={disabled}
            onClick={() => run(installAllRecommended)}
          >
            安装全部推荐工具
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          disabled={disabled}
          onClick={() => run(refresh)}
        >
          刷新插件列表
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() =>
            run(async () => {
              await openFolder();
            })
          }
        >
          打开插件目录
        </button>
      </div>

      {error && <div className="plugin-error"><span>{error}</span></div>}
      {localError && <div className="plugin-error"><span>{localError}</span></div>}
      {loading && <div className="plugin-loading">正在加载插件列表...</div>}

      <div className="plugin-group-title">已安装</div>
      {snapshot.installed.length === 0 ? (
        <div className="plugin-empty">暂无已安装插件</div>
      ) : (
        snapshot.installed.map(renderInstalled)
      )}

      <div className="plugin-group-title">可安装</div>
      {available.length === 0 ? (
        <div className="plugin-empty">暂无可用插件</div>
      ) : (
        available.map(renderAvailable)
      )}

      <div className="plugin-group-title">组件</div>
      <MarkitdownComponentRow />
    </div>
  );
}

export default PluginManagerCard;
