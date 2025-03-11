// @type {import('tailwindcss').Config}

// const primeui = require('tailwindcss-primeui')
import primeui from 'tailwindcss-primeui';

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  plugins: [primeui],
  darkMode: ['selector', '[class="dark"]'],
  theme: {
    extend: {
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)'
      }
    }
  }
}
