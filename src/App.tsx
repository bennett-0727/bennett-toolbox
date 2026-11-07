import * as React from "react";
import Sidebar from "./components/Sidebar";
import type { ModuleInfo } from "./shared/types";
import { applyLanguage, getInitialLanguage, type Language } from "./i18n";
import { applyTheme, getInitialTheme, type Theme } from "./theme";
import Workbench from "./components/Workbench";
import WorkbenchIcon from "./components/WorkbenchIcon";
import PluginHost from "./plugins/PluginHost";
import { usePlugins } from "./plugins/PluginsContext";
import { syncPluginLocale, syncPluginTheme } from "./plugins/runtime";
import { APP_VERSION } from "./shared/version";

const MODULE_ORDER_KEY = "bennett-module-order";

const LEGACY_MODULE_IDS: Record<string, string> = {
  "json-formatter": "bennett.json-formatter",
  "translate-naming": "bennett.translate-naming",
  "image-converter": "bennett.image-converter",
  "image-compressor": "bennett.image-compressor",
  "watermark-removal": "bennett.watermark-removal",
  "pdf-to-images": "bennett.pdf-to-images",
  "video-to-gif": "bennett.video-to-gif",
  "file-search": "bennett.file-search",
  "document-converter": "bennett.document-converter",
  "screenshot-float": "bennett.screenshot-float",
  "color-picker": "bennett.color-picker",
};

function migrateModuleId(id: string): string {
  return LEGACY_MODULE_IDS[id] || id;
}

function loadModuleOrder(): string[] {
  try {
    const saved = localStorage.getItem(MODULE_ORDER_KEY);
    if (saved) {
      const ids = JSON.parse(saved);
      if (Array.isArray(ids)) {
        return ids
          .filter((id): id is string => typeof id === "string")
          .map(migrateModuleId);
      }
    }
  } catch (error) {
    console.error("加载模块顺序失败:", error);
  }
  return [];
}

type UpdateStatus = "idle" | "checking" | "latest" | "available" | "error";

