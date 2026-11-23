/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f6f3ee',
          100: '#efeae2',
          200: '#e4dfd6',
          300: '#cfc6b8',
          400: '#a3988a',
          500: '#5c564e',
          600: '#1c2430',
          700: '#151b26',
          800: '#10151e',
          900: '#0c1016',
          950: '#07090d',
        },
        cream: {
          50: '#fbf9f6',
          100: '#f6f3ee',
          200: '#efeae2',
          300: '#e4dfd6',
          400: '#cfc6b8',
          500: '#a3988a',
        },
        ink: {
          DEFAULT: '#1c2430',
          soft: '#5c564e',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', '"Iowan Old Style"', 'Palatino', 'serif'],
        sans: ['"Source Sans 3"', '"Segoe UI"', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Iowan Old Style"', 'Palatino', 'serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
      },
      boxShadow: {
        lift: '0 18px 44px rgba(48, 36, 18, 0.14)',
      },
    },
  },
  plugins: [],
};
