import * as React from "react";
import { APP_VERSION } from "../shared/version";
import type { ModuleInfo } from "../shared/types";

interface SidebarProps {
  modules: ModuleInfo[];
  activeModule: string;
  onModuleSelect: (id: string) => void;
  onModuleReorder: (from: number, to: number) => void;
}

function Sidebar({ modules, activeModule, onModuleSelect, onModuleReorder }: SidebarProps) {
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
        </div>
      </nav>
      <div className="sidebar-footer">
        <span className="version">v{APP_VERSION}</span>
      </div>
    </aside>
  );
}

export default Sidebar;
