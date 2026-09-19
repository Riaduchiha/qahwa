import type { Config } from "tailwindcss";

// Palette définitive fournie par Imad (26/08) : néo-brutaliste noir/orange.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
       qahwa: {
  noir: "#0A0A0A",
  orange: "#FF6B00",
  "orange-vif": "#FF8A2B",
  blanc: "#FFFFFF",

  creme: "#0A0A0A",

  black: "#0A0A0A",
  red: "#FF6B00",
  yellow: "#FF8A2B",
  green: "#0cfd6c",
  rouge: "#E23D3D",

  ink: "#0A0A0A",
  cream: "#0A0A0A",

  bg: "#121212",
  panel: "#1B1B1B",
  panel2: "#232323",
  border: "#2E2E2E",
  text: "#FFFFFF",
  muted: "#9A9A9A",
},
      },
      keyframes: {
        "qahwa-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "qahwa-blink": "qahwa-blink 1s ease-in-out infinite",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        qahwa: "16px",
      },
      boxShadow: {
        brutal: "6px 6px 0px 0px #0A0A0A",
        "brutal-sm": "3px 3px 0px 0px #0A0A0A",
        "brutal-orange": "6px 6px 0px 0px #FF6B00",
        panel: "0 1px 2px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
