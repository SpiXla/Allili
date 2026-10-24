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
        // Deep gray scale
        surface: {
          DEFAULT: "#0a0a0f",
          50: "#06060a",
          100: "#0a0a0f",
          200: "#111118",
          300: "#18181f",
          400: "#1e1e28",
          500: "#252530",
          600: "#2e2e3a",
          700: "#3a3a48",
          800: "#4a4a58",
          900: "#5a5a68",
        },
        // Neon purple accent
        accent: {
          DEFAULT: "#a855f7",
          50: "#f5f0ff",
          100: "#ede5ff",
          200: "#dccfff",
          300: "#c4a8ff",
          400: "#a855f7",
          500: "#9333ea",
          600: "#7c22ce",
          700: "#6b21a8",
          800: "#581c87",
          900: "#3b0764",
        },
        // Neon blue accent
        neon: {
          DEFAULT: "#38bdf8",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#b9e6fe",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        foreground: "#ededed",
        muted: "#888899",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-accent":
          "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)",
        "gradient-accent-subtle":
          "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(56,189,248,0.15) 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(168, 85, 247, 0.3)",
        "glow-lg": "0 0 40px rgba(168, 85, 247, 0.4)",
        "glow-blue": "0 0 20px rgba(56, 189, 248, 0.3)",
        "glow-blue-lg": "0 0 40px rgba(56, 189, 248, 0.4)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(168, 85, 247, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(168, 85, 247, 0.5)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
