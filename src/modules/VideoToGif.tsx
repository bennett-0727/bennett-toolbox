import * as React from "react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const GP = 0.5;
const IS = 12;
const VP = 1;
const XP = 15;
const YP = 120;
const KP = 960;
const QP = 16;
const ZP = 256;
const ad = (r, t, e) => Number.isNaN(r) ? t : Math.min(e, Math.max(t, r));
const l0 = (r, t) => {
  const e = Math.max(0, t);
  const n = ad(r.startTime, 0, e);
  const s = Math.max(0, e - n);
  const i = Math.min(IS, s || IS);
  return {
    startTime: n,
    duration: ad(r.duration, Math.min(GP, i), i),
    fps: Math.round(ad(r.fps, VP, XP)),
    width: Math.round(ad(r.width, YP, KP)),
    quality: Math.round(ad(r.quality, QP, ZP))
  };
};
const JP = r => {
  const t = Math.max(1, Math.round(r.duration * r.fps));
  const e = Math.round(1000 / r.fps);
  const n = Array.from({
    length: t
  }, (s, i) => Number((r.startTime + i / r.fps).toFixed(3)));
  return {
    delay: e,
    frameCount: t,
    times: n
  };
};
const qP = r => `${r.replace(/\.[^.]+$/, "") || "converted-video"}.gif`;
const tR = r => {
  if (r < 60) {
    return `${r.toFixed(1)} 秒`;
  }
  const t = Math.floor(r / 60);
  const e = Math.round(r % 60);
  return `${t} 分 ${e} 秒`;
};
const formatBytes = r => r < 1024 ? `${r} B` : r < 1048576 ? `${(r / 1024).toFixed(1)} KB` : `${(r / 1048576).toFixed(2)} MB`;
const Nc = {
  startTime: 0,
  duration: 6,
  fps: 8,
  width: 640,
  quality: 128
};
const eR = (r: string) => new Promise<{ duration: number; width: number; height: number }>((t, e) => {
  const n = document.createElement("video");
  n.preload = "metadata";
  n.muted = true;
  n.onloadedmetadata = () => {
    t({
      duration: n.duration,
      width: n.videoWidth,
      height: n.videoHeight
    });
  };
  n.onerror = () => e(new Error("无法读取视频信息，请确认文件格式是否受支持"));
  n.src = r;
});
const nR = (r, t) => new Promise<void>((e, n) => {
  const s = () => {
    r.removeEventListener("seeked", i);
    r.removeEventListener("error", a);
  };
  const i = () => {
    s();
    e();
  };
  const a = () => {
    s();
    n(new Error("读取视频帧失败"));
  };
  r.addEventListener("seeked", i, {
    once: true
  });
  r.addEventListener("error", a, {
    once: true
  });
  r.currentTime = Math.max(0, t);
});
function VideoToGif() {
  const [r, t] = React.useState(null);
  const [e, n] = React.useState(Nc);
  const [s, i] = React.useState(null);
  const [a, o] = React.useState(false);
  const [c, u] = React.useState(0);
  const [h, d] = React.useState("");
  const [f, p] = React.useState(null);
  const v = React.useRef(null);
  const m = React.useRef(null);
  const w = React.useRef(null);
  const g = React.useMemo(() => l0(e, (r == null ? undefined : r.duration) || Nc.duration), [e, r]);
  React.useEffect(() => () => {
    if (r != null && r.url) {
      URL.revokeObjectURL(r.url);
    }
    if (s != null && s.url) {
      URL.revokeObjectURL(s.url);
    }
  }, [r, s]);
  const y = React.useCallback((D, T) => {
    n(O => ({
      ...O,
      [D]: T
    }));
    i(null);
    p(null);
  }, []);
  const x = React.useCallback(async D => {
    if (!D.type.startsWith("video/")) {
      p("请选择视频文件");
      return;
    }
    const T = URL.createObjectURL(D);
    p(null);
    i(null);
    u(0);
    d("");
    try {
      const O = await eR(T);
      if (!Number.isFinite(O.duration) || O.duration <= 0) {
        throw new Error("无法读取视频时长");
      }
      t(_ => {
        if (_ != null && _.url) {
          URL.revokeObjectURL(_.url);
        }
        return {
          file: D,
          url: T,
          name: D.name,
          size: D.size,
          duration: O.duration,
          width: O.width,
          height: O.height
        };
      });
      n(_ => l0({
        ..._,
        duration: Math.min(Nc.duration, O.duration),
        width: Math.min(Nc.width, O.width || Nc.width)
      }, O.duration));
    } catch (O) {
      URL.revokeObjectURL(T);
      p(O instanceof Error ? O.message : "视频读取失败");
    }
  }, []);
  const A = React.useCallback(D => {
    D.preventDefault();
    const T = D.dataTransfer.files[0];
    if (T) {
      x(T);
    }
  }, [x]);
  const E = React.useCallback(async () => {
    if (!!r && !!m.current && !!w.current) {
      o(true);
      p(null);
      i(D => {
        if (D != null && D.url) {
          URL.revokeObjectURL(D.url);
        }
        return null;
      });
      u(0);
      d("准备抽取视频帧");
      try {
        const D = l0(e, r.duration);
        const T = JP(D);
        const O = m.current;
        const _ = w.current;
        const M = r.width > 0 ? D.width / r.width : 1;
        const z = Math.max(1, Math.round(D.width));
        const k = Math.max(1, Math.round((r.height || D.width) * M));
        _.width = z;
        _.height = k;
        const G = _.getContext("2d", {
          willReadFrequently: true
        });
        if (!G) {
          throw new Error("无法初始化画布");
        }
        O.pause();
        const K = GIFEncoder();
        for (let B = 0; B < T.times.length; B += 1) {
          const j = T.times[B];
          d(`抽取第 ${B + 1} / ${T.frameCount} 帧`);
          await nR(O, Math.min(j, r.duration - 0.05));
          G.drawImage(O, 0, 0, z, k);
          const H = G.getImageData(0, 0, z, k);
          const Y = quantize(H.data, D.quality);
          const Q = applyPalette(H.data, Y);
          K.writeFrame(Q, z, k, {
            palette: Y,
            delay: T.delay,
            repeat: 0
          });
          u(Math.round((B + 1) / T.frameCount * 95));
        }
        d("正在写入 GIF 文件");
        K.finish();
        const $ = K.bytes();
        const X = $.buffer.slice($.byteOffset, $.byteOffset + $.byteLength);
        const L = new Blob([X], {
          type: "image/gif"
        });
        const W = URL.createObjectURL(L);
        i({
          url: W,
          size: L.size,
          name: qP(r.name)
        });
        u(100);
        d("GIF 已生成");
      } catch (D) {
        u(0);
        d("");
        p(D instanceof Error ? D.message : "GIF 生成失败");
      } finally {
        o(false);
      }
    }
  }, [e, r]);
  const I = React.useCallback(() => {
    if (!s) {
      return;
    }
    const D = document.createElement("a");
    D.href = s.url;
    D.download = s.name;
    D.click();
  }, [s]);
  const N = React.useCallback(() => {
    t(D => {
      if (D != null && D.url) {
        URL.revokeObjectURL(D.url);
      }
      return null;
    });
    i(D => {
      if (D != null && D.url) {
        URL.revokeObjectURL(D.url);
      }
      return null;
    });
    n(Nc);
    u(0);
    d("");
    p(null);
    if (v.current) {
      v.current.value = "";
    }
  }, []);
  return <div className="video-to-gif"><div className="video-to-gif-header"><h1 className="module-title">视频转 GIF</h1><div className="header-actions"><button className="btn btn-secondary" onClick={N}><span>🗑️</span>清空</button></div></div><div className="video-to-gif-body"><canvas ref={w} style={{
        display: "none"
      }} />{!r && <section className="video-upload-zone" onDrop={A} onDragOver={D => D.preventDefault()} onClick={() => {
        var D;
        if ((D = v.current) == null) {
          return undefined;
        } else {
          return D.click();
        }
      }}><input ref={v} type="file" accept="video/*" onChange={D => {
          var T;
          return ((T = D.target.files) == null ? undefined : T[0]) && x(D.target.files[0]);
        }} style={{
          display: "none"
        }} /><div className="video-upload-icon">GIF</div><div className="video-upload-title">拖拽视频到此处或点击上传</div><div className="video-upload-hint">支持浏览器可播放的视频格式，如 MP4、WebM、MOV</div></section>}{f && <div className="error-box"><span className="error-icon">⚠️</span><span>{f}</span></div>}{r && <div className="video-workspace"><section className="video-preview-card"><div className="panel-header"><span className="panel-title">源视频</span><span className="format-badge">VIDEO</span></div><video ref={m} src={r.url} className="video-preview" controls={true} muted={true} playsInline={true} preload="auto" /><div className="video-summary"><div className="summary-item"><span className="summary-label">时长</span><span className="summary-value">{tR(r.duration)}</span></div><div className="summary-item"><span className="summary-label">尺寸</span><span className="summary-value">{r.width} × {r.height}</span></div><div className="summary-item"><span className="summary-label">大小</span><span className="summary-value">{formatBytes(r.size)}</span></div></div></section><section className="gif-settings-card"><div className="settings-grid"><label className="setting-field"><span>开始时间：{g.startTime.toFixed(1)} 秒</span><input type="range" min="0" max={Math.max(0, r.duration - 0.5)} step="0.1" value={g.startTime} onChange={D => y("startTime", Number(D.target.value))} /></label><label className="setting-field"><span>截取时长：{g.duration.toFixed(1)} 秒</span><input type="range" min="0.5" max={Math.min(12, r.duration)} step="0.5" value={g.duration} onChange={D => y("duration", Number(D.target.value))} /></label><label className="setting-field"><span>帧率：{g.fps} FPS</span><input type="range" min="1" max="15" step="1" value={g.fps} onChange={D => y("fps", Number(D.target.value))} /></label><label className="setting-field"><span>宽度：{g.width}px</span><input type="range" min="120" max="960" step="20" value={g.width} onChange={D => y("width", Number(D.target.value))} /></label><label className="setting-field"><span>颜色数：{g.quality}</span><input type="range" min="16" max="256" step="16" value={g.quality} onChange={D => y("quality", Number(D.target.value))} /></label></div><button className="btn btn-primary generate-gif-btn" onClick={E} disabled={a}>{a ? "生成中..." : "生成 GIF"}</button>{(a || c > 0) && <div className="gif-progress"><div className="gif-progress-meta"><span>{h}</span><span>{c}%</span></div><div className="gif-progress-track"><div className="gif-progress-fill" style={{
                width: `${c}%`
              }} /></div></div>}</section><section className="gif-result-card"><div className="panel-header"><span className="panel-title">GIF 结果</span>{s && <span className="format-badge success">GIF</span>}</div><div className="gif-result-preview">{s ? <img src={s.url} alt="生成的 GIF 预览" className="gif-preview-image" /> : <div className="gif-empty-state">设置参数后点击生成 GIF</div>}</div>{s && <div className="gif-result-footer"><span>{formatBytes(s.size)}</span><button className="btn btn-primary" onClick={I}>下载 GIF</button></div>}</section></div>}</div></div>;
}

export default VideoToGif;
