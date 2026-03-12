import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: "#f4f6f9",
          primary: "#ffffff",
          secondary: "#f0f2f5",
          tertiary: "#e8ebef",
          inverse: "#111827",
          raised: "#ffffff",
        },
        brand: {
          DEFAULT: "#0d6a61",
          secondary: "#109688",
          soft: "#e0f2f0",
          hover: "#0b5a53",
          text: "#0a524b",
        },
        text: {
          primary: "#111827",
          secondary: "#4b5563",
          tertiary: "#9ca3af",
          inverse: "#ffffff",
          brand: "#0d6a61",
          link: "#2563eb",
        },
        border: {
          DEFAULT: "#e5e7eb",
          strong: "#d1d5db",
          focus: "#0d6a61",
          subtle: "#f0f2f5",
        },
        status: {
          "danger-bg": "#fef2f2",
          "danger-text": "#991b1b",
          "danger-border": "#fecaca",
          "danger-solid": "#dc2626",
          "warning-bg": "#fffbeb",
          "warning-text": "#92400e",
          "warning-border": "#fde68a",
          "warning-solid": "#f59e0b",
          "info-bg": "#eff6ff",
          "info-text": "#1e40af",
          "info-border": "#bfdbfe",
          "info-solid": "#3b82f6",
          "success-bg": "#f0fdf4",
          "success-text": "#166534",
          "success-border": "#bbf7d0",
          "success-solid": "#22c55e",
          "neutral-bg": "#f4f6f9",
          "neutral-text": "#4b5563",
          "neutral-border": "#e5e7eb",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        md: "0 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0 10px 24px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 40px rgba(0, 0, 0, 0.12)",
      },
      spacing: {
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "12px",
        "sp-4": "16px",
        "sp-5": "20px",
        "sp-6": "24px",
        "sp-8": "32px",
        "sp-10": "40px",
        "sp-12": "48px",
      },
      fontSize: {
        xs: "11px",
        sm: "12px",
        base: "13px",
        md: "14px",
        lg: "16px",
        xl: "18px",
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "32px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Pretendard Variable",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      lineHeight: {
        tight: "1.25",
        normal: "1.5",
        relaxed: "1.65",
      },
      transitionTimingFunction: {
        "ease-out-custom": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        normal: "200ms",
      },
      width: {
        sidebar: "240px",
      },
      height: {
        header: "56px",
      },
      maxWidth: {
        content: "1400px",
      },
    },
  },
  plugins: [],
};

export default config;
