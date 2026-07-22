import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bucket: {
          morning: "#F5A623",
          noon: "#3B82F6",
          night: "#4C1D95",
        },
        danger: "#DC2626",
        warn: "#D97706",
        safe: "#16A34A",
      },
      fontSize: {
        senior: ["1.5rem", { lineHeight: "2rem" }],
        "senior-lg": ["2rem", { lineHeight: "2.5rem" }],
        "senior-xl": ["2.75rem", { lineHeight: "3.25rem" }],
      },
      spacing: {
        tap: "5rem", // minimum tap target per Fitts's Law geriatric guidance
      },
    },
  },
  plugins: [],
};
export default config;
