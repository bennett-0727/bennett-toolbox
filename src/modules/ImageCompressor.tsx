import * as React from "react";
import JSZip from "jszip";

const r0 = (r, t, e) => Number.isNaN(r) ? t : Math.min(e, Math.max(t, r));
const dw = r => {
  let t = Math.round(r0(r.minQuality, 10, 95));
  let e = Math.round(r0(r.maxQuality, 10, 100));
  if (t > e) {
    t = 10;
    e = 95;
  }
  return {
    targetSizeMb: Number(r0(r.targetSizeMb, 0.1, 100).toFixed(2)),
    minQuality: t,
    maxQuality: e,
    format: r.format === "webp" ? "webp" : "jpg"
  };
};
const PC = r => Math.round(r * 1024 * 1024);
const oP = r => r === "webp" ? "image/webp" : "image/jpeg";
const xS = (r, t, e) => {
  const n = r.replace(/\.[^.]+$/, "") || "image";
  let s = `${n}-compressed.${t}`;
  let i = 2;
  while (e.includes(s)) {
    s = `${n}-compressed-${i}.${t}`;
    i += 1;
  }
  return s;
};
const lP = (r, t) => {
  if (r.length === 0) {
    return null;
  }
  const e = r.filter(n => n.size <= t).sort((n, s) => s.size - n.size);
  if (e[0]) {
    return e[0];
  } else {
    return [...r].sort((n, s) => n.size - s.size)[0];
  }
};
const formatBytes = r => r < 1024 ? `${r} B` : r < 1048576 ? `${(r / 1024).toFixed(1)} KB` : `${(r / 1048576).toFixed(2)} MB`;
const cP = (r, t) => r <= 0 ? 0 : Math.max(0, Math.round((1 - t / r) * 100));
const uP = {
  targetSizeMb: 3,
  maxQuality: 92,
  minQuality: 25,
  format: "jpg"
};
const hP = r => {
  const t = r.name.toLowerCase();
  return r.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp)$/.test(t);
};
const dP = (r: File) => new Promise<string>((t, e) => {
  const n = new FileReader();
  n.onload = () => t(n.result as string);
  n.onerror = () => e(new Error("文件读取失败"));
  n.readAsDataURL(r);
});
const RC = (r: string) => new Promise<HTMLImageElement>((t, e) => {
  const n = new Image();
  n.onload = () => t(n);
  n.onerror = () => e(new Error("图片加载失败"));
  n.src = r;
});
const s0 = async r => (await fetch(r)).blob();
const bS = (r, t, e) => {
  const n = document.createElement("canvas");
  const s = n.getContext("2d");
  if (!s) {
    throw new Error("画布初始化失败");
  }
  n.width = r.naturalWidth || r.width;
  n.height = r.naturalHeight || r.height;
  if (t === "jpg") {
    s.fillStyle = "#ffffff";
    s.fillRect(0, 0, n.width, n.height);
  }
  s.drawImage(r, 0, 0, n.width, n.height);
  return n.toDataURL(oP(t), e);
};
const fP = async (r, t) => {
  const e = dw(t);
  const n = PC(e.targetSizeMb);
  const s = Math.min(n, r.size);
  const i = await RC(r.dataUrl);
  const a = e.minQuality / 100;
  const o = e.maxQuality / 100;
  const c = [];
  const u = new Set();
  let h = a;
  let d = o;
  for (let m = 0; m < 8; m += 1) {
    const w = Number(((h + d) / 2).toFixed(3));
    if (u.has(w)) {
      break;
    }
    u.add(w);
    const g = bS(i, e.format, w);
    const y = await s0(g);
    c.push({
      dataUrl: g,
      quality: w,
      size: y.size
    });
    if (y.size > s) {
      d = w;
    } else {
      h = w;
    }
  }
  for (const m of [a, o]) {
    const w = Number(m.toFixed(3));
    if (u.has(w)) {
      continue;
    }
    const g = bS(i, e.format, w);
    const y = await s0(g);
    c.push({
      dataUrl: g,
      quality: w,
      size: y.size
    });
  }
  const f = lP(c, s);
  if (!f) {
    throw new Error("图片压缩失败");
  }
  const p = await s0(f.dataUrl);
  const v = p.size <= n;
  return {
    id: r.id,
    sourceName: r.file.name,
    outputName: "",
    dataUrl: f.dataUrl,
    blob: p,
    outputSize: p.size,
    quality: Math.round(f.quality * 100),
    ratio: cP(r.size, p.size),
    status: v ? "success" : "warning",
    message: v ? undefined : `最低质量仍超过 ${formatBytes(n)}，已保留同尺寸最小体积结果`
  };
};
function ImageCompressor() {
  const [r, t] = React.useState([]);
  const [e, n] = React.useState(uP);
  const [s, i] = React.useState([]);
  const [a, o] = React.useState(false);
  const [c, u] = React.useState(null);
  const [h, d] = React.useState(0);
  const [f, p] = React.useState("");
  const v = React.useRef(null);
  const m = React.useMemo(() => dw(e), [e]);
  const w = React.useMemo(() => s.filter(_ => _.status === "success" || _.status === "warning").length, [s]);
  const g = React.useMemo(() => PC(m.targetSizeMb), [m.targetSizeMb]);
  const y = React.useCallback(() => {
    i([]);
    d(0);
    p("");
  }, []);
  const x = React.useCallback(async (_: FileList) => {
    const M = Array.from(_).filter(hP);
    if (M.length === 0) {
      u("请选择支持的图片文件");
      return;
    }
    o(true);
    u(null);
    y();
    p(`正在读取 0 / ${M.length} 张图片`);
    const z = [];
    const k = [];
    for (let G = 0; G < M.length; G += 1) {
      const K = M[G];
      p(`正在读取 ${G + 1} / ${M.length}: ${K.name}`);
      try {
        const $ = await dP(K);
        const X = await RC($);
        z.push({
          id: `${K.name}-${K.size}-${K.lastModified}-${Math.random().toString(16).slice(2)}`,
          file: K,
          dataUrl: $,
          width: X.naturalWidth || X.width,
          height: X.naturalHeight || X.height,
          size: K.size
        });
      } catch ($) {
        k.push(`${K.name}: ${$ instanceof Error ? $.message : "读取失败"}`);
      }
      d(Math.round((G + 1) / M.length * 100));
    }
    t(z);
    u(k.length > 0 ? k.join("；") : null);
    p(z.length > 0 ? `已读取 ${z.length} 张图片` : "");
    o(false);
  }, [y]);
  const A = React.useCallback(_ => {
    _.preventDefault();
    x(_.dataTransfer.files);
  }, [x]);
  const E = React.useCallback(_ => {
    _.preventDefault();
  }, []);
  const I = React.useCallback(async () => {
    if (r.length === 0) {
      return;
    }
    o(true);
    u(null);
    i([]);
    d(0);
    p(`准备压缩 ${r.length} 张图片`);
    const _ = [];
    for (let z = 0; z < r.length; z += 1) {
      const k = r[z];
      p(`正在压缩 ${z + 1} / ${r.length}: ${k.file.name}`);
      try {
        const G = await fP(k, m);
        G.outputName = xS(k.file.name, m.format, _.map(K => K.outputName));
        _.push(G);
      } catch (G) {
        _.push({
          id: k.id,
          sourceName: k.file.name,
          outputName: xS(k.file.name, m.format, _.map(K => K.outputName)),
          status: "error",
          message: G instanceof Error ? G.message : "压缩失败"
        });
      }
      i([..._]);
      d(Math.round((z + 1) / r.length * 100));
    }
    const M = _.filter(z => z.status === "error").length;
    p(M > 0 ? `完成 ${_.length - M} 张，失败 ${M} 张` : `已完成 ${_.length} 张图片压缩`);
    o(false);
  }, [r, m]);
  const N = React.useCallback(_ => {
    if (!_.dataUrl) {
      return;
    }
    const M = document.createElement("a");
    M.href = _.dataUrl;
    M.download = _.outputName;
    M.click();
  }, []);
  const D = React.useCallback(async () => {
    const _ = s.filter(M => M.blob);
    if (_.length !== 0) {
      o(true);
      u(null);
      d(0);
      p(`正在打包 0 / ${_.length} 张图片`);
      try {
        const M = new JSZip();
        _.forEach((K, $) => {
          if (K.blob) {
            M.file(K.outputName, K.blob);
            p(`正在打包 ${$ + 1} / ${_.length}: ${K.outputName}`);
            d(Math.round(($ + 1) / _.length * 70));
          }
        });
        const z = await M.generateAsync({
          type: "blob"
        }, K => {
          d(70 + Math.round(K.percent * 0.3));
        });
        const k = URL.createObjectURL(z);
        const G = document.createElement("a");
        G.href = k;
        G.download = `compressed-images-${Date.now()}.zip`;
        G.click();
        URL.revokeObjectURL(k);
        d(100);
        p("图片打包完成");
      } catch (M) {
        u(M instanceof Error ? M.message : "图片打包失败");
      } finally {
        o(false);
      }
    }
  }, [s]);
  const T = React.useCallback(() => {
    t([]);
    i([]);
    u(null);
    d(0);
    p("");
    if (v.current) {
      v.current.value = "";
    }
  }, []);
  const O = React.useCallback(_ => {
    n(M => dw({
      ...M,
      ..._
    }));
    y();
  }, [y]);
  return <div className="image-compressor"><div className="image-compressor-header"><h1 className="module-title">图片批量压缩</h1><div className="header-actions"><button className="btn btn-secondary" onClick={T}><span>🗑️</span>清空</button></div></div><div className="image-compressor-body">{r.length === 0 && <div className="compress-upload-zone" onDrop={A} onDragOver={E} onClick={() => {
        var _;
        if ((_ = v.current) == null) {
          return undefined;
        } else {
          return _.click();
        }
      }}><input ref={v} type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp" multiple={true} onChange={_ => _.target.files && x(_.target.files)} style={{
          display: "none"
        }} /><div className="compress-upload-icon">🗜️</div><div className="compress-upload-text">拖拽一批图片到此处或点击上传</div><div className="compress-upload-hint">仅调整编码质量，保持原始宽高不变；适合 JPG、PNG、WebP 等常见图片</div></div>}{c && <div className="compress-error-box"><span>⚠️</span><span>{c}</span></div>}{r.length > 0 && <div className="compress-content"><div className="compress-toolbar"><div className="compress-summary"><strong>{r.length}</strong><span>张图片</span>{w > 0 && <span className="compress-success">{w} 张已压缩</span>}</div><div className="compress-actions"><button className="btn btn-secondary" onClick={() => {
              var _;
              if ((_ = v.current) == null) {
                return undefined;
              } else {
                return _.click();
              }
            }}>📤 重新选择</button>{w > 0 && <button className="btn btn-primary" onClick={D} disabled={a}>下载全部 ZIP</button>}</div><input ref={v} type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp" multiple={true} onChange={_ => _.target.files && x(_.target.files)} style={{
            display: "none"
          }} /></div><section className="panel compress-control-panel"><div className="panel-header"><span className="panel-title">批量压缩设置</span><span className="format-badge">目标 ≤ {formatBytes(g)}</span></div><div className="compress-control-body"><div className="compress-field"><label className="compress-label">目标大小上限</label><div className="compress-input-row"><input type="number" min="0.1" max="100" step="0.1" value={m.targetSizeMb} onChange={_ => O({
                  targetSizeMb: Number(_.target.value)
                })} /><span>MB / 张</span></div></div><div className="compress-field"><label className="compress-label">输出格式</label><div className="compress-format-buttons">{["jpg", "webp"].map(_ => <button className={`format-btn ${m.format === _ ? "active" : ""}`} onClick={() => O({
                  format: _
                })} key={_}>{_.toUpperCase()}</button>)}</div></div><div className="compress-field"><label className="compress-label">最高质量: {m.maxQuality}%</label><input className="quality-slider" type="range" min="10" max="100" value={m.maxQuality} onChange={_ => O({
                maxQuality: Number(_.target.value)
              })} /></div><div className="compress-field"><label className="compress-label">最低质量: {m.minQuality}%</label><input className="quality-slider" type="range" min="10" max="95" value={m.minQuality} onChange={_ => O({
                minQuality: Number(_.target.value)
              })} /></div><button className="btn btn-primary compress-start-btn" onClick={I} disabled={a}>{a ? "处理中..." : "🗜️ 批量压缩"}</button></div>{(a || h > 0) && <div className="compress-progress"><div className="compress-progress-meta"><span>{f}</span><span>{h}%</span></div><div className="compress-progress-track"><div className="compress-progress-fill" style={{
                width: `${h}%`
              }} /></div></div>}</section><div className="compress-grid">{r.map(_ => {
            const M = s.find(z => z.id === _.id);
            return <article className="compress-card" key={_.id}><div className="compress-preview"><img src={(M == null ? undefined : M.dataUrl) || _.dataUrl} alt={_.file.name} /></div><div className="compress-card-info"><div className="compress-card-name" title={_.file.name}>{_.file.name}</div><div className="compress-card-meta"><span>{_.width} × {_.height}</span><span>原图 {formatBytes(_.size)}</span></div>{(M == null ? undefined : M.outputSize) && <div className="compress-result-meta"><span>输出 {formatBytes(M.outputSize)}</span><span>质量 {M.quality}%</span><span>减少 {M.ratio}%</span></div>}{(M == null ? undefined : M.message) && <div className={`compress-card-message ${M.status}`}>{M.message}</div>}</div><div className="compress-card-footer"><span className={`format-badge ${(M == null ? undefined : M.status) === "success" ? "success" : ""}`}>{M ? M.status === "error" ? "失败" : m.format.toUpperCase() : "待压缩"}</span>{(M == null ? undefined : M.dataUrl) && <button className="btn btn-secondary" onClick={() => N(M)}>下载</button>}</div></article>;
          })}</div></div>}</div></div>;
}

export default ImageCompressor;
