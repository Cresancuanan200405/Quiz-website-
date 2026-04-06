import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ["var(--font-sora)", "sans-serif"],
        "dm-sans": ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        arcade: {
          bg: "#0A0B14",
          violet: "#7C3AED",
          green: "#22C55E",
          red: "#EF4444",
          amber: "#F59E0B",
          blue: "#3B82F6",
          orange: "#F97316",
        },
      },
      boxShadow: {
        "violet-glow": "0 12px 38px rgba(124, 58, 237, 0.42)",
        "green-glow": "0 12px 38px rgba(34, 197, 94, 0.35)",
        "red-glow": "0 12px 38px rgba(239, 68, 68, 0.35)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "33%": { transform: "translateY(-20px) translateX(10px)" },
          "66%": { transform: "translateY(10px) translateX(-8px)" },
        },
        "float-medium": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "float-fast": {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "50%": { transform: "translateY(-10px) translateX(6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 rgba(124,58,237,0.35)" },
          "50%": { boxShadow: "0 0 22px rgba(124,58,237,0.6)" },
        },
        "count-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "float-slow": "float-slow 12s ease-in-out infinite",
        "float-medium": "float-medium 8s ease-in-out infinite",
        "float-fast": "float-fast 6s ease-in-out infinite",
        shimmer: "shimmer 4s linear infinite",
        "pulse-glow": "pulse-glow 1.4s ease-in-out infinite",
        "count-up": "count-up 0.5s ease forwards",
      },
      borderRadius: {
        card: "12px",
        button: "10px",
      },
    },
  },
};

export default config;
