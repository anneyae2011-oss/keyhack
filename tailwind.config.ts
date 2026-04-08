import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          pink: "#FF2D78",
          "pink-light": "#FF6BA8",
          "pink-glow": "#FF2D7840",
          magenta: "#E91E8C",
          dark: "#0A0010",
          darker: "#050008",
          card: "#110020",
          border: "#3D0060",
          purple: "#7B00FF",
          "purple-dim": "#4A0099",
          cyan: "#00F5FF",
          text: "#F0D0FF",
          muted: "#9060B0",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "Courier", "monospace"],
        display: ["'Orbitron'", "sans-serif"],
      },
      boxShadow: {
        "cyber-pink": "0 0 20px #FF2D7880, 0 0 40px #FF2D7840",
        "cyber-purple": "0 0 20px #7B00FF80, 0 0 40px #7B00FF40",
        "cyber-card": "0 0 30px #FF2D7820, inset 0 0 30px #7B00FF10",
      },
      animation: {
        "pulse-pink": "pulse-pink 2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        flicker: "flicker 4s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-pink": {
          "0%, 100%": { boxShadow: "0 0 10px #FF2D7860" },
          "50%": { boxShadow: "0 0 30px #FF2D78, 0 0 60px #FF2D7880" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 95%, 100%": { opacity: "1" },
          "96%": { opacity: "0.8" },
          "97%": { opacity: "1" },
          "98%": { opacity: "0.6" },
          "99%": { opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { textShadow: "0 0 10px #FF2D78, 0 0 20px #FF2D78" },
          "50%": { textShadow: "0 0 20px #FF2D78, 0 0 40px #FF2D78, 0 0 60px #FF2D78" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
