import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gym: {
          dark: "#090D14",
          card: "#111827",
          cardBorder: "#1F2937",
          accent: "#10B981", // vibrant emerald
          accentHover: "#059669",
          neon: "#22C55E",
          cyan: "#06B6D4",
          gold: "#F59E0B",
          danger: "#EF4444",
          muted: "#9CA3AF"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
      }
    },
  },
  plugins: [],
};
export default config;
