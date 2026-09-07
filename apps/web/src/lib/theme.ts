import { create } from "zustand";

export type Theme = "dark" | "light" | "high-contrast";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",

  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sentinel_theme", theme);
        applyThemeToDocument(theme);
      } catch {
        // Ignore storage restrictions
      }
    }
  },

  initTheme: () => {
    if (typeof window !== "undefined") {
      try {
        const stored = (localStorage.getItem("sentinel_theme") as Theme) || "light";
        set({ theme: stored });
        applyThemeToDocument(stored);
      } catch {
        applyThemeToDocument("light");
      }
    }
  },
}));

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light", "high-contrast");
  root.classList.add(theme);

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute(
      "content",
      theme === "light" ? "light" : "dark"
    );
  }
}

export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  return { theme, setTheme };
}
