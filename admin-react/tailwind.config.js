/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        navy: { 50: '#f1f4fb', 100: '#dde4f4', 200: '#b9c6e8', 300: '#8aa0d6', 400: '#5a76bf', 500: '#3b56a3', 600: '#2c4283', 700: '#233468', 800: '#1b2852', 900: '#131c3b', 950: '#0b1126' },
        brand: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      },
      boxShadow: { soft: '0 1px 2px rgba(19,28,59,.04), 0 8px 24px -8px rgba(19,28,59,.10)' },
      keyframes: { fadeIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } } },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
};
