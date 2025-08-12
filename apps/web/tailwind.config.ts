import sharedConfig from "../../packages/ui/tailwind.config.mjs";

/** @type {import('tailwindcss').Config} */
const config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ...sharedConfig.content,
  ],
};

export default config;
