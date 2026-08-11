"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  defaultAppearanceSettings,
  type AccentColor,
  type AppearanceSettings,
  type DisplayDensity,
  type FontSize,
  type ThemeMode,
} from "@/types/theme";

interface ThemeContextValue {
  settings: AppearanceSettings;

  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setFontSize: (fontSize: FontSize) => void;
  setDensity: (density: DisplayDensity) => void;
  setReduceMotion: (enabled: boolean) => void;

  resetAppearance: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "devplay-appearance";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applySettings(settings: AppearanceSettings): void {
  const root = document.documentElement;

  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.fontSize = settings.fontSize;
  root.dataset.density = settings.density;
  root.dataset.reduceMotion = String(settings.reduceMotion);
}

function readSavedSettings(): AppearanceSettings {
  try {
    const savedSettings = localStorage.getItem(STORAGE_KEY);

    if (!savedSettings) {
      return defaultAppearanceSettings;
    }

    const parsedSettings = JSON.parse(
      savedSettings,
    ) as Partial<AppearanceSettings>;

    return {
      ...defaultAppearanceSettings,
      ...parsedSettings,
    };
  } catch {
    return defaultAppearanceSettings;
  }
}

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [settings, setSettings] =
    useState<AppearanceSettings>(defaultAppearanceSettings);

  useEffect(() => {
    const savedSettings = readSavedSettings();

    setSettings(savedSettings);
    applySettings(savedSettings);
  }, []);

  const updateSettings = useCallback(
    (updatedSettings: Partial<AppearanceSettings>) => {
      setSettings((currentSettings) => {
        const nextSettings = {
          ...currentSettings,
          ...updatedSettings,
        };

        applySettings(nextSettings);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(nextSettings),
        );

        return nextSettings;
      });
    },
    [],
  );

  const setTheme = useCallback(
    (theme: ThemeMode) => {
      updateSettings({ theme });
    },
    [updateSettings],
  );

  const setAccent = useCallback(
    (accent: AccentColor) => {
      updateSettings({ accent });
    },
    [updateSettings],
  );

  const setFontSize = useCallback(
    (fontSize: FontSize) => {
      updateSettings({ fontSize });
    },
    [updateSettings],
  );

  const setDensity = useCallback(
    (density: DisplayDensity) => {
      updateSettings({ density });
    },
    [updateSettings],
  );

  const setReduceMotion = useCallback(
    (enabled: boolean) => {
      updateSettings({
        reduceMotion: enabled,
      });
    },
    [updateSettings],
  );

  const resetAppearance = useCallback(() => {
    setSettings(defaultAppearanceSettings);
    applySettings(defaultAppearanceSettings);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(defaultAppearanceSettings),
    );
  }, []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      settings,
      setTheme,
      setAccent,
      setFontSize,
      setDensity,
      setReduceMotion,
      resetAppearance,
    }),
    [
      settings,
      setTheme,
      setAccent,
      setFontSize,
      setDensity,
      setReduceMotion,
      resetAppearance,
    ],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider",
    );
  }

  return context;
}