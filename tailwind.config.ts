import type { Config } from "tailwindcss";

/**
 * Gulf Property Alpha — clean, calm LIGHT theme: white surfaces, black accents,
 * restrained signal colors. The same semantic token names are reused across the
 * app, so the whole UI reskins from here.
 *
 * Signal colors are intentionally muted and used sparingly:
 *   green = opportunity   amber = caution   red = risk/overpriced
 *   slate = official data   violet = model-inferred   gray = missing/unverified
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces & text (light)
        terminal: {
          bg: "#f6f7f8",
          panel: "#ffffff",
          panel2: "#f3f4f6",
          border: "#e6e8eb",
          borderHi: "#d3d7dd",
          muted: "#6b7280",
          text: "#3f444c",
          textHi: "#0a0a0a",
        },
        // Semantic provenance / signal colors (muted)
        signal: {
          good: "#15803d",
          goodDim: "#ecfdf3",
          caution: "#b45309",
          cautionDim: "#fff7ed",
          risk: "#b91c1c",
          riskDim: "#fef2f2",
          official: "#334155",
          officialDim: "#f1f5f9",
          inferred: "#6d28d9",
          inferredDim: "#f5f3ff",
          missing: "#9aa1ab",
          missingDim: "#f3f4f6",
        },
        // Primary accent = black
        accent: {
          DEFAULT: "#111111",
          fg: "#ffffff",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.95rem" }],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        card: "0 2px 10px -3px rgba(16,24,40,0.10)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        pulse2: "pulse2 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
