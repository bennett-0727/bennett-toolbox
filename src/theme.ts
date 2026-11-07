export const SUPPORTED_THEMES = [
  "glass-dark",
  "glass-light",
  "glass-aurora",
  "glass-ocean",
  "glass-sunset",
] as const;

export type Theme = (typeof SUPPORTED_THEMES)[number];

const THEME_KEY = "bennett-theme";

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && (SUPPORTED_THEMES as readonly string[]).includes(saved)) {
      return saved as Theme;
    }
  } catch {}
  return "glass-dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}
