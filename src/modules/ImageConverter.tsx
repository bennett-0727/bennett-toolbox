import * as React from "react";
import JSZip from "jszip";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const isElectron = typeof window !== "undefined" && typeof window.require == "function";
const electron = isElectron ? window.require("electron") : null;
const ipcRenderer = electron == null ? undefined : electron.ipcRenderer;
const wS = [{
  value: "png",
  label: "PNG",
  mime: "image/png"
}, {
  value: "jpg",
  label: "JPG",
  mime: "image/jpeg"
}, {
  value: "webp",
  label: "WebP",
  mime: "image/webp"
}, {
  value: "gif",
  label: "GIF",
  mime: "image/gif"
}, {
  value: "ico",
  label: "ICO",
  mime: "image/x-icon"
}];
const JI = r => {
  var e;
  const t = (e = r.name.split(".").pop()) == null ? undefined : e.toLowerCase();
  if (t === "heic" || t === "heif") {
    return "heic";
  } else if (t === "svg") {
    return "svg";
  } else if (t === "jpg" || t === "jpeg") {
    return "jpg";
  } else if (t === "png") {
    return "png";
  } else if (t === "webp") {
    return "webp";
  } else if (t === "gif") {
    return "gif";
  } else if (t === "ico") {
    return "ico";
  } else {
    return "png";
  }
};
const qI = r => {
  var e;
  const t = (e = r.name.split(".").pop()) == null ? undefined : e.toLowerCase();
  return r.type.startsWith("image/") || t === "heic" || t === "heif";
};
const tP = (r, t, e) => {
  const n = r.replace(/\.[^.]+$/, "") || "image";
  let s = `${n}.${t}`;
  let i = 2;
  while (e.includes(s)) {
    s = `${n}-${i}.${t}`;
    i += 1;
  }
  return s;
};
const formatBytes = r => r < 1024 ? r + " B" : r < 1048576 ? (r / 1024).toFixed(1) + " KB" : (r / 1048576).toFixed(2) + " MB";
const nP = (r: File) => new Promise<string>((t, e) => {
  const n = new FileReader();
  n.onload = () => t(n.result as string);
  n.onerror = () => e(new Error("文件读取失败"));
  n.readAsDataURL(r);
});
const rP = (r: File) => new Promise<string>((t, e) => {
  const n = new FileReader();
  n.onload = () => t(n.result as string);
  n.onerror = () => e(new Error("文件读取失败"));
  n.readAsText(r);
});
const sP = (r: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve({ width: image.width, height: image.height });
  image.onerror = () => reject(new Error("图片加载失败"));
  image.src = r;
});
const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error("结果编码失败"));
  reader.readAsDataURL(blob);
});
const iP = async r => (await fetch(r)).blob();
function ImageConverter() {
  const [r, t] = React.useState([]);
  const [e, n] = React.useState("png");
  const [s, i] = React.useState(92);
  const [a, o] = React.useState(false);
  const [c, u] = React.useState(null);
  const [h, d] = React.useState([]);
  const [f, p] = React.useState(null);
  const [v, m] = React.useState(0);
  const [w, g] = React.useState("");
  const y = React.useRef(null);
  const x = React.useRef(null);
  const A = r.length;
  const E = React.useMemo(() => h.filter(L => L.status === "success").length, [h]);
  const I = React.useCallback(() => {
    m(0);
    g("");
  }, []);
  const N = React.useCallback(async L => {
    const W = JI(L);
    const B = L.path;
    let j;
    if (W === "heic") {
      if (!isElectron || !ipcRenderer || !B) {
        throw new Error("HEIC 转换需要在 Electron 桌面应用中选择本地文件");
      }
      const q = await ipcRenderer.invoke("convert-heic-image", {
        filePath: B,
        targetFormat: "png"
      });
      if (!q.success || !q.dataUrl) {
        throw new Error(q.error || "HEIC 预览转换失败");
      }
      j = q.dataUrl;
    } else {
      j = await nP(L);
    }
    const {
      width: H,
      height: Y
    } = await sP(j);
    const Q = W === "svg" ? await rP(L) : undefined;
    return {
      id: `${L.name}-${L.size}-${L.lastModified}-${Math.random().toString(16).slice(2)}`,
      file: L,
      dataUrl: j,
      format: W,
      width: H,
      height: Y,
      size: L.size,
      sourcePath: B,
      svgCode: Q
    };
  }, []);
  const D = React.useCallback(async (L: FileList) => {
    const W = Array.from(L).filter(qI);
    if (W.length === 0) {
      u("请选择支持的图片文件");
      return;
    }
    o(true);
    u(null);
    d([]);
    p(null);
    m(0);
    g(`正在读取 0 / ${W.length} 张图片`);
    const B = [];
    const j = [];
    for (let H = 0; H < W.length; H += 1) {
      const Y = W[H];
      g(`正在读取 ${H + 1} / ${W.length} 张图片`);
      try {
        B.push(await N(Y));
      } catch (Q) {
        j.push(`${Y.name}: ${Q instanceof Error ? Q.message : "读取失败"}`);
      }
      m(Math.round((H + 1) / W.length * 100));
    }
    t(B);
    if (B.length > 0) {
      const H = B[0].format;
      n(H === "svg" ? "png" : H === "heic" ? "jpg" : H === "jpg" ? "png" : "jpg");
    }
    u(j.length > 0 ? j.join("；") : null);
    g(B.length > 0 ? `已读取 ${B.length} 张图片` : "");
    o(false);
  }, [N]);
  const T = React.useCallback(async (L, W) => {
    if (L.format === "heic") {
      if (!ipcRenderer) {
        throw new Error("HEIC 转换需要在 Electron 桌面应用中使用");
      }
      if (!L.sourcePath) {
        throw new Error("无法读取 HEIC 文件路径，请重新选择文件");
      }
      if (!["png", "jpg"].includes(W)) {
        throw new Error("HEIC 当前支持转换为 PNG 或 JPG");
      }
      const Z = await ipcRenderer.invoke("convert-heic-image", {
        filePath: L.sourcePath,
        targetFormat: W
      });
      if (!Z.success || !Z.dataUrl) {
        throw new Error(Z.error || "HEIC 转换失败");
      }
      return Z.dataUrl;
    }
    const B = x.current;
    if (!B) {
      throw new Error("画布初始化失败");
    }
    const j = B.getContext("2d");
    if (!j) {
      throw new Error("画布上下文初始化失败");
    }
    const H = new Image();
    await new Promise<void>((Z, rt) => {
      H.onload = () => Z();
      H.onerror = () => rt(new Error("图片加载失败"));
      H.src = L.dataUrl;
    });
    B.width = H.width;
    B.height = H.height;
    j.clearRect(0, 0, B.width, B.height);
    if (W === "jpg") {
      j.fillStyle = "#ffffff";
      j.fillRect(0, 0, B.width, B.height);
    }
    j.drawImage(H, 0, 0);
    if (W === "gif") {
      const imageData = j.getImageData(0, 0, B.width, B.height).data;
      const palette = quantize(imageData, 256);
      const indexed = applyPalette(imageData, palette);
      const encoder = GIFEncoder();
      encoder.writeFrame(indexed, B.width, B.height, { palette, delay: 0, repeat: 0 });
      encoder.finish();
      return blobToDataUrl(new Blob([encoder.bytes()], { type: "image/gif" }));
    }
    if (W === "ico") {
      const Z = document.createElement("canvas");
      const rt = Z.getContext("2d");
      if (!rt) {
        throw new Error("ICO 画布初始化失败");
      }
      const at = Math.min(H.width, H.height, 64);
      Z.width = at;
      Z.height = at;
      rt.drawImage(H, 0, 0, at, at);
      const pngBytes = new Uint8Array(await (await fetch(Z.toDataURL("image/png"))).arrayBuffer());
      const header = new ArrayBuffer(22);
      const view = new DataView(header);
      view.setUint16(0, 0, true);
      view.setUint16(2, 1, true);
      view.setUint16(4, 1, true);
      view.setUint8(6, at === 256 ? 0 : at);
      view.setUint8(7, at === 256 ? 0 : at);
      view.setUint8(8, 0);
      view.setUint8(9, 0);
      view.setUint16(10, 1, true);
      view.setUint16(12, 32, true);
      view.setUint32(14, pngBytes.length, true);
      view.setUint32(18, 22, true);
      return blobToDataUrl(new Blob([header, pngBytes], { type: "image/x-icon" }));
    }
    const Y = wS.find(Z => Z.value === W);
    const Q = (Y == null ? undefined : Y.mime) || "image/png";
    const q = ["jpg", "webp"].includes(W) ? s / 100 : undefined;
    return B.toDataURL(Q, q);
  }, [s]);
  const O = React.useCallback(L => {
    L.preventDefault();
    D(L.dataTransfer.files);
  }, [D]);
  const _ = React.useCallback(L => {
    L.preventDefault();
  }, []);
  const M = React.useCallback(async () => {
    if (r.length === 0) {
      return;
    }
    o(true);
    u(null);
    d([]);
    m(0);
    g(`准备转换 ${r.length} 张图片`);
    const L = [];
    for (let B = 0; B < r.length; B += 1) {
      const j = r[B];
      const H = tP(j.file.name, e, L.map(Y => Y.outputName));
      g(`正在转换 ${B + 1} / ${r.length}: ${j.file.name}`);
      try {
        const Y = await T(j, e);
        L.push({
          id: j.id,
          sourceName: j.file.name,
          outputName: H,
          dataUrl: Y,
          status: "success"
        });
      } catch (Y) {
        L.push({
          id: j.id,
          sourceName: j.file.name,
          outputName: H,
          error: Y instanceof Error ? Y.message : "转换失败",
          status: "error"
        });
      }
      d([...L]);
      m(Math.round((B + 1) / r.length * 100));
    }
    const W = L.filter(B => B.status === "error").length;
    g(W > 0 ? `完成 ${L.length - W} 张，失败 ${W} 张` : `已完成 ${L.length} 张图片转换`);
    o(false);
  }, [T, r, e]);
  const z = React.useCallback(L => {
    if (!L.dataUrl) {
      return;
    }
    const W = document.createElement("a");
    W.download = L.outputName;
    W.href = L.dataUrl;
    W.click();
  }, []);
  const k = React.useCallback(async () => {
    const L = h.filter(W => W.status === "success" && W.dataUrl);
    if (L.length !== 0) {
      o(true);
      u(null);
      m(0);
      g(`正在打包 0 / ${L.length} 张图片`);
      try {
        const W = new JSZip();
        for (let Y = 0; Y < L.length; Y += 1) {
          const Q = L[Y];
          if (Q.dataUrl) {
            g(`正在打包 ${Y + 1} / ${L.length}: ${Q.outputName}`);
            W.file(Q.outputName, await iP(Q.dataUrl));
            m(Math.round((Y + 1) / L.length * 70));
          }
        }
        const B = await W.generateAsync({
          type: "blob"
        }, Y => {
          m(70 + Math.round(Y.percent * 0.3));
        });
        const j = URL.createObjectURL(B);
        const H = document.createElement("a");
        H.href = j;
        H.download = `converted-images-${Date.now()}.zip`;
        H.click();
        URL.revokeObjectURL(j);
        m(100);
        g("图片打包完成");
      } catch (W) {
        u(W instanceof Error ? W.message : "图片打包失败");
      } finally {
        o(false);
      }
    }
  }, [h]);
  const G = React.useCallback(L => {
    if (L.svgCode) {
      navigator.clipboard.writeText(L.svgCode);
      p(L.id);
      setTimeout(() => p(null), 2000);
    }
  }, []);
  const K = React.useCallback(L => {
    if (!L.svgCode) {
      return;
    }
    const W = new Blob([L.svgCode], {
      type: "image/svg+xml"
    });
    const B = URL.createObjectURL(W);
    const j = document.createElement("a");
    j.download = L.file.name;
    j.href = B;
    j.click();
    URL.revokeObjectURL(B);
  }, []);
  const $ = React.useCallback(() => {
    t([]);
    d([]);
    u(null);
    p(null);
    I();
    if (y.current) {
      y.current.value = "";
    }
  }, [I]);
  const X = React.useCallback(L => {
    if (r.length === 0) {
      return false;
    }
    const W = r.every(j => j.format === L);
    const B = r.some(j => j.format === "heic");
    return W || B && !["png", "jpg"].includes(L);
  }, [r]);
  return <div className="image-converter"><div className="image-converter-header"><h1 className="module-title">图片转换</h1><div className="header-actions"><button className="btn btn-secondary" onClick={$}><span>🗑️</span>清空</button></div></div><div className="image-converter-body"><canvas ref={x} style={{
        display: "none"
      }} />{A === 0 && <div className="upload-zone" onDrop={O} onDragOver={_} onClick={() => {
        var L;
        if ((L = y.current) == null) {
          return undefined;
        } else {
          return L.click();
        }
      }}><input ref={y} type="file" accept="image/*,.heic,.heif" multiple={true} onChange={L => L.target.files && D(L.target.files)} style={{
          display: "none"
        }} /><div className="upload-icon">🖼️</div><div className="upload-text">拖拽一批图片到此处或点击上传</div><div className="upload-hint">支持 PNG, JPG, WebP, GIF, SVG, ICO, HEIC，可一次选择多张</div></div>}{c && <div className="error-box"><span className="error-icon">⚠️</span><span>{c}</span></div>}{A > 0 && <div className="converter-content"><div className="batch-toolbar"><div className="batch-summary"><strong>{A}</strong><span>张图片</span>{E > 0 && <span className="batch-success">{E} 张已转换</span>}</div><div className="batch-actions"><button className="btn btn-secondary" onClick={() => {
              var L;
              if ((L = y.current) == null) {
                return undefined;
              } else {
                return L.click();
              }
            }}>📤 重新选择</button>{E > 0 && <button className="btn btn-primary" onClick={k} disabled={a}>下载全部 ZIP</button>}</div><input ref={y} type="file" accept="image/*,.heic,.heif" multiple={true} onChange={L => L.target.files && D(L.target.files)} style={{
            display: "none"
          }} /></div><section className="panel batch-control-panel"><div className="panel-header"><span className="panel-title">批量转换设置</span><span className="format-badge">{e.toUpperCase()}</span></div><div className="batch-control-body"><div className="format-selector batch-format-selector"><label className="selector-label">目标格式</label><div className="format-buttons">{wS.map(L => <button className={`format-btn ${e === L.value ? "active" : ""}`} onClick={() => {
                  n(L.value);
                  d([]);
                  I();
                }} disabled={X(L.value)} key={L.value}>{L.label}</button>)}</div></div>{["jpg", "webp"].includes(e) && <div className="quality-control batch-quality-control"><label className="selector-label">质量: {s}%</label><input type="range" min="10" max="100" value={s} onChange={L => {
                i(Number(L.target.value));
                d([]);
                I();
              }} className="quality-slider" /></div>}<button className="btn btn-primary convert-btn batch-convert-btn" onClick={M} disabled={a}>{a ? "处理中..." : "🔄 批量转换"}</button></div>{(a || v > 0) && <div className="image-progress"><div className="image-progress-meta"><span>{w}</span><span>{v}%</span></div><div className="image-progress-track"><div className="image-progress-fill" style={{
                width: `${v}%`
              }} /></div></div>}</section><div className="image-batch-grid">{r.map(L => {
            const W = h.find(B => B.id === L.id);
            return <article className="image-batch-card" key={L.id}><div className="image-batch-preview"><img src={(W == null ? undefined : W.dataUrl) || L.dataUrl} alt={L.file.name} className="preview-image" /></div><div className="image-batch-info"><div className="image-batch-name" title={L.file.name}>{L.file.name}</div><div className="image-batch-meta"><span>{L.format.toUpperCase()}</span><span>{L.width} × {L.height}</span><span>{formatBytes(L.size)}</span></div>{(W == null ? undefined : W.status) === "error" && <div className="image-batch-error">{W.error}</div>}</div><div className="image-batch-footer"><span className={`format-badge ${(W == null ? undefined : W.status) === "success" ? "success" : ""}`}>{(W == null ? undefined : W.status) === "success" ? e.toUpperCase() : "待转换"}</span>{(W == null ? undefined : W.status) === "success" && <button className="btn btn-secondary" onClick={() => z(W)}>下载</button>}</div></article>;
          })}</div>{r.some(L => L.format === "svg" && L.svgCode) && <div className="svg-code-section"><div className="svg-code-header"><span className="svg-code-title">📝 SVG 代码</span></div>{r.filter(L => L.format === "svg" && L.svgCode).map(L => <div className="svg-code-item" key={L.id}><div className="svg-code-actions"><span className="svg-code-file">{L.file.name}</span><button className={`btn btn-secondary ${f === L.id ? "copied" : ""}`} onClick={() => G(L)}>{f === L.id ? "✓ 已复制" : "📋 复制代码"}</button><button className="btn btn-secondary" onClick={() => K(L)}>💾 下载 SVG</button></div><pre className="svg-code-content"><code>{L.svgCode}</code></pre></div>)}</div>}</div>}</div></div>;
}

export default ImageConverter;
