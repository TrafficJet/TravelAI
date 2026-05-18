/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#F59E0B',
        'primary-light': '#FCD34D',
        'primary-dark': '#B45309',
        secondary: '#14B8A6',
        background: '#0A0A14',
        surface: '#12121F',
        card: '#1C1C2E',
        elevated: '#252538',
        text: '#F4F4F8',
        'text-muted': '#8B8BA7',
        'text-disabled': '#4A4A62',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#F43F5E',
        info: '#38BDF8',
        border: '#2A2A42',
        divider: '#1E1E30',
      },
    },
  },
  plugins: [],
};
