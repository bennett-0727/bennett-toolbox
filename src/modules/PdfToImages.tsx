import * as React from "react";
import JSZip from "jszip";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
const hA = (r, t, e) => Number.isNaN(r) ? t : Math.min(e, Math.max(t, r));
const ok = r => ({
  scale: Number(hA(r.scale, 1, 3).toFixed(1)),
  format: r.format === "jpg" ? "jpg" : "png",
  quality: Math.round(hA(r.quality, 60, 100))
});
const lk = r => r.replace(/\.[^.]+$/, "") || "document";
const vM = (r, t, e, n) => {
  const s = String(Math.max(1, e)).length;
  const i = String(t).padStart(s, "0");
  return `${lk(r)}-page-${i}.${n}`;
};
const yM = r => `${lk(r)}-images.zip`;
const wM = r => r === "jpg" ? "image/jpeg" : "image/png";
const formatBytes = r => r < 1024 ? `${r} B` : r < 1048576 ? `${(r / 1024).toFixed(1)} KB` : `${(r / 1048576).toFixed(2)} MB`;
const xM = {
  scale: 2,
  format: "png",
  quality: 92
};
const bM = r => r.arrayBuffer();
const SM = (r, t, e) => new Promise<Blob>((n, s) => {
  r.toBlob(i => {
    if (i) {
      n(i);
    } else {
      s(new Error("页面图片导出失败"));
    }
  }, wM(t), t === "jpg" ? e / 100 : undefined);
});
const AM = async (r, t, e, n, s) => {
  const i = ok(s);
  const a = await r.getPage(t);
  const o = a.getViewport({
    scale: i.scale
  });
  const c = document.createElement("canvas");
  const u = c.getContext("2d");
  if (!u) {
    throw new Error("无法创建 PDF 渲染画布");
  }
  c.width = Math.ceil(o.width);
  c.height = Math.ceil(o.height);
  if (i.format === "jpg") {
    u.fillStyle = "#ffffff";
    u.fillRect(0, 0, c.width, c.height);
  }
  await a.render({
    canvas: c,
    canvasContext: u,
    viewport: o,
    background: "#ffffff"
  }).promise;
  const h = await SM(c, i.format, i.quality);
  const d = vM(e, t, n, i.format);
  return {
    pageNumber: t,
    name: d,
    blob: h,
    url: URL.createObjectURL(h),
    width: c.width,
    height: c.height
  };
};
const destroyPdfDocument = (doc: any) => {
  try {
    const task = doc?.loadingTask;
    if (task && typeof task.destroy === "function") {
      void task.destroy();
    }
  } catch {}
};

