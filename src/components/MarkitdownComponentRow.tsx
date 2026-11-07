import * as React from "react";
import {
  downloadMarkitdown,
  getMarkitdownStatus,
  onMarkitdownProgress,
  type MarkitdownStatus,
} from "../plugins/client";

function MarkitdownComponentRow() {
  const [status, setStatus] = React.useState<MarkitdownStatus | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMarkitdownStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    const remove = onMarkitdownProgress((percent) => {
      if (!cancelled) setProgress(percent >= 100 ? null : percent);
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, []);

  const download = async () => {
    setError(null);
    setProgress(0);
    try {
      const next = await downloadMarkitdown();
      setStatus(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="plugin-row">
      <span className="plugin-icon">📄</span>
      <div className="plugin-info">
        <span className="plugin-name">文档转换组件</span>
        <span className="plugin-meta">
          MarkItDown
          <span className="plugin-meta-sep">·</span>
          {status?.installed ? "已安装" : "未安装"}
          {status?.installed && (
            <>
              <span className="plugin-meta-sep">·</span>
              v{status.version}
            </>
          )}
        </span>
        <span className="plugin-description">用于文档转 Markdown，按需下载，不随安装包分发。</span>
        {error && <span className="plugin-progress">{error}</span>}
      </div>
      <div className="plugin-actions">
        {progress !== null ? (
          <span className="plugin-progress">下载中 {progress}%</span>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => void download()}>
            {status?.installed ? "重新下载" : "下载组件"}
          </button>
        )}
      </div>
    </div>
  );
}

export default MarkitdownComponentRow;
