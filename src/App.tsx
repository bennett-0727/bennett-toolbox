import * as React from "react";
import Sidebar from "./components/Sidebar";
import type { ModuleInfo } from "./shared/types";
import { applyLanguage, getInitialLanguage, type Language } from "./i18n";
import { applyTheme, getInitialTheme, type Theme } from "./theme";
import SettingsPage from "./components/SettingsPage";
import PluginHost from "./plugins/PluginHost";
import { usePlugins } from "./plugins/PluginsContext";
import { syncPluginLocale, syncPluginTheme } from "./plugins/runtime";
import JsonFormatter from "./modules/JsonFormatter";
import NamingConverter from "./modules/NamingConverter";
import ImageConverter from "./modules/ImageConverter";
import ImageCompressor from "./modules/ImageCompressor";
import WatermarkRemoval from "./modules/WatermarkRemoval";
import PdfToImages from "./modules/PdfToImages";
import VideoToGif from "./modules/VideoToGif";
import FileSearch from "./modules/FileSearch";
import DocumentConverter from "./modules/DocumentConverter";
import ScreenshotFloat from "./modules/ScreenshotFloat";
import ColorPicker from "./modules/ColorPicker";

const MODULES: ModuleInfo[] = [
  { id: "json-formatter", name: "JSON 格式化", icon: "{ }", source: "builtin" },
  { id: "translate-naming", name: "变量命名", icon: "Aa" },
  { id: "image-converter", name: "图片转换", icon: "🖼️" },
  { id: "image-compressor", name: "图片压缩", icon: "ZIP" },
  { id: "watermark-removal", name: "图片去水印", icon: "WM" },
  { id: "pdf-to-images", name: "PDF 转图片", icon: "PDF" },
  { id: "video-to-gif", name: "视频转 GIF", icon: "GIF" },
  { id: "file-search", name: "文件搜索", icon: "🔍" },
  { id: "document-converter", name: "文档转 MD", icon: "MD" },
  { id: "screenshot-float", name: "截图悬浮", icon: "📌" },
  { id: "color-picker", name: "屏幕取色", icon: "🎨" },
];

const MODULE_ORDER_KEY = "bennett-module-order";

function loadModuleOrder(): string[] {
  const builtinIds = MODULES.map((module) => module.id);
  try {
    const saved = localStorage.getItem(MODULE_ORDER_KEY);
    if (saved) {
      const savedIds = JSON.parse(saved);
      if (Array.isArray(savedIds)) {
        const ordered = savedIds.filter((id): id is string => typeof id === "string");
        return [...ordered, ...builtinIds.filter((id) => !ordered.includes(id))];
      }
    }
  } catch (error) {
    console.error("加载模块顺序失败:", error);
  }
  return builtinIds;
}

type UpdateStatus = "idle" | "checking" | "latest" | "available" | "error";

function App() {
  const { snapshot } = usePlugins();
  const [moduleOrder, setModuleOrder] = React.useState<string[]>(loadModuleOrder);
  const [activeModuleId, setActiveModuleId] = React.useState("json-formatter");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [language, setLanguageState] = React.useState<Language>(getInitialLanguage);
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme);
  const [updateStatus, setUpdateStatus] = React.useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = React.useState("");
  const [updateUrl, setUpdateUrl] = React.useState("");

  const pluginModules = React.useMemo<ModuleInfo[]>(
    () =>
      snapshot.installed
        .filter((plugin) => plugin.enabled)
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
    const byId = new Map<string, ModuleInfo>();
    for (const module of MODULES) byId.set(module.id, module);
    for (const module of pluginModules) byId.set(module.id, module);
    return moduleOrder
      .map((id) => byId.get(id))
      .filter((module): module is ModuleInfo => Boolean(module));
  }, [moduleOrder, pluginModules]);

  React.useEffect(() => {
    setModuleOrder((previous) => {
      const builtinIds = MODULES.map((module) => module.id);
      const known = new Set([...builtinIds, ...pluginModules.map((module) => module.id)]);
      const next = previous.filter((id) => known.has(id));
      for (const module of pluginModules) {
        if (!next.includes(module.id)) next.push(module.id);
      }
      for (const id of builtinIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next.length === previous.length && next.every((id, index) => id === previous[index])
        ? previous
        : next;
    });
  }, [pluginModules]);

  React.useEffect(() => {
    if (!modules.some((module) => module.id === activeModuleId)) {
      setActiveModuleId(modules[0]?.id || "json-formatter");
    }
  }, [modules, activeModuleId]);

  const checkUpdates = React.useCallback(async (manual: boolean) => {
    if (typeof window === "undefined" || typeof window.require !== "function") return;
    setUpdateStatus("checking");
    try {
      const result = await window
        .require("electron")
        .ipcRenderer.invoke("check-updates");
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

  React.useEffect(() => {
    localStorage.setItem(MODULE_ORDER_KEY, JSON.stringify(moduleOrder));
  }, [moduleOrder]);

  const handleReorder = React.useCallback((from: number, to: number) => {
    setModuleOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const renderActiveModule = () => {
    switch (activeModuleId) {
      case "json-formatter":
        return <JsonFormatter />;
      case "translate-naming":
        return <NamingConverter />;
      case "image-converter":
        return <ImageConverter />;
      case "image-compressor":
        return <ImageCompressor />;
      case "watermark-removal":
        return <WatermarkRemoval />;
      case "pdf-to-images":
        return <PdfToImages />;
      case "video-to-gif":
        return <VideoToGif />;
      case "file-search":
        return <FileSearch />;
      case "document-converter":
        return <DocumentConverter />;
      case "screenshot-float":
        return <ScreenshotFloat />;
      case "color-picker":
        return <ColorPicker />;
      default: {
        const plugin = snapshot.installed.find(
          (item) => item.enabled && item.manifest.id === activeModuleId,
        );
        return plugin ? (
          <PluginHost plugin={plugin} language={language} theme={theme} />
        ) : (
          <div className="empty-state">请选择一个工具</div>
        );
      }
    }
  };

  return (
    <div className="app">
      <Sidebar
        modules={modules}
        activeModule={activeModuleId}
        settingsOpen={settingsOpen}
        onModuleSelect={(id) => {
          setActiveModuleId(id);
          setSettingsOpen(false);
        }}
        onModuleReorder={handleReorder}
        onOpenSettings={() => setSettingsOpen(true)}
        updateStatus={updateStatus}
        onCheckUpdates={() => checkUpdates(true)}
      />
      <main className="main-content" key={language}>
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
          {settingsOpen ? (
            <SettingsPage
              language={language}
              theme={theme}
              updateStatus={updateStatus}
              updateVersion={updateVersion}
              onLanguageChange={handleLanguageChange}
              onThemeChange={handleThemeChange}
              onCheckUpdates={() => checkUpdates(true)}
              onOpenUpdate={openUpdate}
              onClose={() => setSettingsOpen(false)}
            />
          ) : (
            renderActiveModule()
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
