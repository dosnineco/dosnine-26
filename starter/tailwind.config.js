module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './ds/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent-color-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
