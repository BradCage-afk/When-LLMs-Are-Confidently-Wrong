import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--card)",
        carbon: "var(--carbon)",
        graphite: "var(--graphite)",
        slate: "var(--slate)",
        accent: "var(--accent)",
        violet: "var(--violet)",
        teal: "var(--teal)",
        border: "var(--border)",
        steel: "var(--steel)",
        muted: "var(--muted)",
        cloud: "var(--cloud)",
        silver: "var(--silver)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
