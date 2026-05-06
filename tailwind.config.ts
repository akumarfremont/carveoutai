import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Procedural drama palette
        ink: "#0A0A0A", // black for cold opens, case opens
        bone: "#F4F1EA", // case file paper
        evidence: "#C9A961", // muted yellow-gold (accent / highlighter)
        redaction: "#8B6914", // darker gold for wrong answers
        hairline: "#1F1A12", // hairline on bone
        "hairline-dim": "#2A2A2A", // hairline on ink
        graphite: "#3A3A37", // muted body text on bone
        "graphite-dim": "#7A7A75", // muted secondary
        "ink-soft": "#161616", // panel on ink
        "bone-soft": "#EAE6DD", // alternate panel on bone
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Charter", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        proc: ['"Times New Roman"', "Times", "Liberation Serif", "serif"],
      },
      letterSpacing: {
        proc: "0.18em",
      },
      maxWidth: {
        screen: "440px",
      },
      keyframes: {
        coldFadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        coldFadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        titleZoom: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "30%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        revealIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        monthFlicker: {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.7" },
        },
        headlineDrift: {
          "0%": { transform: "translateX(110%)", opacity: "0" },
          "20%": { opacity: "0.45" },
          "80%": { opacity: "0.45" },
          "100%": { transform: "translateX(-110%)", opacity: "0" },
        },
        tapPulse: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        coldFadeIn: "coldFadeIn 600ms ease-out forwards",
        coldFadeOut: "coldFadeOut 400ms ease-in forwards",
        titleZoom: "titleZoom 700ms ease-out forwards",
        revealIn: "revealIn 700ms ease-out forwards",
        monthFlicker: "monthFlicker 220ms ease-in-out infinite",
        headlineDrift: "headlineDrift 1800ms ease-in-out forwards",
        tapPulse: "tapPulse 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
