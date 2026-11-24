import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f1f4fb', 100: '#dde4f4', 200: '#b9c6e6', 300: '#8da2d3', 400: '#5f7bbd',
          500: '#3f5ca3', 600: '#2e4684', 700: '#243768', 800: '#1b2a50', 900: '#121c38', 950: '#0b1226',
        },
        brand: {
          50: '#f5f2ff', 100: '#ece6ff', 200: '#d9ceff', 300: '#bba8ff', 400: '#9c7dff',
          500: '#7f56f5', 600: '#6a3ae6', 700: '#5a2ec8', 800: '#4a27a2', 900: '#3d2381',
        },
        surface: '#f6f7fb',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,28,56,0.04), 0 8px 24px rgba(18,28,56,0.06)',
        pop: '0 12px 40px rgba(18,28,56,0.18)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
