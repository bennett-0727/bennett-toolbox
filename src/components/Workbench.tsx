import * as React from "react";
import type { Language } from "../i18n";
import type { Theme } from "../theme";
import PluginManagerCard from "./PluginManagerCard";
import SettingsPage from "./SettingsPage";

interface WorkbenchProps {
  language: Language;
  theme: Theme;
  updateStatus: string;
  updateVersion: string;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onCheckUpdates: () => void;
  onOpenUpdate: () => void;
  onOpenPlugin: (id: string) => void;
}

function Workbench({
  language,
  theme,
  updateStatus,
  updateVersion,
  onLanguageChange,
  onThemeChange,
  onCheckUpdates,
  onOpenUpdate,
  onOpenPlugin,
}: WorkbenchProps) {
  return (
    <div className="workbench-page">
      <div className="settings-card workbench-card">
        <div className="settings-card-head workbench-head">
          <div>
            <h1 className="module-title">工作台</h1>
            <p>管理、安装并打开工具。插件默认按需加载，打开后才运行。</p>
          </div>
        </div>
        <PluginManagerCard language={language} onOpenPlugin={onOpenPlugin} />
      </div>

      <div className="workbench-settings-section">
        <div className="workbench-section-head">
          <h2>设置</h2>
          <p>外观、语言与版本更新</p>
        </div>
        <SettingsPage
          embedded
          language={language}
          theme={theme}
          updateStatus={updateStatus}
          updateVersion={updateVersion}
          onLanguageChange={onLanguageChange}
          onThemeChange={onThemeChange}
          onCheckUpdates={onCheckUpdates}
          onOpenUpdate={onOpenUpdate}
        />
      </div>
    </div>
  );
}

export default Workbench;
