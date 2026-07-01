// Theme state. Persists the user's choice in localStorage and reflects it by
// toggling the `dark` class on <html> (see index.css). The initial value is
// read in applyTheme() before React mounts to avoid a flash of the wrong theme.
import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Resolves the persisted choice, falling back to the OS preference.
export function initialTheme(): Theme {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  }
  return systemPrefersDark() ? "dark" : "light";
}

// Reflects the theme onto <html> and persists it. Safe to call before render.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
