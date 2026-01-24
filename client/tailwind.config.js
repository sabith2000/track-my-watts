// track-my-watts/client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // NEW: Setting 'Inter' as the default font family
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        // Title Font (Russo One)
        display: ['"Russo One"', 'sans-serif'],
        // Added Custom Signature Font
        signature: ['"Birthstone"', 'cursive'],
      },
    },
  },
  plugins: [],
}