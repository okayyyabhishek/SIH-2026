import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Government of India Official Palette
        gov: {
          blue: "#003580",
          "blue-dark": "#002a66",
          "blue-light": "#0052cc",
          navy: "#000080",
          saffron: "#FF9933",
          "saffron-dark": "#e68a2e",
          green: "#138808",
          "green-dark": "#0e6b06",
          cream: "#FDF8F3",
          "warm-gray": "#F5F1EC",
        },
        // Operational deep slate palette (dark mode)
        sentinel: {
          950: "#06090e",
          900: "#0a0f18",
          850: "#0f1624",
          800: "#152033",
          700: "#1e2c45",
          600: "#2d3f5e",
          500: "#4b6084",
          400: "#7b91b5",
          300: "#a9b9d3",
          200: "#cbd6e7",
          100: "#e5ecf6",
          50: "#f4f7fb",
        },
        // Operational Semantic Colors
        op: {
          critical: "#ef4444",
          "critical-subtle": "rgba(239, 68, 68, 0.15)",
          "critical-border": "rgba(239, 68, 68, 0.35)",
          warning: "#f59e0b",
          "warning-subtle": "rgba(245, 158, 11, 0.15)",
          "warning-border": "rgba(245, 158, 11, 0.35)",
          advisory: "#0284c7",
          "advisory-subtle": "rgba(2, 132, 199, 0.12)",
          "advisory-border": "rgba(2, 132, 199, 0.30)",
          nominal: "#10b981",
          "nominal-subtle": "rgba(16, 185, 129, 0.15)",
          "nominal-border": "rgba(16, 185, 129, 0.35)",
          ledger: "#8b5cf6",
          "ledger-subtle": "rgba(139, 92, 246, 0.15)",
          "ledger-border": "rgba(139, 92, 246, 0.35)",
        },
      },
      boxShadow: {
        "gov-sm": "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "gov-md": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        "gov-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        "gov-card": "0 1px 4px 0 rgba(0, 53, 128, 0.06), 0 0 0 1px rgba(0, 53, 128, 0.04)",
        // Legacy dark mode shadows
        "liquid-sm": "0 2px 8px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        "liquid-md": "0 8px 24px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)",
        "liquid-glow": "0 0 20px -2px rgba(0, 210, 255, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-sans)", "Inter", "Noto Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        heading: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "'Liberation Mono'", "monospace"],
      },
      borderRadius: {
        "gov": "0.5rem",
        "gov-lg": "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
