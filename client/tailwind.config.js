/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        good: {
          light: '#10B981',
          DEFAULT: '#059669',
          dark: '#047857',
        },
        evil: {
          light: '#EF4444',
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
        },
        festive: {
          gold: '#F59E0B',
          silver: '#E5E7EB',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
