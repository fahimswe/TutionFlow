import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f0ff',
          200: '#b9e6ff',
          300: '#89d6ff',
          400: '#4dbdff',
          500: '#1d9cff',
          600: '#0a7ae5',
          700: '#0d5fbb',
          800: '#124d97',
          900: '#153f78',
        },
      },
    },
  },
  plugins: [],
};

export default config;
