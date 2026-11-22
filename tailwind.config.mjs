/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Warm, welcoming color palette for church directory
        primary: {
          50: '#fdf8f6',
          100: '#f8ede8',
          200: '#f0d8cd',
          300: '#e5bba8',
          400: '#d89578',
          500: '#c97652', // Main warm terracotta
          600: '#b85f3e',
          700: '#9a4c33',
          800: '#7f3f2e',
          900: '#6a362a',
          950: '#3a1a13',
        },
        // Complementary deep blue for trust/faith
        accent: {
          50: '#f0f5ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfc',
          400: '#7f97f8',
          500: '#5a6ff1',
          600: '#4550e5',
          700: '#3840ca', // Deep blue
          800: '#3037a3',
          900: '#2d3481',
          950: '#1c1f4b',
        },
        // Warm neutral background
        cream: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#faf3e6',
          300: '#f5e8d3',
          400: '#eed9b8',
          500: '#e5c69a',
        }
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
