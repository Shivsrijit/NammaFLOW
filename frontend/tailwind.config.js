/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        accent: { DEFAULT: "var(--accent)" },
        border: "var(--border)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(18px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      },
      animation: { rise: "rise 0.7s cubic-bezier(0.22,1,0.36,1) forwards" },
    },
  },
  plugins: [],
};
