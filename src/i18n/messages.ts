import en from "./en.json";

export type Language = "zh-CN" | "en-US";

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "zh-CN", label: "中文" },
  { value: "en-US", label: "English" },
];

let currentLanguage: Language = "zh-CN";

const patterns: Array<[RegExp, string]> = [
  [/^正在读取 (\d+) \/ (\d+) 张图片$/, "Reading $1 / $2 images"],
  [/^正在读取 (\d+) \/ (\d+) 张图片: (.+)$/, "Reading $1 / $2 images: $3"],
  [/^正在压缩 (\d+) \/ (\d+): (.+)$/, "Compressing $1 / $2: $3"],
  [/^正在转换 (\d+) \/ (\d+): (.+)$/, "Converting $1 / $2: $3"],
  [/^正在打包 (\d+) \/ (\d+): (.+)$/, "Packing $1 / $2: $3"],
  [/^正在打包 (\d+) \/ (\d+) 张图片$/, "Packing $1 / $2 images"],
  [/^正在转换第 (\d+) \/ (\d+) 页$/, "Rendering page $1 / $2"],
  [/^抽取第 (\d+) \/ (\d+) 帧$/, "Extracting frame $1 / $2"],
  [/^已读取 (\d+) 张图片$/, "Read $1 images"],
  [/^已生成 (\d+) 张图片$/, "Generated $1 images"],
  [/^找到 (\d+) 个结果$/, "Found $1 results"],
  [/^共扫描 ([\d,]+) 个文件，找到 (\d+) 个匹配结果$/, "Scanned $1 files, found $2 matches"],
  [/^已扫描 ([\d,]+) 个文件\.\.\.$/, "Scanned $1 files..."],
  [/^已截图 \((\d+)\)$/, "Screenshots ($1)"],
  [/^第 (\d+) 页$/, "Page $1"],
  [/^(\d+) 页$/, "$1 pages"],
  [/^(\d+) 张图片$/, "$1 images"],
  [/^(\d+) 张已转换$/, "$1 converted"],
  [/^(\d+) 张已压缩$/, "$1 compressed"],
  [/^准备压缩 (\d+) 张图片$/, "Preparing to compress $1 images"],
  [/^(\d+) 张，失败 (\d+) 张$/, "$1 succeeded, $2 failed"],
  [/^完成 (\d+)%$/, "Completed $1%"],
  [/^减少 (\d+)%$/, "Reduced $1%"],
  [/^质量 (\d+)%$/, "Quality $1%"],
  [/^原图 (.+)$/, "Original $1"],
  [/^输出 (.+)$/, "Output $1"],
  [/^目标 ≤ (.+)$/, "Target ≤ $1"],
  [/^(\d+) 项$/, "$1 items"],
  [/^\[(\d+) 项\]$/, "[$1 items]"],
  [/^第 (\d+) 行，第 (\d+) 列 - ([\s\S]*)$/, "Line $1, column $2 - $3"],
  [/^JSON 语法错误：第 (\d+) 行，第 (\d+) 列 - ([\s\S]*)$/, "JSON syntax error: line $1, column $2 - $3"],
  [/^JSON 语法错误：([\s\S]*)$/, "JSON syntax error: $1"],
  [/^MarkItDown 退出码：([\s\S]*)$/, "MarkItDown exit code: $1"],
  [/^sips 退出码：([\s\S]*)$/, "sips exit code: $1"],
  [/^MarkItDown 转换失败：([\s\S]*)$/, "MarkItDown conversion failed: $1"],
  [/^获取屏幕源失败: ([\s\S]*)$/, "Failed to get screen sources: $1"],
  [/^截图失败: ([\s\S]*)$/, "Capture failed: $1"],
  [/^框选截图失败: ([\s\S]*)$/, "Area capture failed: $1"],
  [/^选择目录失败: ([\s\S]*)$/, "Failed to select directory: $1"],
  [/^检查权限失败: ([\s\S]*)$/, "Permission check failed: $1"],
  [/^裁剪截图失败: ([\s\S]*)$/, "Failed to crop screenshot: $1"],
  [/^复制失败: ([\s\S]*)$/, "Copy failed: $1"],
  [/^加载模块顺序失败: ([\s\S]*)$/, "Failed to load module order: $1"],
  [/^搜索失败：([\s\S]*)$/, "Search failed: $1"],
  [/^发现新版本 v(.+)$/, "New version v$1 available"],
  [/^完成 (\d+) 张，失败 (\d+) 张$/, "$1 succeeded, $2 failed"],
  [/^已完成 (\d+) 张图片压缩$/, "Compressed $1 images"],
  [/^已完成 (\d+) 张图片转换$/, "Converted $1 images"],
  [/^最低质量仍超过 (.+)$/, "Even at the lowest quality it exceeds $1"],
  [/^(\d+) 分 (\d+) 秒$/, "$1m $2s"],
  [/^([\d.]+) 秒$/, "$1s"],
  [/^(.*)-去水印\.png$/, "$1-watermark-removed.png"],
  [/^\{(\d+) 项\}$/, "{$1 items}"],
  [/^正在打包图片$/, "Packing images"],
  [/^安装中 (\d+)%$/, "Installing $1%"],
  [/^下载中 (\d+)%$/, "Downloading $1%"],
  [/^更新于 (.+)$/, "Updated $1"],
  [/^更新 v(.+)$/, "Update v$1"],
  [/^转换超时，请确认文件大小或 MarkItDown 安装状态$/, "Conversion timed out. Check the file size or MarkItDown installation."],
];

export function translate(language: Language, text: string): string {
  if (language !== "en-US") return text;
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  const leading = match?.[1] ?? "";
  const core = match?.[2] ?? text;
  const trailing = match?.[3] ?? "";
  const exact = (en as Record<string, string>)[core];
  if (exact !== undefined) return leading + exact + trailing;
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(core)) {
      return leading + core.replace(pattern, replacement) + trailing;
    }
  }
  return text;
}

export function setLanguage(language: Language) {
  currentLanguage = language === "en-US" ? "en-US" : "zh-CN";
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(text: string): string {
  return translate(currentLanguage, text);
}
