import * as React from "react";
import { APP_VERSION } from "../shared/version";
import type { ModuleInfo } from "../shared/types";

interface SidebarProps {
  modules: ModuleInfo[];
  activeModule: string;
  settingsOpen: boolean;
  onModuleSelect: (id: string) => void;
  onModuleReorder: (from: number, to: number) => void;
  onOpenSettings: () => void;
  updateStatus: string;
  onCheckUpdates: () => void;
}

function Sidebar({ modules, activeModule, settingsOpen, onModuleSelect, onModuleReorder, onOpenSettings, updateStatus, onCheckUpdates }: SidebarProps) {
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const draggedItemRef = React.useRef<HTMLElement | null>(null);

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>, index: number) => {
    setDraggingIndex(index);
    draggedItemRef.current = event.currentTarget;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", index.toString());
    setTimeout(() => {
      draggedItemRef.current?.classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = () => {
    draggedItemRef.current?.classList.remove("dragging");
    setDraggingIndex(null);
    setDragOverIndex(null);
    draggedItemRef.current = null;
  };

  const handleDragOver = (event: React.DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingIndex !== null && draggingIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();
    if (draggingIndex !== null && draggingIndex !== index) {
      onModuleReorder(draggingIndex, index);
      setDraggingIndex(null);
      setDragOverIndex(null);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">工具箱</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">
            工具 <span className="drag-hint">可拖拽排序</span>
          </span>
          <ul className="nav-list">
            {modules.map((module, index) => (
              <li
                draggable={true}
                onDragStart={(event) => handleDragStart(event, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, index)}
                className={`nav-item-wrapper ${dragOverIndex === index ? "drag-over" : ""} ${
                  draggingIndex === index ? "is-dragging" : ""
                }`}
                key={module.id}
              >
                <button
                  className={`nav-item ${activeModule === module.id && !settingsOpen ? "active" : ""}`}
                  onClick={() => onModuleSelect(module.id)}
                >
                  <span className="drag-handle">⋮⋮</span>
                  <span className="nav-icon">{module.icon}</span>
                  <span className="nav-label">{module.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className={`settings-button ${settingsOpen ? "active" : ""}`}
          onClick={onOpenSettings}
          title="设置"
          aria-pressed={settingsOpen}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
          <span>设置</span>
        </button>
        <button
          className={`version version-button ${updateStatus === "available" ? "has-update" : ""}`}
          onClick={onCheckUpdates}
          title="检查更新"
        >
          v{APP_VERSION}
          {updateStatus === "available" && <span className="update-dot" />}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
