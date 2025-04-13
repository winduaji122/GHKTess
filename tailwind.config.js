   /** @type {import('tailwindcss').Config} */
   module.exports = {
    
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        maxWidth: {
          'container': '1100px',
        },
        colors: {
          blue: {
            600: '#0078ff',
          },
        },
      },
    },
    plugins: [],
    
    variants: {
      extend: {
        display: ['group-hover'],
      },
    },
  }