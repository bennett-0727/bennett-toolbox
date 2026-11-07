import * as React from "react";

const RS = (r, t, e) => Number.isNaN(r) ? t : Math.min(e, Math.max(t, r));
const jC = r => ({
  radius: Math.round(RS(r.radius, 2, 24)),
  iterations: Math.round(RS(r.iterations, 1, 6))
});
const DS = (r, t, e, n = 16) => {
  const s = new Uint8Array(t * e);
  for (let i = 0; i < s.length; i += 1) {
    s[i] = r[i * 4 + 3] > n ? 1 : 0;
  }
  return s;
};
const pw = r => {
  let t = 0;
  for (let e = 0; e < r.length; e += 1) {
    t += r[e];
  }
  return t;
};
const MS = (r, t, e, n) => r >= 0 && t >= 0 && r < e && t < n;
const sR = (r, t, e, n) => {
  const s = e * 4;
  const i = n * 4;
  t[i] = r[s];
  t[i + 1] = r[s + 1];
  t[i + 2] = r[s + 2];
  t[i + 3] = r[s + 3];
};
const iR = (r, t, e, n, s) => {
  const i = jC(s);
  const a = new Uint8ClampedArray(r);
  const o = new Uint8Array(n);
  let c = 0;
  for (let u = 0; u < i.iterations; u += 1) {
    const h = new Uint8ClampedArray(a);
    const d = new Uint8Array(o);
    let f = 0;
    for (let p = 0; p < e; p += 1) {
      for (let v = 0; v < t; v += 1) {
        const m = p * t + v;
        if (!o[m]) {
          continue;
        }
        let w = 0;
        let g = 0;
        let y = 0;
        let x = 0;
        let A = 0;
        for (let E = -i.radius; E <= i.radius; E += 1) {
          for (let I = -i.radius; I <= i.radius; I += 1) {
            if (I === 0 && E === 0) {
              continue;
            }
            const N = Math.sqrt(I * I + E * E);
            if (N > i.radius) {
              continue;
            }
            const D = v + I;
            const T = p + E;
            if (!MS(D, T, t, e)) {
              continue;
            }
            const O = T * t + D;
            if (o[O]) {
              continue;
            }
            const _ = 1 / Math.max(1, N);
            const M = O * 4;
            w += a[M] * _;
            g += a[M + 1] * _;
            y += a[M + 2] * _;
            x += a[M + 3] * _;
            A += _;
          }
        }
        if (A > 0) {
          const E = m * 4;
          h[E] = Math.round(w / A);
          h[E + 1] = Math.round(g / A);
          h[E + 2] = Math.round(y / A);
          h[E + 3] = Math.round(x / A);
          d[m] = 0;
          f += 1;
        }
      }
    }
    a.set(h);
    o.set(d);
    c += f;
    if (f === 0) {
      break;
    }
  }
  for (let u = 0; u < o.length; u += 1) {
    if (!o[u]) {
      continue;
    }
    let h = -1;
    for (let d = i.radius + 1; d <= Math.max(t, e); d += 1) {
      for (let f = -d; f <= d; f += 1) {
        for (let p = -d; p <= d; p += 1) {
          if (Math.abs(p) !== d && Math.abs(f) !== d) {
            continue;
          }
          const v = u % t;
          const m = Math.floor(u / t);
          const w = v + p;
          const g = m + f;
          if (!MS(w, g, t, e)) {
            continue;
          }
          const y = g * t + w;
          if (!o[y]) {
            h = y;
            break;
          }
        }
        if (h >= 0) {
          break;
        }
      }
      if (h >= 0) {
        break;
      }
    }
    if (h >= 0) {
      sR(a, a, h, u);
      o[u] = 0;
      c += 1;
    }
  }
  return {
    data: a,
    stats: {
      maskedPixels: pw(n),
      filledPixels: c
    }
  };
};
const aR = r => `${r.replace(/\.[^.]+$/, "") || "image"}-去水印.png`;
const formatBytes = r => r < 1024 ? `${r} B` : r < 1048576 ? `${(r / 1024).toFixed(1)} KB` : `${(r / 1048576).toFixed(2)} MB`;
const lR = {
  radius: 10,
  iterations: 3
};
const cR = (r: File) => new Promise<string>((t, e) => {
  const n = new FileReader();
  n.onload = () => t(n.result as string);
  n.onerror = () => e(new Error("文件读取失败"));
  n.readAsDataURL(r);
});
const OS = (r: string) => new Promise<HTMLImageElement>((t, e) => {
  const n = new Image();
  n.onload = () => t(n);
  n.onerror = () => e(new Error("图片加载失败"));
  n.src = r;
});
function WatermarkRemoval() {
  const [r, t] = React.useState(null);
  const [e, n] = React.useState(null);
  const [s, i] = React.useState("brush");
  const [a, o] = React.useState(34);
  const [c, u] = React.useState(lR);
  const [h, d] = React.useState(0);
  const [f, p] = React.useState(null);
  const [v, m] = React.useState(false);
  const [w, g] = React.useState(null);
  const y = React.useRef(null);
  const x = React.useRef(null);
  const A = React.useRef(null);
  const E = React.useRef(false);
  const I = React.useRef(null);
  const N = React.useRef(null);
  const D = jC(c);
  React.useEffect(() => () => {
    if (e) {
      URL.revokeObjectURL(e);
    }
  }, [e]);
  const T = React.useCallback(() => {
    const H = A.current;
    if (!H) {
      return;
    }
    const Y = H.getContext("2d");
    if (!Y) {
      return;
    }
    const Q = Y.getImageData(0, 0, H.width, H.height);
    const q = DS(Q.data, H.width, H.height);
    d(pw(q));
  }, []);
  const O = React.useCallback(async H => {
    const Y = x.current;
    const Q = A.current;
    if (!Y || !Q) {
      return;
    }
    const q = await OS(H.dataUrl);
    Y.width = q.width;
    Y.height = q.height;
    Q.width = q.width;
    Q.height = q.height;
    const Z = Y.getContext("2d");
    const rt = Q.getContext("2d");
    if (!!Z && !!rt) {
      Z.clearRect(0, 0, q.width, q.height);
      Z.drawImage(q, 0, 0);
      rt.clearRect(0, 0, q.width, q.height);
      d(0);
      p(null);
    }
  }, []);
  React.useEffect(() => {
    if (r) {
      O(r).catch(H => {
        g(H instanceof Error ? H.message : "图片渲染失败");
      });
    }
  }, [O, r]);
  const _ = React.useCallback(async H => {
    if (!H.type.startsWith("image/")) {
      g("请选择图片文件");
      return;
    }
    m(true);
    g(null);
    n(Y => {
      if (Y) {
        URL.revokeObjectURL(Y);
      }
      return null;
    });
    try {
      const Y = await cR(H);
      const Q = await OS(Y);
      t({
        file: H,
        dataUrl: Y,
        width: Q.width,
        height: Q.height,
        size: H.size
      });
    } catch (Y) {
      g(Y instanceof Error ? Y.message : "图片读取失败");
    } finally {
      m(false);
    }
  }, []);
  const M = React.useCallback(H => {
    const Y = A.current;
    if (!Y) {
      return null;
    }
    const Q = Y.getBoundingClientRect();
    return {
      x: (H.clientX - Q.left) / Q.width * Y.width,
      y: (H.clientY - Q.top) / Q.height * Y.height
    };
  }, []);
  const z = React.useCallback((H, Y) => {
    const Q = A.current;
    const q = Q == null ? undefined : Q.getContext("2d");
    if (!!Q && !!q) {
      q.fillStyle = "rgba(80, 120, 255, 0.52)";
      q.beginPath();
      q.arc(H, Y, a / 2, 0, Math.PI * 2);
      q.fill();
    }
  }, [a]);
  const k = React.useCallback(H => {
    if (!r || v) {
      return;
    }
    const Y = M(H);
    const Q = A.current;
    const q = Q == null ? undefined : Q.getContext("2d");
    if (!!Y && !!Q && !!q) {
      try {
        H.currentTarget.setPointerCapture(H.pointerId);
      } catch {}
      n(Z => {
        if (Z) {
          URL.revokeObjectURL(Z);
        }
        return null;
      });
      p(null);
      E.current = true;
      if (s === "rectangle") {
        I.current = Y;
        N.current = q.getImageData(0, 0, Q.width, Q.height);
        return;
      }
      z(Y.x, Y.y);
      T();
    }
  }, [z, M, r, v, T, s]);
  const G = React.useCallback(H => {
    if (!E.current) {
      return;
    }
    const Y = M(H);
    const Q = A.current;
    const q = Q == null ? undefined : Q.getContext("2d");
    if (!!Y && !!Q && !!q) {
      if (s === "rectangle") {
        const Z = I.current;
        const rt = N.current;
        if (!Z || !rt) {
          return;
        }
        q.putImageData(rt, 0, 0);
        q.fillStyle = "rgba(80, 120, 255, 0.42)";
        q.strokeStyle = "rgba(160, 185, 255, 0.95)";
        q.lineWidth = Math.max(2, Q.width / 600);
        q.fillRect(Z.x, Z.y, Y.x - Z.x, Y.y - Z.y);
        q.strokeRect(Z.x, Z.y, Y.x - Z.x, Y.y - Z.y);
        return;
      }
      z(Y.x, Y.y);
      T();
    }
  }, [z, M, T, s]);
  const K = React.useCallback(H => {
    if (E.current) {
      try {
        H.currentTarget.releasePointerCapture(H.pointerId);
      } catch {}
      E.current = false;
      I.current = null;
      N.current = null;
      T();
    }
  }, [T]);
  const $ = React.useCallback(H => {
    H.preventDefault();
    const Y = H.dataTransfer.files[0];
    if (Y) {
      _(Y);
    }
  }, [_]);
  const X = React.useCallback(() => {
    const H = A.current;
    const Y = H == null ? undefined : H.getContext("2d");
    if (!!H && !!Y) {
      Y.clearRect(0, 0, H.width, H.height);
      d(0);
      p(null);
      n(Q => {
        if (Q) {
          URL.revokeObjectURL(Q);
        }
        return null;
      });
    }
  }, []);
  const L = React.useCallback(() => {
    t(null);
    g(null);
    d(0);
    p(null);
    n(H => {
      if (H) {
        URL.revokeObjectURL(H);
      }
      return null;
    });
    if (y.current) {
      y.current.value = "";
    }
  }, []);
  const W = React.useCallback(async () => {
    const H = x.current;
    const Y = A.current;
    const Q = H == null ? undefined : H.getContext("2d");
    const q = Y == null ? undefined : Y.getContext("2d");
    if (!!r && !!H && !!Y && !!Q && !!q) {
      g(null);
      m(true);
      try {
        const Z = Q.getImageData(0, 0, H.width, H.height);
        const rt = q.getImageData(0, 0, Y.width, Y.height);
        const at = DS(rt.data, Y.width, Y.height);
        if (pw(at) === 0) {
          throw new Error("请先涂抹或框选需要去除的水印区域");
        }
        const ct = iR(Z.data, H.width, H.height, at, D);
        const xt = document.createElement("canvas");
        xt.width = H.width;
        xt.height = H.height;
        const Tt = xt.getContext("2d");
        if (!Tt) {
          throw new Error("无法创建输出画布");
        }
        Tt.putImageData(new ImageData(ct.data, H.width, H.height), 0, 0);
        const R = await new Promise<Blob>((tt, U) => {
          xt.toBlob(F => {
            if (F) {
              tt(F);
            } else {
              U(new Error("结果导出失败"));
            }
          }, "image/png");
        });
        const st = URL.createObjectURL(R);
        n(tt => {
          if (tt) {
            URL.revokeObjectURL(tt);
          }
          return st;
        });
        p(ct.stats);
      } catch (Z) {
        g(Z instanceof Error ? Z.message : "去水印失败");
      } finally {
        m(false);
      }
    }
  }, [r, D]);
  const B = React.useCallback(() => {
    if (!r || !e) {
      return;
    }
    const H = document.createElement("a");
    H.href = e;
    H.download = aR(r.file.name);
    H.click();
  }, [r, e]);
  const j = React.useCallback((H, Y) => {
    u(Q => ({
      ...Q,
      [H]: Y
    }));
    n(Q => {
      if (Q) {
        URL.revokeObjectURL(Q);
      }
      return null;
    });
    p(null);
  }, []);
  return <div className="watermark-removal"><div className="watermark-removal-header"><h1 className="module-title">图片去水印</h1><div className="header-actions"><button className="btn btn-secondary" onClick={L}><span>🗑️</span>清空</button></div></div><div className="watermark-removal-body">{!r && <section className="watermark-upload-zone" onDrop={$} onDragOver={H => H.preventDefault()} onClick={() => {
        var H;
        if ((H = y.current) == null) {
          return undefined;
        } else {
          return H.click();
        }
      }}><input ref={y} type="file" accept="image/*" onChange={H => {
          var Y;
          return ((Y = H.target.files) == null ? undefined : Y[0]) && _(H.target.files[0]);
        }} style={{
          display: "none"
        }} /><div className="watermark-upload-icon">WM</div><div className="watermark-upload-title">拖拽图片到此处或点击上传</div><div className="watermark-upload-hint">框选或涂抹水印区域后生成修复图片</div></section>}{w && <div className="error-box"><span className="error-icon">⚠️</span><span>{w}</span></div>}{r && <div className="watermark-workspace"><section className="watermark-editor-card"><div className="panel-header"><span className="panel-title">原图与遮罩</span><span className="format-badge">MASK</span></div><div className="watermark-canvas-shell"><canvas ref={x} className="watermark-image-canvas" /><canvas ref={A} className="watermark-mask-canvas" onPointerDown={k} onPointerMove={G} onPointerUp={K} onPointerCancel={K} /></div><div className="watermark-image-info"><div><span>尺寸</span><strong>{r.width} × {r.height}</strong></div><div><span>大小</span><strong>{formatBytes(r.size)}</strong></div><div><span>已选区域</span><strong>{h.toLocaleString()} px</strong></div></div></section><aside className="watermark-control-card"><div className="tool-mode-switch"><button className={s === "brush" ? "active" : ""} onClick={() => i("brush")}>画笔</button><button className={s === "rectangle" ? "active" : ""} onClick={() => i("rectangle")}>框选</button></div><label className="watermark-setting-field"><span>画笔大小：{a}px</span><input type="range" min="8" max="120" step="2" value={a} onChange={H => o(Number(H.target.value))} /></label><label className="watermark-setting-field"><span>采样半径：{D.radius}px</span><input type="range" min="2" max="24" value={D.radius} onChange={H => j("radius", Number(H.target.value))} /></label><label className="watermark-setting-field"><span>融合次数：{D.iterations}</span><input type="range" min="1" max="6" value={D.iterations} onChange={H => j("iterations", Number(H.target.value))} /></label><div className="watermark-actions"><button className="btn btn-secondary" onClick={X} disabled={v}>清除遮罩</button><button className="btn btn-primary" onClick={W} disabled={v}>{v ? "处理中..." : "去除水印"}</button></div></aside><section className="watermark-result-card"><div className="panel-header"><span className="panel-title">处理结果</span>{e && <span className="format-badge success">PNG</span>}</div><div className="watermark-result-preview">{e ? <img src={e} alt="去水印结果" /> : <div className="watermark-empty-result">生成后在这里预览结果</div>}</div>{f && <div className="watermark-result-meta"><span>处理像素：{f.filledPixels.toLocaleString()}</span><span>遮罩像素：{f.maskedPixels.toLocaleString()}</span></div>}{e && <button className="btn btn-primary watermark-download-btn" onClick={B}>下载图片</button>}</section></div>}</div></div>;
}

export default WatermarkRemoval;
