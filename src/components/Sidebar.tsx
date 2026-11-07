import * as React from "react";
import { APP_VERSION } from "../shared/version";
import WorkbenchIcon from "./WorkbenchIcon";
import type { ModuleInfo } from "../shared/types";

interface SidebarProps {
  modules: ModuleInfo[];
  activeModule: string;
  onModuleSelect: (id: string) => void;
  onModuleReorder: (from: number, to: number) => void;
  onOpenWorkbench: () => void;
  updateStatus: string;
  onCheckUpdates: () => void;
}

function Sidebar({ modules, activeModule, onModuleSelect, onModuleReorder, onOpenWorkbench, updateStatus, onCheckUpdates }: SidebarProps) {
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
        <button
          type="button"
          className={`workbench-nav ${activeModule === "" ? "active" : ""}`}
          onClick={onOpenWorkbench}
        >
          <span className="workbench-nav-icon">
            <WorkbenchIcon />
          </span>
          <span>工作台</span>
        </button>
        <div className="nav-section">
          <span className="nav-section-title">
            工具 {modules.length > 0 && <span className="drag-hint">可拖拽排序</span>}
          </span>
          {modules.length === 0 ? (
            <div className="nav-empty">暂无工具</div>
          ) : (
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
                  className={`nav-item ${activeModule === module.id ? "active" : ""}`}
                  onClick={() => onModuleSelect(module.id)}
                >
                  <span className="drag-handle">⋮⋮</span>
                  <span className="nav-icon">{module.icon}</span>
                  <span className="nav-label">{module.name}</span>
                </button>
              </li>
            ))}
          </ul>
          )}
        </div>
      </nav>
      <div className="sidebar-footer">
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
