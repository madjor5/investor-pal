import type { Config } from "tailwindcss";

export default {
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        gain: "hsl(var(--gain))",
        loss: "hsl(var(--loss))",
        neutral: "hsl(var(--neutral))",
      }
    }
  }
} satisfies Config;