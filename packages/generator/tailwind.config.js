/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e40af', // blue-800
          light: '#3b82f6',   // blue-500
        },
        accent: {
          DEFAULT: '#f59e0b', // amber-500
          light: '#fbbf24',   // amber-400
        },
        neutral: {
          light: '#f3f4f6',   // gray-100
        },
      },
      fontFamily: {
        hero: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
