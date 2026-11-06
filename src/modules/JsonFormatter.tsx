import * as React from "react";

function JsonInput({
  value: r,
  onChange: t,
  error: e
}) {
  return <div className="json-input-wrapper"><textarea className={`json-input ${e ? "has-error" : ""}`} value={r} onChange={n => t(n.target.value)} placeholder={`在此粘贴 JSON 字符串，例如：
{
  "name": "张三",
  "age": 25
}`} spellCheck={false} />{e && <div className="error-message"><span className="error-icon">⚠️</span><span className="error-text">{e}</span></div>}</div>;
}
function JsonViewer({
  data: r,
  error: t
}) {
  if (t) {
    return <div className="json-viewer-empty"><div className="empty-icon">📋</div><div className="empty-text">请输入有效的 JSON 字符串</div></div>;
  } else if (r == null) {
    return <div className="json-viewer-empty"><div className="empty-icon" /><div className="empty-text">在左侧粘贴 JSON 数据</div><div className="empty-hint">格式化结果将在此显示</div></div>;
  } else {
    return <div className="json-viewer"><JsonNode value={r} isRoot={true} /></div>;
  }
}
function JsonNode({
  value: r,
  keyName: t,
  isRoot: e = false,
  isLast: n = true
}: {
  value: any;
  keyName?: string;
  isRoot?: boolean;
  isLast?: boolean;
}) {
  const [s, i] = React.useState(false);
  const a = React.useCallback(() => {
    i(y => !y);
  }, []);
  const {
    type: o,
    preview: c,
    childCount: u
  } = React.useMemo(() => {
    if (r === null) {
      return {
        type: "null",
        preview: null,
        childCount: 0
      };
    }
    if (Array.isArray(r)) {
      return {
        type: "array",
        preview: `[${r.length} 项]`,
        childCount: r.length
      };
    }
    if (typeof r == "object") {
      const y = Object.keys(r);
      return {
        type: "object",
        preview: `{${y.length} 项}`,
        childCount: y.length
      };
    }
    return {
      type: typeof r,
      preview: null,
      childCount: 0
    };
  }, [r]);
  const h = o === "object" || o === "array";
  const d = u === 0;
  const f = () => t === undefined ? null : <React.Fragment><span className="json-key">"{t}"</span><span className="json-colon">: </span></React.Fragment>;
  const p = () => {
    const y = n ? "" : ",";
    if (r === null) {
      return <span className="json-line">{f()}<span className="json-null">null</span><span className="json-comma">{y}</span></span>;
    } else if (typeof r == "string") {
      return <span className="json-line">{f()}<span className="json-string">"{escapeJsonString(r)}"</span><span className="json-comma">{y}</span></span>;
    } else if (typeof r == "number") {
      return <span className="json-line">{f()}<span className="json-number">{String(r)}</span><span className="json-comma">{y}</span></span>;
    } else if (typeof r == "boolean") {
      return <span className="json-line">{f()}<span className="json-boolean">{String(r)}</span><span className="json-comma">{y}</span></span>;
    } else {
      return null;
    }
  };
  if (!h) {
    return <div className="json-node">{p()}</div>;
  }
  const v = o === "array" ? "[" : "{";
  const m = o === "array" ? "]" : "}";
  const w = n ? "" : ",";
  if (d) {
    return <div className="json-node"><span className="json-line">{f()}<span className="json-bracket">{v}{m}</span><span className="json-comma">{w}</span></span></div>;
  }
  const g = o === "array" ? r : Object.entries(r);
  return <div className={`json-node ${e ? "is-root" : ""}`}><div className={`json-line expandable ${s ? "collapsed" : ""}`} onClick={a}><span className="expand-icon">{s ? "▶" : "▼"}</span>{f()}<span className="json-bracket">{v}</span>{s && <React.Fragment><span className="json-preview">{c}</span><span className="json-bracket">{m}</span><span className="json-comma">{w}</span></React.Fragment>}</div>{!s && <React.Fragment><div className="json-children">{o === "array" ? g.map((y, x) => <JsonNode value={y} isLast={x === g.length - 1} key={x} />) : g.map(([y, x], A) => <JsonNode keyName={y} value={x} isLast={A === g.length - 1} key={y} />)}</div><div className="json-line"><span className="json-bracket">{m}</span><span className="json-comma">{w}</span></div></React.Fragment>}</div>;
}
function escapeJsonString(r) {
  return r.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
}
function JsonFormatter() {
  const [r, t] = React.useState("");
  const [e, n] = React.useState(null);
  const [s, i] = React.useState(null);
  const a = React.useCallback(d => {
    t(d);
    if (!d.trim()) {
      n(null);
      i(null);
      return;
    }
    try {
      const f = JSON.parse(d);
      n(f);
      i(null);
    } catch (f) {
      n(null);
      if (f instanceof SyntaxError) {
        const p = f.message.match(/position (\d+)/);
        const v = p ? parseInt(p[1]) : null;
        if (v !== null) {
          const m = d.substring(0, v).split(`
`);
          const w = m.length;
          const g = m[m.length - 1].length + 1;
          i(`JSON 语法错误：第 ${w} 行，第 ${g} 列 - ${f.message}`);
        } else {
          i(`JSON 语法错误：${f.message}`);
        }
      } else {
        i("解析错误");
      }
    }
  }, []);
  const o = React.useCallback(() => {
    t("");
    n(null);
    i(null);
  }, []);
  const c = React.useCallback(() => {
    if (e !== null) {
      const d = JSON.stringify(e, null, 2);
      navigator.clipboard.writeText(d);
    }
  }, [e]);
  const u = React.useCallback(() => {
    if (e !== null) {
      const d = JSON.stringify(e, null, 2);
      t(d);
    }
  }, [e]);
  const h = React.useCallback(() => {
    if (e !== null) {
      const d = JSON.stringify(e);
      t(d);
    }
  }, [e]);
  return <div className="json-formatter"><div className="json-formatter-header"><h1 className="module-title">JSON 格式化</h1><div className="header-actions"><button className="btn btn-secondary" onClick={o}><span>🗑️</span>清空</button><button className="btn btn-secondary" onClick={h} disabled={!e}><span>📦</span>压缩</button><button className="btn btn-secondary" onClick={u} disabled={!e}><span>✨</span>格式化</button><button className="btn btn-primary" onClick={c} disabled={!e}><span>📋</span>复制结果</button></div></div><div className="json-formatter-body"><div className="panel input-panel"><div className="panel-header"><span className="panel-title">输入 JSON</span>{s && <span className="error-badge">❌ 错误</span>}{e !== null && <span className="success-badge">✓ 有效</span>}</div><JsonInput value={r} onChange={a} error={s} /></div><div className="panel-divider" /><div className="panel output-panel"><div className="panel-header"><span className="panel-title">格式化结果</span>{e !== null && <span className="info-text">点击节点可折叠/展开</span>}</div><JsonViewer data={e} error={s} /></div></div></div>;
}

export default JsonFormatter;
