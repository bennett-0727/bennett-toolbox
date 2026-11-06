import * as React from "react";

const MODE_COPY = {
  "zh-to-en": {
    toggleLabel: "中 -> 英",
    placeholder: "请输入中文，如：用户信息、获取列表...",
    buttonLabel: "翻译并生成",
    inputHint: "按 Enter 快速翻译 · 在线翻译中文并生成英文变量名",
    emptyText: "输入中文并点击翻译",
    emptyHint: "支持在线翻译并生成常见命名格式"
  },
  "en-to-zh": {
    toggleLabel: "英 -> 中",
    placeholder: "请输入英文，如：user profile、user_status...",
    buttonLabel: "翻译并生成",
    inputHint: "按 Enter 快速翻译 · 在线翻译英文并保留变量命名生成",
    emptyText: "输入英文并点击翻译",
    emptyHint: "支持连字符、下划线和空格等英文输入形式"
  }
};
const extractWordsFromCamelCase = r => r.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/[^\w\s]/g, " ").split(/\s+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && !/^\d+$/.test(t));
const extractWordsFromEnglish = r => r.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(t => t.length > 0 && !/^\d+$/.test(t));
function NamingConverter() {
  const [r, t] = React.useState("zh-to-en");
  const [e, n] = React.useState("");
  const [s, i] = React.useState("");
  const [a, o] = React.useState([]);
  const [c, u] = React.useState([]);
  const [h, d] = React.useState(false);
  const [f, p] = React.useState(null);
  const [v, m] = React.useState(null);
  const w = async (N, D) => {
    var M;
    const T = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(N)}&langpair=${D}`;
    const _ = await (await fetch(T)).json();
    if (_.responseStatus !== 200 || (M = _.responseData) == null || !M.translatedText) {
      throw new Error("在线翻译失败，请稍后重试");
    }
    return {
      translatedText: String(_.responseData.translatedText).trim()
    };
  };
  const g = N => {
    if (N.length === 0) {
      return [];
    }
    const D = N.map(O => O.toLowerCase());
    const T = N.map(O => O.charAt(0).toUpperCase() + O.slice(1).toLowerCase());
    return [{
      style: "camelCase",
      label: "小驼峰",
      value: D[0] + T.slice(1).join(""),
      description: "首字母小写，后续单词首字母大写"
    }, {
      style: "PascalCase",
      label: "大驼峰",
      value: T.join(""),
      description: "每个单词首字母大写"
    }, {
      style: "snake_case",
      label: "蛇形",
      value: D.join("_"),
      description: "全小写，下划线分隔"
    }, {
      style: "SCREAMING_SNAKE_CASE",
      label: "常量",
      value: D.join("_").toUpperCase(),
      description: "全大写，下划线分隔"
    }, {
      style: "kebab-case",
      label: "短横线",
      value: D.join("-"),
      description: "全小写，短横线分隔"
    }, {
      style: "flatcase",
      label: "全小写",
      value: D.join(""),
      description: "全部连写，无分隔符"
    }];
  };
  const y = React.useCallback(async () => {
    const N = e.trim();
    if (N) {
      d(true);
      p(null);
      i("");
      m(null);
      try {
        const {
          translatedText: D
        } = await w(N, r === "zh-to-en" ? "zh|en" : "en|zh");
        const T = r === "zh-to-en" ? extractWordsFromEnglish(D) : extractWordsFromCamelCase(N);
        i(D);
        o(T);
        u(g(T));
      } catch {
        p("在线翻译失败，请稍后重试");
        i("");
        o([]);
        u([]);
      } finally {
        d(false);
      }
    }
  }, [r, e]);
  const x = React.useCallback(N => {
    if (N.key === "Enter" && !N.shiftKey) {
      N.preventDefault();
      y();
    }
  }, [y]);
  const A = React.useCallback((N, D) => {
    navigator.clipboard.writeText(N);
    m(D);
    setTimeout(() => m(null), 2000);
  }, []);
  const E = React.useCallback(() => {
    n("");
    i("");
    o([]);
    u([]);
    p(null);
    m(null);
  }, []);
  const I = MODE_COPY[r];
  return <div className="translate-naming" data-testid="translate-naming-root-scroll"><div className="translate-naming-header"><h1 className="module-title">变量命名</h1><div className="header-actions"><button className="btn btn-secondary" onClick={E}><span>🗑️</span>清空</button></div></div><div className="translate-naming-body" data-testid="translate-naming-scroll"><div className="input-section"><div className="direction-switch" role="group" aria-label="翻译方向">{["zh-to-en", "en-to-zh"].map(N => <button type="button" className={`direction-btn ${r === N ? "active" : ""}`} onClick={() => t(N)} key={N}>{MODE_COPY[N].toggleLabel}</button>)}</div><div className="input-wrapper"><input type="text" className="translate-input" value={e} onChange={N => n(N.target.value)} onKeyDown={x} placeholder={I.placeholder} /><button className="btn btn-primary translate-btn" onClick={y} disabled={h || !e.trim()}>{h ? <span className="loading-spinner" /> : <React.Fragment><span>🔄</span>{I.buttonLabel}</React.Fragment>}</button></div><div className="input-hint">{I.inputHint}</div></div>{f && <div className="error-box"><span className="error-icon">⚠️</span><span>{f}</span></div>}{s && <div className="translation-card"><div className="section-title">翻译结果</div><div className="translation-meta"><span className="label">{r === "zh-to-en" ? "英文翻译:" : "中文翻译:"}</span><span className="translation-text">{s}</span></div></div>}{a.length > 0 && <div className="english-words"><span className="label">{r === "zh-to-en" ? "英文拆词:" : "命名拆词:"}</span><span className="words">{a.join(" ")}</span></div>}{c.length > 0 && <div className="results-section" data-testid="naming-results-section"><div className="section-title">命名结果</div><div className="results-scroll" data-testid="naming-results-scroll"><div className="results-grid">{c.map((N, D) => <div className={`result-card ${v === D ? "copied" : ""}`} onClick={() => A(N.value, D)} key={N.style}><div className="result-header"><span className="result-label">{N.label}</span><span className="result-style">{N.style}</span></div><div className="result-value">{N.value}</div><div className="result-description">{N.description}</div><div className="copy-hint">{v === D ? "✓ 已复制" : "点击复制"}</div></div>)}</div></div></div>}{c.length === 0 && !f && !h && <div className="empty-state"><div className="empty-icon">Aa</div><div className="empty-text">{I.emptyText}</div><div className="empty-hint">{I.emptyHint}</div></div>}</div></div>;
}

export default NamingConverter;
