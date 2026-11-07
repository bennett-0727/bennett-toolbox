import * as React from "react";
import type { InstalledPlugin } from "./types";
import { mountPlugin } from "./runtime";
import PluginErrorBoundary from "./PluginErrorBoundary";

interface PluginHostProps {
  plugin: InstalledPlugin;
  language: "zh-CN" | "en-US";
  theme: string;
}

function PluginHost({ plugin, language, theme }: PluginHostProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retry, setRetry] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => Promise<void>) | null = null;
    setLoading(true);
    setError(null);
    mountPlugin(plugin.manifest, container, language, theme)
      .then((dispose) => {
        if (cancelled) {
          void dispose();
          return;
        }
        cleanup = dispose;
        setLoading(false);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (cleanup) void cleanup();
    };
  }, [
    plugin.manifest.id,
    plugin.manifest.version,
    plugin.manifest.main,
    language,
    retry,
  ]);

  return (
    <PluginErrorBoundary key={`${plugin.manifest.id}@${plugin.manifest.version}`} pluginId={plugin.manifest.id}>
      <div className="plugin-host-wrapper">
        {loading && <div className="plugin-loading">正在加载插件...</div>}
        {error && (
          <div className="plugin-error">
            <strong>插件加载失败</strong>
            <span>{error}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setRetry((value) => value + 1)}>
              重试
            </button>
          </div>
        )}
        <div ref={containerRef} className="plugin-host" />
      </div>
    </PluginErrorBoundary>
  );
}

export default PluginHost;
