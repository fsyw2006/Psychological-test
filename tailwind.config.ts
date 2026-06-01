import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1200px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        cream: {
          50: "#fffaf1",
          100: "#f8edd8",
          200: "#ecd9b8",
          300: "#dcc094",
          400: "#caa66f"
        },
        sage: {
          100: "#e8efe7",
          300: "#b9cbb4",
          600: "#61785f",
          800: "#334333"
        },
        peach: {
          100: "#f9e1d4",
          300: "#edae92",
          500: "#d97855"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        soft: "0 24px 70px -35px rgba(86, 62, 39, 0.36)",
        glass: "0 18px 60px -34px rgba(32, 40, 36, 0.45)"
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.72" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        "fade-up": "fade-up 700ms ease both",
        "soft-pulse": "soft-pulse 5s ease-in-out infinite"
      }
    }
  },
  plugins: [typography]
};

export default config;
