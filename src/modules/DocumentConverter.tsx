import * as React from "react";

const AP = new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "html", "htm", "txt", "csv", "json", "xml", "zip", "epub", "jpg", "jpeg", "png", "gif", "webp", "wav", "mp3"]);
const EP = r => {
  const t = r.split(".").pop();
  if (!t || t === r) {
    return "FILE";
  } else {
    return t.toUpperCase();
  }
};
const CP = r => {
  var e;
  const t = (e = r.split(".").pop()) == null ? undefined : e.toLowerCase();
  return !!t && t !== r && !!AP.has(t);
};
const formatBytes = r => r < 1024 ? `${r} B` : r < 1048576 ? `${(r / 1024).toFixed(1)} KB` : `${(r / 1048576).toFixed(2)} MB`;
const kP = r => `${r.includes(".") ? r.replace(/\.[^.]+$/, "") : r}.md`;
const isElectron = typeof window !== "undefined" && typeof window.require == "function";
const electron = isElectron ? window.require("electron") : null;
const ipcRenderer = electron == null ? undefined : electron.ipcRenderer;
function DocumentConverter() {
  const [r, t] = React.useState(null);
  const [e, n] = React.useState("");
  const [s, i] = React.useState(null);
  const [a, o] = React.useState(false);
  const [c, u] = React.useState(false);
  const [h, d] = React.useState(null);
  const [f, p] = React.useState(null);
  const v = React.useMemo(() => r ? kP(r.name) : "converted.md", [r]);
  const m = React.useCallback(() => {
    n("");
    i(null);
    u(false);
    d(null);
    p(null);
  }, []);
  React.useEffect(() => {
    if (!a) {
      return;
    }
    const N = Date.now();
    const D = window.setInterval(() => {
      const T = Math.floor((Date.now() - N) / 1000);
      p(O => {
        if (!O || O.status !== "running") {
          return O;
        }
        const _ = Math.min(92, O.value + (O.value < 50 ? 6 : 3));
        const M = T < 2 ? "准备读取文件" : T < 8 ? "调用 MarkItDown 转换" : "转换仍在进行，请稍候";
        return {
          ...O,
          value: _,
          label: M
        };
      });
    }, 700);
    return () => window.clearInterval(D);
  }, [a]);
  const w = React.useCallback((N, D, T) => {
    if (!CP(D)) {
      i("暂不支持此文件类型，请选择 PDF、Office、HTML、图片、CSV、JSON、XML 或 ZIP 文件");
      return;
    }
    t({
      path: N,
      name: D,
      size: T,
      extension: EP(D)
    });
    m();
  }, [m]);
  const g = React.useCallback(async () => {
    if (isElectron) {
      try {
        const N = await ipcRenderer.invoke("select-markitdown-file");
        if (!N) {
          return;
        }
        w(N.path, N.name, N.size);
      } catch (N) {
        i(N instanceof Error ? N.message : "选择文件失败");
      }
    }
  }, [m, w]);
  const y = React.useCallback(N => {
    N.preventDefault();
    const D = N.dataTransfer.files[0];
    if (D) {
      if (!D.path) {
        i("无法读取拖入文件路径，请使用“选择文件”按钮");
        return;
      }
      w(D.path, D.name, D.size);
    }
  }, [w]);
  const x = React.useCallback(async () => {
    if (r) {
      o(true);
      i(null);
      n("");
      u(false);
      d(null);
      p({
        value: 8,
        label: "准备转换",
        status: "running"
      });
      try {
        const N = await ipcRenderer.invoke("convert-file-to-markdown", r.path);
        if (!N.success) {
          i(N.error || "转换失败");
          p({
            value: 100,
            label: "转换失败",
            status: "error"
          });
          return;
        }
        n(N.markdown || "");
        d(N.command || null);
        p({
          value: 100,
          label: "转换完成",
          status: "success"
        });
      } catch (N) {
        i(N instanceof Error ? N.message : "转换失败");
        p({
          value: 100,
          label: "转换失败",
          status: "error"
        });
      } finally {
        o(false);
      }
    }
  }, [r]);
  const A = React.useCallback(async () => {
    if (e) {
      await navigator.clipboard.writeText(e);
      u(true);
    }
  }, [e]);
  const E = React.useCallback(() => {
    if (!e) {
      return;
    }
    const N = new Blob([e], {
      type: "text/markdown;charset=utf-8"
    });
    const D = URL.createObjectURL(N);
    const T = document.createElement("a");
    T.download = v;
    T.href = D;
    T.click();
    URL.revokeObjectURL(D);
  }, [e, v]);
  const I = React.useCallback(() => {
    t(null);
    m();
  }, [m]);
  if (isElectron) {
    return <div className="document-converter"><div className="document-converter-header"><h1 className="module-title">文档转 Markdown</h1><div className="header-actions"><button className="btn btn-secondary" onClick={I} disabled={!r && !e}><span>清</span>清空</button><button className="btn btn-secondary" onClick={A} disabled={!e}><span>拷</span>{c ? "已复制" : "复制"}</button><button className="btn btn-primary" onClick={E} disabled={!e}><span>存</span>保存 .md</button></div></div><div className="document-converter-body"><section className={`document-drop-zone ${r ? "has-file" : ""}`} onDrop={y} onDragOver={N => N.preventDefault()} onClick={g}><div className="document-drop-icon">MD</div><div className="document-drop-copy"><div className="document-drop-title">{r ? r.name : "选择或拖入文件"}</div><div className="document-drop-hint">PDF、Office、HTML、图片、CSV、JSON、XML、ZIP 等格式会转换为 Markdown</div></div><button className="btn btn-secondary" type="button" onClick={N => {
            N.stopPropagation();
            g();
          }}>选择文件</button></section>{r && <section className="document-summary"><div className="summary-item"><span className="summary-label">格式</span><span className="summary-value">{r.extension}</span></div><div className="summary-item"><span className="summary-label">大小</span><span className="summary-value">{formatBytes(r.size)}</span></div><div className="summary-item path-item"><span className="summary-label">路径</span><span className="summary-value">{r.path}</span></div><button className="btn btn-primary" onClick={x} disabled={a}>{a ? "转换中..." : "转换为 Markdown"}</button></section>}{f && <section className={`conversion-progress ${f.status}`}><div className="progress-copy"><span className="progress-label">{f.label}</span><span className="progress-value">{f.value}%</span></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.value} aria-label="文档转换进度"><div className="progress-fill" style={{
              width: `${f.value}%`
            }} /></div></section>}{s && <div className="error-box"><span className="error-icon">!</span><pre>{s}</pre></div>}<section className="markdown-output-panel"><div className="panel-header"><span className="panel-title">Markdown 输出</span>{h && <span className="command-badge">via {h}</span>}</div><textarea className="markdown-output" value={e} onChange={N => n(N.target.value)} placeholder="转换结果会显示在这里" spellCheck={false} /></section></div></div>;
  } else {
    return <div className="document-converter"><div className="document-converter-header"><h1 className="module-title">文档转 Markdown</h1></div><div className="document-converter-body"><div className="empty-state"><div className="empty-icon">MD</div><div className="empty-text">此功能需要在 Electron 应用中运行</div><div className="empty-hint">请运行 <code>npm run electron:dev</code> 或打开打包后的桌面应用</div></div></div></div>;
  }
}

export default DocumentConverter;
