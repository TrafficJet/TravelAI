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
        primary: '#6366F1',
        background: '#0F0F1A',
        surface: '#1A1A2E',
        card: '#252540',
        text: '#F1F5F9',
        'text-muted': '#94A3B8',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#2D2D50',
      },
    },
  },
  plugins: [],
};
