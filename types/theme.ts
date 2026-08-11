export type ThemeMode =
  | "dark"
  | "light"
  | "oled"
  | "high-contrast";

export type AccentColor =
  | "violet"
  | "blue"
  | "cyan"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "pink";

export type FontSize =
  | "small"
  | "medium"
  | "large"
  | "xlarge";

export type DisplayDensity =
  | "compact"
  | "comfortable";

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentColor;
  fontSize: FontSize;
  density: DisplayDensity;
  reduceMotion: boolean;
}

export const defaultAppearanceSettings: AppearanceSettings = {
  theme: "dark",
  accent: "violet",
  fontSize: "medium",
  density: "compact",
  reduceMotion: false,
};