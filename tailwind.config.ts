import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF7",
        ink: "#0F0F0E",
        muted: "#5A5A57",
        hairline: "#E4E2DC",
        accent: "#1F3A5F",
        "accent-soft": "#E9EEF5",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        column: "44rem",
      },
    },
  },
  plugins: [],
};

export default config;
