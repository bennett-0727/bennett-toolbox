export function parsePluginVersion(value: string): number[] {
  return value.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
}

export function comparePluginVersions(a: string, b: string): number {
  const left = parsePluginVersion(a);
  const right = parsePluginVersion(b);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
