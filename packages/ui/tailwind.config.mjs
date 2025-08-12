/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "../../apps/**/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
