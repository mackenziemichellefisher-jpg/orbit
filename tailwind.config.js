/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Outfit',
          'Nunito',
          'ui-rounded',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        orbit: {
          50: '#fff7dd',
          100: '#ffe7a3',
          200: '#ffd56a',
          300: '#ffc233',
          400: '#ffb000',
          500: '#e49a00',
          600: '#c79000',
          700: '#8a6400',
          800: '#5c4208',
          900: '#3a2a0c',
        },
        go: {
          400: '#2b2b2b',
          500: '#0c0c0c',
          600: '#000000',
        },
        sand: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bob': {
          '0%, 100%': { transform: 'translateY(0px) rotate(-1deg)' },
          '50%': { transform: 'translateY(-8px) rotate(1deg)' },
        },
        'bob-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(1deg)' },
          '50%': { transform: 'translateY(-6px) rotate(-1deg)' },
        },
        'ripple': {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'splash': {
          '0%': { transform: 'scale(0) translateY(0)', opacity: '1' },
          '50%': { transform: 'scale(1.2) translateY(-20px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'bob': 'bob 3s ease-in-out infinite',
        'bob-slow': 'bob-slow 4s ease-in-out infinite',
        'ripple': 'ripple 2s ease-out infinite',
        'splash': 'splash 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
