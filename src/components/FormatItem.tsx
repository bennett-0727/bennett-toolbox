import * as React from "react";

interface FormatItemProps {
  label: string;
  value: string;
  onCopy: (value: string) => void;
}

function FormatItem({ label, value, onCopy }: FormatItemProps) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    onCopy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="format-item">
      <span className="format-label">{label}</span>
      <span className="format-value">{value}</span>
      <div className="copy-btn-icon" onClick={handleCopy} title="复制">
        {copied ? "✅" : "📋"}
      </div>
    </div>
  );
}

export default FormatItem;
