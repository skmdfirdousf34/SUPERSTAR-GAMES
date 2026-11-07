/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        daman: {
          dark: "#0f172a",
          card: "#1e293b",
          gold: "#eab308",
          red: "#ef4444",
          green: "#22c55e",
          violet: "#a855f7",
        },
      },
    },
  },
  plugins: [],
};
