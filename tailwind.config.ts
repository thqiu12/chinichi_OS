import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff8ed",
          100: "#ffefd1",
          200: "#ffdba0",
          300: "#ffbf66",
          400: "#ff9b34",
          500: "#f97a14",
          600: "#ea5e0a",
          700: "#c2470b",
          800: "#9a3911",
          900: "#7c3112",
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Hiragino Sans"',
               '"Noto Sans CJK JP"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        card: "0 4px 16px -4px rgba(16,24,40,.08), 0 2px 6px -2px rgba(16,24,40,.05)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
