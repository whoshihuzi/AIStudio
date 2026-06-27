/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        gray: {
          750: "#2d2d30",
          850: "#1e1e20",
        },
      },
    },
  },
  plugins: [],
};
