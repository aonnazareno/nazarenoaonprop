/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        verde: {
          DEFAULT: '#27915d',
          dark: '#1e6e46',
          light: '#d4ede1',
          muted: '#e8f5ef',
        },
        crema: {
          DEFAULT: '#f5f4ef',
          dark: '#eceae2',
        },
        gris: {
          DEFAULT: '#b5b5b5',
          dark: '#6b7280',
          light: '#f3f4f6',
        },
      },
      fontFamily: {
        cormorant: ['"Cormorant Garamond"', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
