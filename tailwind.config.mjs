/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e7f3ee',
          100: '#d3ebe1',
          200: '#a8d7c4',
          300: '#6fb89a',
          400: '#3d9474',
          500: '#1f7356',
          600: '#0d4f3c',
          700: '#0c4535',
          800: '#08382b',
          900: '#06281f',
          950: '#031610',
        },
        cream: {
          50: '#fbfcfb',
          100: '#f2f4f1',
          200: '#e7ebe6',
          300: '#d3dad5',
          400: '#b7c2bb',
          500: '#8fa099',
        },
        ink: {
          DEFAULT: '#14211c',
          soft: '#3a4a43',
        },
      },
      fontFamily: {
        display: ['"Familjen Grotesk"', '"Avenir Next"', '"Segoe UI"', 'sans-serif'],
        sans: ['"Atkinson Hyperlegible"', '"Segoe UI"', 'sans-serif'],
        serif: ['"Familjen Grotesk"', '"Avenir Next"', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        lift: '0 10px 28px rgba(20, 33, 28, 0.1)',
      },
    },
  },
  plugins: [],
};
