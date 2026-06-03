/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Google Sans', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        // CSS-variable-based theme tokens (light/dark mode aware)
        'g-surface': 'var(--google-surface)',
        'g-bg':      'var(--google-bg)',
        'g-border':  'var(--google-border)',
        'g-text':    'var(--google-text-primary)',
        'g-text-2':  'var(--google-text-secondary)',
        'g-text-3':  'var(--google-text-tertiary)',
        google: {
          blue: '#1a73e8',
          'blue-dark': '#1557b0',
          'blue-light': '#e8f0fe',
          green: '#137333',
          'green-light': '#e6f4ea',
          red: '#d93025',
          'red-light': '#fce8e6',
          yellow: '#f9ab00',
          'yellow-light': '#fef7e0',
          gray: {
            50: '#f8f9fa',
            100: '#f1f3f4',
            200: '#e8eaed',
            300: '#dadce0',
            400: '#bdc1c6',
            500: '#9aa0a6',
            600: '#80868b',
            700: '#5f6368',
            800: '#3c4043',
            900: '#202124',
          },
        },
      },
      boxShadow: {
        'google-1': '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
        'google-2': '0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15)',
        'google-3': '0 2px 6px 2px rgba(60,64,67,.15), 0 1px 2px 0 rgba(60,64,67,.3)',
      },
    },
  },
  plugins: [],
};
