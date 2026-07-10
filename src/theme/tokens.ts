import { vars } from "nativewind";

export const themes = {
  light: vars({
    "--background": "#ffffff",
    "--surface": "#fdfdfd",
    "--surface-muted": "rgba(253, 253, 253, 0.20)",

    "--border": "#e5e7eb",

    "--text": "#11181c",
    "--muted": "#6b7280",

    "--primary": "#276359",
    "--primary-foreground": "#ffffff",
  }),

  dark: vars({
    "--background": "#0f1512",
    "--surface": "#1a211d",
    "--surface-muted": "rgba(26, 33, 29, 0.10)",

    "--border": "#1d221f",

    "--text": "#ecedee",
    "--muted": "#9ba3a0",

    "--primary": "#22574E",
    "--primary-foreground": "#ffffff",
  }),
};