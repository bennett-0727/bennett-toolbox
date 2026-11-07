import * as React from "react";

const isElectron = typeof window !== "undefined" && typeof window.require == "function";
const electron = isElectron ? window.require("electron") : null;
const ipcRenderer = electron == null ? undefined : electron.ipcRenderer;
function ScreenshotFloat() {
  const [r, t] = React.useState([]);
  const [e, n] = React.useState(false);
  const [s, i] = React.useState("");
  const [a, o] = React.useState([]);
  const [c, u] = React.useState(null);
  const [h, d] = React.useState(false);
  const [f, p] = React.useState(null);
  const [v, m] = React.useState(null);
  const [w, g] = React.useState("unknown");
  const [y, x] = React.useState(null);
  const A = React.useRef(null);
  const E = React.useRef(null);
  if (!isElectron) {
    return <div className="screenshot-float"><div className="screenshot-float-header"><h1 className="module-title">截图悬浮</h1></div><div className="screenshot-float-body"><div className="empty-state"><div className="empty-icon">⚡</div><div className="empty-text">此功能需要在 Electron 应用中运行</div><div className="empty-hint">请运行 <code>npm run electron:dev</code> 或打开打包后的桌面应用</div></div></div></div>;
  }
  const I = React.useCallback(async () => {
    try {
      const L = await ipcRenderer.invoke("check-screen-permission");
      g(L);
      return L === "granted";
    } catch (L) {
      console.error("检查权限失败:", L);
      return false;
    }
  }, []);
  const N = React.useCallback(async () => {
    x(null);
    try {
      await I();
      const L = await ipcRenderer.invoke("get-desktop-sources");
      if (L.length === 0) {
        x("未找到可用的屏幕源。请确保已授予屏幕录制权限。");
      } else {
        o(L);
        if (!s && L.length > 0) {
          i(L[0].id);
        }
      }
    } catch (L) {
      console.error("获取屏幕源失败:", L);
      x("获取屏幕源失败，请检查权限设置。");
    }
  }, [s, I]);
  React.useEffect(() => {
    N();
    const L = (W, B) => {
      if (B.success) {
        const j = {
          id: Date.now().toString(),
          dataUrl: B.dataUrl,
          timestamp: new Date(),
          width: B.width,
          height: B.height
        };
        t(H => [j, ...H]);
      }
    };
    ipcRenderer.on("capture-result", L);
    return () => {
      ipcRenderer.removeListener("capture-result", L);
    };
  }, []);
  const D = React.useCallback(async () => {
    x(null);
    try {
      const L = await ipcRenderer.invoke("start-capture-selection");
      if (!L.success) {
        x(L.error || "框选截图失败");
      }
    } catch (L) {
      console.error("框选截图失败:", L);
      x(`框选截图失败: ${L.message || "未知错误"}`);
    }
  }, []);
  const T = React.useCallback(async () => {
    if (!s) {
      x("请先选择一个截图源");
      return;
    }
    n(true);
    x(null);
    try {
      const L = a.find(Q => Q.id === s);
      if (!L) {
        x("未找到选定的截图源");
        return;
      }
      const W = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: L.id
          }
        } as any
      });
      const B = document.createElement("video");
      B.srcObject = W;
      await B.play();
      await new Promise(Q => setTimeout(Q, 100));
      const j = document.createElement("canvas");
      j.width = B.videoWidth;
      j.height = B.videoHeight;
      j.getContext("2d").drawImage(B, 0, 0);
      W.getTracks().forEach(Q => Q.stop());
      const Y = j.toDataURL("image/png");
      u(Y);
      d(true);
    } catch (L) {
      console.error("截图失败:", L);
      if (L.name === "NotAllowedError") {
        x("屏幕录制权限被拒绝。请在 系统偏好设置 > 安全性与隐私 > 隐私 > 屏幕录制 中授予权限。");
      } else {
        x(`截图失败: ${L.message || "未知错误"}`);
      }
    } finally {
      n(false);
    }
  }, [s, a]);
  const O = React.useCallback(L => {
    if (!h || !A.current) {
      return;
    }
    const W = A.current.getBoundingClientRect();
    const B = L.clientX - W.left;
    const j = L.clientY - W.top;
    p({
      x: B,
      y: j
    });
    m({
      x: B,
      y: j
    });
  }, [h]);
  const _ = React.useCallback(L => {
    if (!f || !A.current) {
      return;
    }
    const W = A.current.getBoundingClientRect();
    const B = Math.max(0, Math.min(L.clientX - W.left, W.width));
    const j = Math.max(0, Math.min(L.clientY - W.top, W.height));
    m({
      x: B,
      y: j
    });
  }, [f]);
  const M = React.useCallback(() => {
    if (!f || !v || !c || !A.current) {
      p(null);
      m(null);
      return;
    }
    const L = A.current.getBoundingClientRect();
    const W = A.current;
    const B = W.naturalWidth / L.width;
    const j = W.naturalHeight / L.height;
    const H = Math.min(f.x, v.x) * B;
    const Y = Math.min(f.y, v.y) * j;
    const Q = Math.max(f.x, v.x) * B;
    const q = Math.max(f.y, v.y) * j;
    const Z = Q - H;
    const rt = q - Y;
    if (Z < 10 || rt < 10) {
      p(null);
      m(null);
      return;
    }
    const at = document.createElement("canvas");
    at.width = Z;
    at.height = rt;
    const wt = at.getContext("2d");
    const ct = new Image();
    ct.onload = () => {
      wt.drawImage(ct, H, Y, Z, rt, 0, 0, Z, rt);
      const xt = at.toDataURL("image/png");
      const Tt = {
        id: Date.now().toString(),
        dataUrl: xt,
        timestamp: new Date(),
        width: Z,
        height: rt
      };
      t(R => [Tt, ...R]);
      u(null);
      d(false);
      p(null);
      m(null);
    };
    ct.src = c;
  }, [f, v, c]);
  const z = React.useCallback(() => {
    u(null);
    d(false);
    p(null);
    m(null);
  }, []);
  const k = React.useCallback(L => {
    ipcRenderer.invoke("create-floating-window", {
      id: L.id,
      dataUrl: L.dataUrl,
      width: Math.min(L.width, 400),
      height: Math.min(L.height, 300)
    });
  }, []);
  const G = React.useCallback(L => {
    t(W => W.filter(B => B.id !== L));
  }, []);
  const K = React.useCallback(async L => {
    try {
      const W = await ipcRenderer.invoke("copy-image-to-clipboard", L);
      if (!W) {
        throw new Error("复制失败");
      }
    } catch (W) {
      console.error("复制失败:", W);
    }
  }, []);
  const $ = React.useCallback(L => {
    const W = document.createElement("a");
    W.download = `screenshot-${L.id}.png`;
    W.href = L.dataUrl;
    W.click();
  }, []);
  const X = () => {
    if (!f || !v) {
      return {};
    }
    const L = Math.min(f.x, v.x);
    const W = Math.min(f.y, v.y);
    const B = Math.max(f.x, v.x);
    const j = Math.max(f.y, v.y);
    return {
      left: L,
      top: W,
      width: B - L,
      height: j - W
    };
  };
  return <div className="screenshot-float"><div className="screenshot-float-header"><h1 className="module-title">截图悬浮</h1><div className="header-actions"><button className="btn btn-secondary" onClick={N}>🔄 刷新源</button><button className="btn btn-primary" onClick={D}>✂️ 框选截图</button><button className="btn btn-secondary" onClick={T} disabled={e || !s}>{e ? "截取中..." : "📷 截取整屏"}</button></div></div><div className="screenshot-float-body" ref={E}>{w !== "granted" && w !== "unknown" && <div className="permission-warning"><span className="warning-icon">⚠️</span><span>屏幕录制权限状态: {w}{"。请在 系统偏好设置 > 安全性与隐私 > 隐私 > 屏幕录制 中授予权限。"}</span><button className="btn btn-secondary btn-sm permission-settings-btn" onClick={() => ipcRenderer.invoke("open-screen-permission-settings")}>打开系统设置</button></div>}{y && <div className="error-box"><span className="error-icon">❌</span><span>{y}</span></div>}<div className="source-selector"><label className="selector-label">选择截图源：{a.length === 0 && "(点击刷新按钮获取)"}</label><div className="source-list">{a.length === 0 && <div className="no-sources"><span>未找到可用的屏幕源</span><button className="btn btn-secondary btn-sm" onClick={N}>🔄 刷新</button></div>}{a.map(L => <div className={`source-item ${s === L.id ? "active" : ""}`} onClick={() => i(L.id)} key={L.id}><img src={L.thumbnail} alt={L.name} className="source-thumbnail" /><span className="source-name">{L.name}</span></div>)}</div></div>{h && c && <div className="crop-overlay"><div className="crop-container"><div className="crop-header"><span>拖拽选择截图区域</span><button className="btn btn-secondary btn-sm" onClick={z}>取消</button></div><div className="crop-preview-wrapper" onMouseDown={O} onMouseMove={_} onMouseUp={M} onMouseLeave={() => f && M()}><img ref={A} src={c} alt="预览" className="crop-preview-image" draggable={false} />{f && v && <div className="crop-selection" style={X()}><div className="crop-size">{Math.abs(v.x - f.x).toFixed(0)} × {Math.abs(v.y - f.y).toFixed(0)}</div></div>}</div></div></div>}{r.length > 0 && <div className="screenshots-section"><h3 className="section-title">已截图 ({r.length})</h3><div className="screenshots-grid">{r.map(L => <div className="screenshot-card" key={L.id}><img src={L.dataUrl} alt="截图" className="screenshot-image" /><div className="screenshot-info"><span className="screenshot-size">{L.width} × {L.height}</span><span className="screenshot-time">{L.timestamp.toLocaleTimeString()}</span></div><div className="screenshot-actions"><button className="action-btn" onClick={() => k(L)} title="创建悬浮窗">📌</button><button className="action-btn" onClick={() => K(L.dataUrl)} title="复制到剪贴板">📋</button><button className="action-btn" onClick={() => $(L)} title="下载">💾</button><button className="action-btn danger" onClick={() => G(L.id)} title="删除">🗑️</button></div></div>)}</div></div>}{r.length === 0 && !h && <div className="empty-state"><div className="empty-icon">📷</div><div className="empty-text">点击截取屏幕开始</div><div className="empty-hint">截图后可以创建悬浮窗口，方便参考</div></div>}</div></div>;
}

export default ScreenshotFloat;