function PdfToImages() {
  const [r, t] = React.useState(null);
  const [e, n] = React.useState(xM);
  const [s, i] = React.useState([]);
  const [a, o] = React.useState(false);
  const [c, u] = React.useState(0);
  const [h, d] = React.useState("");
  const [f, p] = React.useState(null);
  const v = React.useRef(null);
  const m = React.useRef(null);
  const w = React.useMemo(() => ok(e), [e]);
  const g = React.useCallback(T => {
    T.forEach(O => URL.revokeObjectURL(O.url));
  }, []);
  React.useEffect(() => () => {
    g(s);
  }, [s, g]);
  React.useEffect(() => () => {
    destroyPdfDocument(m.current);
  }, []);
  const y = React.useCallback(async T => {
    var O;
    if (T.type !== "application/pdf" && !T.name.toLowerCase().endsWith(".pdf")) {
      p("请选择 PDF 文件");
      return;
    }
    o(true);
    p(null);
    u(0);
    d("正在读取 PDF");
    t(null);
    i(_ => {
      g(_);
      return [];
    });
    try {
      destroyPdfDocument(m.current);
      const _ = await bM(T);
      const M = await getDocument({
        data: new Uint8Array(_)
      }).promise;
      m.current = M;
      t({
        file: T,
        pageCount: M.numPages,
        size: T.size
      });
      u(0);
      d("");
    } catch (_) {
      p(_ instanceof Error ? _.message : "PDF 读取失败");
    } finally {
      o(false);
    }
  }, [g]);
  const x = React.useCallback(async () => {
    if (!!r && !!m.current) {
      o(true);
      p(null);
      i(T => {
        g(T);
        return [];
      });
      u(0);
      d("准备渲染 PDF 页面");
      try {
        const T = m.current;
        const O = [];
        for (let _ = 1; _ <= T.numPages; _ += 1) {
          d(`正在转换第 ${_} / ${T.numPages} 页`);
          const M = await AM(T, _, r.file.name, T.numPages, w);
          O.push(M);
          u(Math.round(_ / T.numPages * 100));
        }
        i(O);
        u(100);
        d(`已生成 ${O.length} 张图片`);
      } catch (T) {
        u(0);
        d("");
        p(T instanceof Error ? T.message : "PDF 转图片失败");
      } finally {
        o(false);
      }
    }
  }, [r, g, w]);
  const A = React.useCallback(T => {
    const O = document.createElement("a");
    O.href = T.url;
    O.download = T.name;
    O.click();
  }, []);
  const E = React.useCallback(async () => {
    if (!!r && s.length !== 0) {
      o(true);
      p(null);
      d("正在打包图片");
      try {
        const T = new JSZip();
        s.forEach(z => T.file(z.name, z.blob));
        const O = await T.generateAsync({
          type: "blob"
        }, z => {
          u(Math.round(z.percent));
        });
        const _ = URL.createObjectURL(O);
        const M = document.createElement("a");
        M.href = _;
        M.download = yM(r.file.name);
        M.click();
        URL.revokeObjectURL(_);
        u(100);
        d("图片打包完成");
      } catch (T) {
        p(T instanceof Error ? T.message : "图片打包失败");
      } finally {
        o(false);
      }
    }
  }, [s, r]);
  const I = React.useCallback(() => {
    var T;
    t(null);
    p(null);
    u(0);
    d("");
    i(O => {
      g(O);
      return [];
    });
    destroyPdfDocument(m.current);
    m.current = null;
    if (v.current) {
      v.current.value = "";
    }
  }, [g]);
  const N = React.useCallback((T, O) => {
    n(_ => ({
      ..._,
      [T]: O
    }));
    i(_ => {
      g(_);
      return [];
    });
    u(0);
    d("");
  }, [g]);
  const D = React.useCallback(T => {
    T.preventDefault();
    const O = T.dataTransfer.files[0];
    if (O) {
      y(O);
    }
  }, [y]);
  return <div className="pdf-to-images"><div className="pdf-to-images-header"><h1 className="module-title">PDF 转图片</h1><div className="header-actions"><button className="btn btn-secondary" onClick={I}><span>🗑️</span>清空</button></div></div><div className="pdf-to-images-body">{!r && <section className="pdf-upload-zone" onDrop={D} onDragOver={T => T.preventDefault()} onClick={() => {
        var T;
        if ((T = v.current) == null) {
          return undefined;
        } else {
          return T.click();
        }
      }}><input ref={v} type="file" accept="application/pdf,.pdf" onChange={T => {
          var O;
          return ((O = T.target.files) == null ? undefined : O[0]) && y(T.target.files[0]);
        }} style={{
          display: "none"
        }} /><div className="pdf-upload-icon">PDF</div><div className="pdf-upload-title">拖拽 PDF 到此处或点击上传</div><div className="pdf-upload-hint">每一页都会转换成一张 PNG 或 JPG 图片</div></section>}{f && <div className="error-box"><span className="error-icon">⚠️</span><span>{f}</span></div>}{r && <div className="pdf-workspace"><section className="pdf-source-card"><div className="panel-header"><span className="panel-title">PDF 文件</span><span className="format-badge">PDF</span></div><div className="pdf-file-summary"><div className="pdf-file-icon">PDF</div><div className="pdf-file-name">{r.file.name}</div><div className="pdf-file-meta"><span>{r.pageCount} 页</span><span>{formatBytes(r.size)}</span></div></div></section><section className="pdf-settings-card"><div className="pdf-format-switch"><button className={w.format === "png" ? "active" : ""} onClick={() => N("format", "png")}>PNG</button><button className={w.format === "jpg" ? "active" : ""} onClick={() => N("format", "jpg")}>JPG</button></div><label className="pdf-setting-field"><span>清晰度倍率：{w.scale.toFixed(1)}x</span><input type="range" min="1" max="3" step="0.5" value={w.scale} onChange={T => N("scale", Number(T.target.value))} /></label>{w.format === "jpg" && <label className="pdf-setting-field"><span>JPG 质量：{w.quality}%</span><input type="range" min="60" max="100" step="5" value={w.quality} onChange={T => N("quality", Number(T.target.value))} /></label>}<button className="btn btn-primary pdf-convert-btn" onClick={x} disabled={a}>{a ? "处理中..." : "转换全部页面"}</button>{(a || c > 0) && <div className="pdf-progress"><div className="pdf-progress-meta"><span>{h}</span><span>{c}%</span></div><div className="pdf-progress-track"><div className="pdf-progress-fill" style={{
                width: `${c}%`
              }} /></div></div>}</section><section className="pdf-result-card"><div className="panel-header"><span className="panel-title">图片结果</span>{s.length > 0 && <div className="pdf-result-header-actions"><span className="format-badge success">{s.length} 张</span><button className="btn btn-primary btn-sm" onClick={E} disabled={a}>下载全部 ZIP</button></div>}</div>{s.length === 0 ? <div className="pdf-empty-result">转换后每页图片会显示在这里</div> : <React.Fragment><div className="pdf-page-grid">{s.map(T => <article className="pdf-page-card" key={T.name}><div className="pdf-page-preview"><img src={T.url} alt={`第 ${T.pageNumber} 页`} /></div><div className="pdf-page-meta"><strong>第 {T.pageNumber} 页</strong><span>{T.width} × {T.height}</span><span>{formatBytes(T.blob.size)}</span></div><button className="btn btn-secondary" onClick={() => A(T)}>下载</button></article>)}</div></React.Fragment>}</section></div>}</div></div>;
}

export default PdfToImages;
