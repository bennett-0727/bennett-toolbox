import * as React from "react";
import FormatItem from "../components/FormatItem";

const xP = r => {
  const t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(r);
  if (t) {
    return {
      r: parseInt(t[1], 16),
      g: parseInt(t[2], 16),
      b: parseInt(t[3], 16)
    };
  } else {
    return null;
  }
};
const bP = (r, t, e) => {
  r /= 255;
  t /= 255;
  e /= 255;
  const n = Math.max(r, t, e);
  const s = Math.min(r, t, e);
  let i = 0;
  let a;
  let o = (n + s) / 2;
  if (n === s) {
    i = a = 0;
  } else {
    const c = n - s;
    a = o > 0.5 ? c / (2 - n - s) : c / (n + s);
    switch (n) {
      case r:
        i = (t - e) / c + (t < e ? 6 : 0);
        break;
      case t:
        i = (e - r) / c + 2;
        break;
      case e:
        i = (r - t) / c + 4;
        break;
    }
    i /= 6;
  }
  return {
    h: Math.round(i * 360),
    s: Math.round(a * 100),
    l: Math.round(o * 100)
  };
};
function ColorPicker() {
  const [r, t] = React.useState({
    hex: "#5078FF",
    rgb: "rgb(80, 120, 255)",
    hsl: "hsl(226, 100%, 66%)"
  });
  const [e, n] = React.useState([]);
  const [s, i] = React.useState(false);
  const [a, o] = React.useState(null);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem("bennett-color-history");
      if (v) {
        const m = JSON.parse(v);
        n(m.map(w => ({
          ...w,
          time: new Date(w.time)
        })));
      }
    } catch (v) {
      console.error("Failed to load history", v);
    }
  }, []);
  const c = React.useCallback(v => {
    n(v);
    localStorage.setItem("bennett-color-history", JSON.stringify(v));
  }, []);
  const u = React.useCallback((v, m, w) => {
    const g = {
      id: Date.now().toString(),
      hex: v,
      rgb: m,
      hsl: w,
      time: new Date()
    };
    n(y => {
      if (y.length > 0 && y[0].hex === v) {
        return y;
      }
      const x = [g, ...y].slice(0, 50);
      c(x);
      return x;
    });
  }, [c]);
  const h = async () => {
    if (!window.EyeDropper) {
      o("您的浏览器版本不支持原生取色器");
      return;
    }
    i(true);
    o(null);
    try {
      const w = (await new window.EyeDropper().open()).sRGBHex;
      const g = xP(w);
      if (g) {
        const y = `rgb(${g.r}, ${g.g}, ${g.b})`;
        const x = bP(g.r, g.g, g.b);
        const A = `hsl(${x.h}, ${x.s}%, ${x.l}%)`;
        t({
          hex: w,
          rgb: y,
          hsl: A
        });
        u(w, y, A);
      }
    } catch (v) {
      console.log("Pick cancelled or failed", v);
    } finally {
      i(false);
    }
  };
  const d = v => {
    navigator.clipboard.writeText(v);
  };
  const f = () => {
    n([]);
    localStorage.removeItem("bennett-color-history");
  };
  const p = v => {
    t({
      hex: v.hex,
      rgb: v.rgb,
      hsl: v.hsl
    });
  };
  return <div className="color-picker-module"><div className="picker-header"><h1 className="module-title">🎨 屏幕取色器</h1></div><div className="main-panel"><div className="color-display"><div className="color-preview" style={{
          backgroundColor: r.hex
        }}><button className="pick-btn-overlay" onClick={h} disabled={s}>{s ? "正在取色..." : "🍭 点击开始吸取颜色"}</button></div><div className="color-preview-info"><div className="color-value-large">{r.hex.toUpperCase()}</div><div className="formats-list"><FormatItem label="HEX" value={r.hex.toUpperCase()} onCopy={d} /><FormatItem label="RGB" value={r.rgb} onCopy={d} /><FormatItem label="HSL" value={r.hsl} onCopy={d} /><FormatItem label="CSS" value={`background-color: ${r.hex};`} onCopy={d} /></div></div></div><div className="history-panel"><div className="history-header"><span className="history-title">历史记录</span>{e.length > 0 && <button className="btn btn-text btn-sm" onClick={f}>清空</button>}</div><div className="history-list">{e.length === 0 ? <div className="empty-history">暂无历史记录</div> : e.map(v => <div className="history-item" onClick={() => p(v)} key={v.id}><div className="history-color-preview" style={{
              backgroundColor: v.hex
            }} /><div className="history-info"><div className="history-hex">{v.hex.toUpperCase()}</div><div className="history-time">{v.time.toLocaleTimeString()}</div></div></div>)}</div></div></div>{a && <div className="error-message" style={{
      color: "#ff5f56",
      marginTop: 10
    }}>⚠️ {a}</div>}</div>;
}

export default ColorPicker;
