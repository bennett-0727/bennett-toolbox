#!/bin/sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/markitdown/markitdown"
SRC="/Applications/Bennett Toolbox.app/Contents/Resources/markitdown/markitdown"
mkdir -p "$ROOT/vendor/markitdown"
if [ -x "$DEST" ]; then
  echo "MarkItDown 已存在: $DEST"
  exit 0
fi
if [ -x "$SRC" ]; then
  cp "$SRC" "$DEST"
  chmod +x "$DEST"
  echo "已复制 MarkItDown: $DEST"
  exit 0
fi
echo "未找到 MarkItDown 可执行文件。请将可执行文件放到 $DEST，或设置 MARKITDOWN_BIN。" >&2
exit 1
