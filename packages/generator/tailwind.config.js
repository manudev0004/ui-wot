/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#067362', // Primary Base
          light: '#08967f', // Primary Light
        },
        accent: {
          DEFAULT: '#33b8a4', // Accent Highlight
          light: '#33b8a4', // Accent Highlight
        },
        neutral: {
          light: '#E4E6E6', // Neutral Light
        },
      },
      fontFamily: {
        hero: ['Bebas Neue', 'cursive'],
        heading: ['Josefin Sans', 'sans-serif'],
        body: ['Josefin Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
