export const theme = {
  colors: {
    primary: "#8b5cf6",
    primaryStrong: "#6d3df0",
    secondary: "#22d3ee",

    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",

    background: "#070812",
    surface: "#111426",
    surfaceSoft: "#171a31",

    text: "#f7f7fb",
    textMuted: "#a7abc3",
    border: "rgba(255, 255, 255, 0.09)",
  },

  radius: {
    small: "10px",
    medium: "14px",
    large: "20px",
    full: "999px",
  },

  shadow: {
    small: "0 8px 24px rgba(0, 0, 0, 0.18)",
    medium: "0 16px 40px rgba(0, 0, 0, 0.25)",
    primary: "0 12px 30px rgba(109, 61, 240, 0.27)",
  },

  animation: {
    fast: "160ms",
    normal: "240ms",
    slow: "360ms",
  },
} as const;

export type AppTheme = typeof theme;