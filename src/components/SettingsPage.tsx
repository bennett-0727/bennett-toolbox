import * as React from "react";
import { LANGUAGES, type Language } from "../i18n";
import type { Theme } from "../theme";
import { APP_VERSION } from "../shared/version";

interface SettingsPageProps {
  language: Language;
  theme: Theme;
  updateStatus: string;
  updateVersion: string;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onCheckUpdates: () => void;
  onOpenUpdate: () => void;
  onClose: () => void;
}

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: "glass-dark", label: "深色玻璃" },
  { value: "glass-light", label: "浅色玻璃" },
  { value: "glass-aurora", label: "极光紫" },
  { value: "glass-ocean", label: "深海青" },
  { value: "glass-sunset", label: "落日橙" },
];

function SettingsPage({
  language,
  theme,
  updateStatus,
  updateVersion,
  onLanguageChange,
  onThemeChange,
  onCheckUpdates,
  onOpenUpdate,
  onClose,
}: SettingsPageProps) {
  const updateText =
    updateStatus === "checking"
      ? "正在检查..."
      : updateStatus === "available"
        ? `发现新版本 v${updateVersion}`
        : updateStatus === "latest"
          ? "已是最新版本"
          : updateStatus === "error"
            ? "检查更新失败"
            : "";

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h1 className="module-title">设置</h1>
        <div className="header-actions">
          <button className="btn btn-secondary settings-back" onClick={onClose}>
            返回
          </button>
        </div>
      </div>

      <div className="settings-page-body">
        <section className="settings-card">
          <div className="settings-card-head">
            <h2>外观</h2>
            <p>选择玻璃主题或彩色皮肤</p>
          </div>
          <div className="theme-options">
            {THEMES.map((item) => (
              <button
                type="button"
                key={item.value}
                data-theme-value={item.value}
                className={`theme-option ${theme === item.value ? "active" : ""}`}
                aria-pressed={theme === item.value}
                onClick={() => onThemeChange(item.value)}
              >
                <span className={`theme-preview ${item.value}`}>
                  <span className="theme-preview-sidebar" />
                  <span className="theme-preview-panel" />
                </span>
                <span className="theme-option-label">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <h2>语言</h2>
            <p>选择界面语言</p>
          </div>
          <div className="language-options">
            {LANGUAGES.map((item) => (
              <button
                type="button"
                key={item.value}
                className={`language-option ${language === item.value ? "active" : ""}`}
                aria-pressed={language === item.value}
                onClick={() => onLanguageChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card updates">
          <div className="settings-card-head">
            <h2>版本与更新</h2>
            <p>从 GitHub Releases 检测新版本</p>
          </div>
          <div className="settings-version-row">
            <span>当前版本</span>
            <strong>v{APP_VERSION}</strong>
          </div>
          <div className="settings-update-row">
            <button className="btn btn-secondary" onClick={onCheckUpdates}>
              检查更新
            </button>
            {updateStatus === "available" ? (
              <button className="btn btn-primary" onClick={onOpenUpdate}>
                前往下载
              </button>
            ) : null}
            <span className={`settings-update-status ${updateStatus}`}>{updateText}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