function App() {
  const { snapshot } = usePlugins();
  const [moduleOrder, setModuleOrder] = React.useState<string[]>(loadModuleOrder);
  const [activeModuleId, setActiveModuleId] = React.useState("");
  const [language, setLanguageState] = React.useState<Language>(getInitialLanguage);
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme);
  const [updateStatus, setUpdateStatus] = React.useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = React.useState("");
  const [updateUrl, setUpdateUrl] = React.useState("");

  const pluginModules = React.useMemo<ModuleInfo[]>(
    () =>
      snapshot.installed
        .filter((plugin) => plugin.enabled)
        .slice()
        .sort((left, right) => (left.manifest.order ?? 1000) - (right.manifest.order ?? 1000))
        .map((plugin) => ({
          id: plugin.manifest.id,
          name: plugin.manifest.name[language],
          icon: plugin.manifest.icon,
          source: "plugin" as const,
          version: plugin.manifest.version,
        })),
    [snapshot.installed, language],
  );

  const modules = React.useMemo(() => {
    const byId = new Map(pluginModules.map((module) => [module.id, module]));
    return moduleOrder
      .map((id) => byId.get(id))
      .filter((module): module is ModuleInfo => Boolean(module));
  }, [moduleOrder, pluginModules]);

  React.useEffect(() => {
    if (pluginModules.length === 0) return;
    setModuleOrder((previous) => {
      const next = [...previous];
      for (const module of pluginModules) {
        if (!next.includes(module.id)) next.push(module.id);
      }
      return next.length === previous.length && next.every((id, index) => id === previous[index])
        ? previous
        : next;
    });
  }, [pluginModules]);

  React.useEffect(() => {
    if (activeModuleId && !modules.some((module) => module.id === activeModuleId)) {
      setActiveModuleId("");
    }
  }, [modules, activeModuleId]);

  React.useEffect(() => {
    try {
      localStorage.setItem(MODULE_ORDER_KEY, JSON.stringify(moduleOrder));
    } catch {}
  }, [moduleOrder]);

  const checkUpdates = React.useCallback(async (manual: boolean) => {
    if (typeof window === "undefined" || typeof window.require !== "function") return;
    setUpdateStatus("checking");
    try {
      const result = await window.require("electron").ipcRenderer.invoke("check-updates");
      if (result?.hasUpdate) {
        setUpdateVersion(result.latestVersion || "");
        setUpdateUrl(result.url || "");
        setUpdateStatus("available");
      } else {
        setUpdateStatus(manual ? "latest" : "idle");
      }
    } catch {
      setUpdateStatus(manual ? "error" : "idle");
    }
  }, []);

  React.useEffect(() => {
    checkUpdates(false);
  }, [checkUpdates]);

  const dismissUpdate = React.useCallback(() => setUpdateStatus("idle"), []);
  const openUpdate = React.useCallback(() => {
    if (updateUrl && typeof window !== "undefined" && typeof window.require === "function") {
      window.require("electron").ipcRenderer.invoke("open-external", updateUrl);
    }
  }, [updateUrl]);

  React.useEffect(() => {
    applyLanguage(language);
  }, [language]);

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    syncPluginLocale(language);
  }, [language]);

  React.useEffect(() => {
    syncPluginTheme(theme);
  }, [theme]);

  const handleThemeChange = React.useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const handleLanguageChange = React.useCallback((next: Language) => {
    applyLanguage(next);
    setLanguageState(next);
  }, []);

  const handleReorder = React.useCallback((from: number, to: number) => {
    setModuleOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      try {
        localStorage.setItem(MODULE_ORDER_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const activePlugin = snapshot.installed.find(
    (plugin) => plugin.enabled && plugin.manifest.id === activeModuleId,
  );

  return (
    <div className="app">
      <Sidebar
        modules={modules}
        activeModule={activeModuleId}
        onModuleSelect={setActiveModuleId}
        onModuleReorder={handleReorder}
        onOpenWorkbench={() => setActiveModuleId("")}
        updateStatus={updateStatus}
        onCheckUpdates={() => checkUpdates(true)}
      />
      <main className="main-content" key={language}>
        <div className="canvas-topbar">
          <div className="canvas-breadcrumb">
            <span className="canvas-breadcrumb-icon">
              {activePlugin ? activePlugin.manifest.icon : <WorkbenchIcon size={13} />}
            </span>
            <span>{activePlugin ? activePlugin.manifest.name[language] : "工作台"}</span>
          </div>
        </div>
        <div className="canvas-content">
          {updateStatus !== "idle" && updateStatus !== "checking" && (
            <div className={`update-banner ${updateStatus}`}>
              <span className="update-message">
                {updateStatus === "available"
                  ? `发现新版本 v${updateVersion}`
                  : updateStatus === "latest"
                    ? "已是最新版本"
                    : "检查更新失败"}
              </span>
              {updateStatus === "available" && (
                <button className="btn btn-primary btn-sm" onClick={openUpdate}>
                  前往下载
                </button>
              )}
              <button className="update-close" onClick={dismissUpdate} aria-label="关闭">
                ×
              </button>
            </div>
          )}
          <div className="main-module">
            {activePlugin ? (
              <PluginHost plugin={activePlugin} language={language} theme={theme} />
            ) : (
              <Workbench
                language={language}
                theme={theme}
                updateStatus={updateStatus}
                updateVersion={updateVersion}
                onLanguageChange={handleLanguageChange}
                onThemeChange={handleThemeChange}
                onCheckUpdates={() => checkUpdates(true)}
                onOpenUpdate={openUpdate}
                onOpenPlugin={setActiveModuleId}
              />
            )}
          </div>
        </div>
        <div className="canvas-statusbar">
          <span>{modules.length} 个工具</span>
          <span>插件按需加载</span>
          <span>v{APP_VERSION}</span>
        </div>
      </main>
    </div>
  );
}

export default App;
