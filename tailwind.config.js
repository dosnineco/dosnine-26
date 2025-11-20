/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}", // For `app` directory in Next.js 13+
  ],
  theme: {
    extend: {
      colors: {
        "primary-color": "var(--primary)",
        "secondary-color": "var(--shade)",
        "main": "var(--bkg)",


      },
      animation: {
        glitter: 'glitter 2s linear infinite',
      },
    },
  },
 plugins: [require('@tailwindcss/typography')],
   variants: {
    extend: {
      scrollBehavior: ['responsive'],
    },
  },

};
