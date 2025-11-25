/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    // THIS LINE IS CRUCIAL: It finds all your JSX files
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}