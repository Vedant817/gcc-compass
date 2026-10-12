/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#304359",
        slate: "#415977",
        "slate-light": "#778DA9",
        sand: "#F1CF9D",
        paper: "#F7F7F7",
        rule: "#E9ECEF",
        muted: "#6C757D",
        status: {
          eligible: "#3F6B4F",
          noteligible: "#8A3B32",
          needscheck: "#8C6A2E",
          needscheckbg: "#F6EEDC",
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ["Jost", "Inter", "system-ui", "sans-serif"],
        mono: ['"SFMono-Regular"', "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
      maxWidth: {
        page: "1200px",
      },
    },
  },
  plugins: [],
};

