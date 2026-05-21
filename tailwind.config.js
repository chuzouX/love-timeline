/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kuromi: {
          purple: "#A855F7",
          darkPurple: "#7E22CE",
          pink: "#EC4899",
          black: "#111827",
          white: "#F9FAFB",
        }
      }
    },
  },
  plugins: [],
}
