/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        team1: {
          light: '#3B82F6',
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
        },
        team2: {
          light: '#A855F7',
          DEFAULT: '#9333EA',
          dark: '#7E22CE',
        },
        // Legacy aliases for backward compatibility
        good: {
          light: '#3B82F6',
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
        },
        evil: {
          light: '#A855F7',
          DEFAULT: '#9333EA',
          dark: '#7E22CE',
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
