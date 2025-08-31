/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        customer: '#3B82F6', // blue
        business: '#10B981', // green
        vendor: '#F59E0B',   // amber
      }
    },
  },
  plugins: [],
}
