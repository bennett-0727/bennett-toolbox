import * as React from "react";

const isElectron = typeof window !== "undefined" && typeof window.require == "function";
const fs = isElectron ? window.require("fs") : null;
const path = isElectron ? window.require("path") : null;
const os = isElectron ? window.require("os") : null;
const electron = isElectron ? window.require("electron") : null;
const shell = electron == null ? undefined : electron.shell;
const ipcRenderer = electron == null ? undefined : electron.ipcRenderer;
function FileSearch() {
  if (!isElectron) {
    return <div className="file-search"><div className="file-search-header"><h1 className="module-title">文件搜索</h1></div><div className="file-search-body"><div className="empty-state"><div className="empty-icon">⚡</div><div className="empty-text">此功能需要在 Electron 应用中运行</div><div className="empty-hint">请运行 <code>npm run electron:dev</code> 或打开打包后的桌面应用</div></div></div></div>;
  }
  const [r, t] = React.useState("");
  const [e, n] = React.useState(os.homedir());
  const [s, i] = React.useState(5);
  const [a, o] = React.useState({
    searching: false,
    progress: "",
    results: [],
    totalScanned: 0,
    error: null
  });
  const [c, u] = React.useState("name");
  const [h, d] = React.useState("asc");
  const f = React.useRef(false);
  const p = React.useRef(null);
  const v = T => T === 0 ? "-" : T < 1024 ? T + " B" : T < 1048576 ? (T / 1024).toFixed(1) + " KB" : T < 1073741824 ? (T / 1048576).toFixed(1) + " MB" : (T / 1073741824).toFixed(2) + " GB";
  const m = T => T.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  const w = T => {
    if (T.isDirectory) {
      return "📁";
    }
    const O = T.extension.toLowerCase();
    return {
      jpg: "🖼️",
      jpeg: "🖼️",
      png: "🖼️",
      gif: "🖼️",
      svg: "🖼️",
      webp: "🖼️",
      ico: "🖼️",
      pdf: "📄",
      doc: "📝",
      docx: "📝",
      xls: "📊",
      xlsx: "📊",
      ppt: "📽️",
      pptx: "📽️",
      txt: "📄",
      md: "📝",
      json: "📋",
      xml: "📋",
      csv: "📊",
      js: "💛",
      ts: "💙",
      jsx: "💛",
      tsx: "💙",
      vue: "💚",
      py: "🐍",
      java: "☕",
      html: "🌐",
      css: "🎨",
      scss: "🎨",
      less: "🎨",
      go: "🐹",
      rs: "🦀",
      rb: "💎",
      php: "🐘",
      swift: "🍎",
      kt: "🟣",
      zip: "📦",
      rar: "📦",
      "7z": "📦",
      tar: "📦",
      gz: "📦",
      exe: "⚙️",
      app: "⚙️",
      dmg: "💿",
      pkg: "📦",
      mp3: "🎵",
      wav: "🎵",
      flac: "🎵",
      aac: "🎵",
      mp4: "🎬",
      avi: "🎬",
      mkv: "🎬",
      mov: "🎬",
      wmv: "🎬",
      sh: "⚡",
      bat: "⚡",
      ps1: "⚡"
    }[O] || "📄";
  };
  const g = React.useCallback(async () => {
    const T = r.trim().toLowerCase();
    if (!T) {
      o(k => ({
        ...k,
        results: [],
        totalScanned: 0
      }));
      return;
    }
    f.current = false;
    o({
      searching: true,
      progress: "正在搜索...",
      results: [],
      totalScanned: 0,
      error: null
    });
    const O = [];
    let _ = 0;
    const M = 500;
    const z = async (k, G) => {
      if (!f.current && !(G > s) && !(O.length >= M)) {
        try {
          const K = fs.readdirSync(k, {
            withFileTypes: true
          });
          for (const $ of K) {
            if (f.current || O.length >= M) {
              break;
            }
            if ($.name.startsWith(".") || ["node_modules", "Library", "System", "$Recycle.Bin", "Windows"].includes($.name)) {
              continue;
            }
            const X = path.join(k, $.name);
            _++;
            if (_ % 100 === 0) {
              o(W => ({
                ...W,
                progress: `已扫描 ${_} 个文件...`,
                totalScanned: _
              }));
            }
            if ($.name.toLowerCase().includes(T)) {
              try {
                const W = fs.statSync(X);
                const B = path.extname($.name).slice(1);
                O.push({
                  name: $.name,
                  path: X,
                  isDirectory: $.isDirectory(),
                  size: $.isDirectory() ? 0 : W.size,
                  modifiedTime: W.mtime,
                  extension: B
                });
                if (O.length % 10 === 0) {
                  o(j => ({
                    ...j,
                    results: [...O]
                  }));
                }
              } catch {}
            }
            if ($.isDirectory()) {
              await z(X, G + 1);
            }
          }
        } catch (error) {
          if (G === 0) {
            throw error;
          }
        }
      }
    };
    try {
      await z(e, 0);
      o({
        searching: false,
        progress: "",
        results: O,
        totalScanned: _,
        error: null
      });
    } catch (k) {
      o({
        searching: false,
        progress: "",
        results: [],
        totalScanned: 0,
        error: k instanceof Error ? `搜索失败：${k.message}` : "搜索失败"
      });
    }
  }, [r, e, s]);
  React.useEffect(() => {
    if (p.current) {
      clearTimeout(p.current);
    }
    if (r.trim()) {
      p.current = setTimeout(() => {
        g();
      }, 300);
    } else {
      o(T => ({
        ...T,
        results: [],
        totalScanned: 0
      }));
    }
    return () => {
      if (p.current) {
        clearTimeout(p.current);
      }
    };
  }, [r, g]);
  const y = React.useCallback(() => {
    f.current = true;
  }, []);
  const x = React.useCallback(T => {
    shell.openPath(T);
  }, []);
  const A = React.useCallback(T => {
    shell.showItemInFolder(T);
  }, []);
  const E = [...a.results].sort((T, O) => {
    let _ = 0;
    switch (c) {
      case "name":
        _ = T.name.localeCompare(O.name);
        break;
      case "size":
        _ = T.size - O.size;
        break;
      case "date":
        _ = T.modifiedTime.getTime() - O.modifiedTime.getTime();
        break;
    }
    if (h === "asc") {
      return _;
    } else {
      return -_;
    }
  });
  const I = T => {
    if (c === T) {
      d(O => O === "asc" ? "desc" : "asc");
    } else {
      u(T);
      d("asc");
    }
  };
  const N = React.useCallback(() => {
    f.current = true;
    t("");
    o({
      searching: false,
      progress: "",
      results: [],
      totalScanned: 0,
      error: null
    });
  }, []);
  const D = React.useCallback(async () => {
    try {
      const T = await ipcRenderer.invoke("select-directory", e);
      if (T) {
        n(T);
      }
    } catch (T) {
      console.error("选择目录失败:", T);
    }
  }, [e]);
  return <div className="file-search"><div className="file-search-header"><h1 className="module-title">文件搜索</h1><div className="header-actions"><button className="btn btn-secondary" onClick={N}><span>🗑️</span>清空</button></div></div><div className="file-search-body"><div className="search-settings"><div className="search-input-wrapper"><span className="search-icon">🔍</span><input type="text" className="search-input" value={r} onChange={T => t(T.target.value)} placeholder="输入文件名搜索..." autoFocus={true} />{a.searching && <button className="stop-btn" onClick={y}>⏹️</button>}</div><div className="search-options"><div className="option-group"><label className="option-label">搜索目录</label><div className="path-selector"><input type="text" className="path-input" value={e} onChange={T => n(T.target.value)} /><button className="btn btn-secondary btn-sm" onClick={D}>📂</button></div></div><div className="option-group"><label className="option-label">搜索深度</label><select className="depth-select" value={s} onChange={T => i(Number(T.target.value))}><option value={3}>3 层</option><option value={5}>5 层</option><option value={10}>10 层</option><option value={20}>20 层</option><option value={100}>无限制</option></select></div></div></div>{a.searching && <div className="search-status"><div className="loading-spinner" /><span>{a.progress}</span><span className="result-count">找到 {a.results.length} 个结果</span></div>}{a.error && <div className="error-box"><span className="error-icon">⚠️</span><span>{a.error}</span></div>}{!a.searching && a.results.length > 0 && <div className="results-stats"><span>共扫描 {a.totalScanned} 个文件，找到 {a.results.length} 个匹配结果</span></div>}{E.length > 0 && <div className="results-section"><div className="results-header"><div className={`header-cell name-cell sortable ${c === "name" ? "active" : ""}`} onClick={() => I("name")}>名称 {c === "name" && (h === "asc" ? "↑" : "↓")}</div><div className={`header-cell size-cell sortable ${c === "size" ? "active" : ""}`} onClick={() => I("size")}>大小 {c === "size" && (h === "asc" ? "↑" : "↓")}</div><div className={`header-cell date-cell sortable ${c === "date" ? "active" : ""}`} onClick={() => I("date")}>修改时间 {c === "date" && (h === "asc" ? "↑" : "↓")}</div><div className="header-cell action-cell">操作</div></div><div className="results-list">{E.map((T, O) => <div className="result-item" onDoubleClick={() => x(T.path)} key={T.path + O}><div className="result-cell name-cell"><span className="file-icon">{w(T)}</span><div className="file-info"><span className="file-name">{T.name}</span><span className="file-path">{T.path}</span></div></div><div className="result-cell size-cell">{T.isDirectory ? "-" : v(T.size)}</div><div className="result-cell date-cell">{m(T.modifiedTime)}</div><div className="result-cell action-cell"><button className="action-btn" onClick={() => x(T.path)} title="打开">📂</button><button className="action-btn" onClick={() => A(T.path)} title="在文件夹中显示">📍</button></div></div>)}</div></div>}{!a.searching && a.results.length === 0 && r && <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">未找到匹配的文件</div><div className="empty-hint">尝试修改搜索关键词或更换搜索目录</div></div>}{!r && <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">输入关键词开始搜索</div><div className="empty-hint">支持模糊匹配，输入即搜</div></div>}</div></div>;
}

export default FileSearch;
