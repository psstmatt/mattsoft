export const THEME_STORAGE_KEY = "psstmatt.theme";

export const THEME_FAVICONS = {
  dark: {
    "theme-favicon-ico": "/favicon-night.ico",
    "theme-favicon-16": "/favicon-night-16x16.png",
    "theme-favicon-32": "/favicon-night-32x32.png",
    "theme-favicon-48": "/favicon-night-48x48.png",
    "theme-apple-touch-icon": "/apple-touch-icon-night.png",
  },
  light: {
    "theme-favicon-ico": "/favicon-day.ico",
    "theme-favicon-16": "/favicon-day-16x16.png",
    "theme-favicon-32": "/favicon-day-32x32.png",
    "theme-favicon-48": "/favicon-day-48x48.png",
    "theme-apple-touch-icon": "/apple-touch-icon-day.png",
  },
} as const;

export function readStoredTheme(): boolean {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return stored ? stored === "dark" : true;
}

export function syncThemeFavicons(dark: boolean): void {
  const favicons = THEME_FAVICONS[dark ? "dark" : "light"];
  for (const [id, href] of Object.entries(favicons)) {
    const link = document.getElementById(id);
    if (link instanceof HTMLLinkElement && link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  }
}

export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  syncThemeFavicons(dark);
}

export function persistTheme(dark: boolean): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}
