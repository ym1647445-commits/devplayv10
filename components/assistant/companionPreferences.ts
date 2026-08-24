export type CompanionTone = "playful" | "calm" | "energetic";
export type CompanionTheme = "robot" | "space" | "pixel" | "neon";
export type CompanionColor = "violet" | "blue" | "cyan" | "green" | "orange" | "pink";
export type CompanionSize = "small" | "medium" | "large";

export interface CompanionPreferences {
  name: string;
  tone: CompanionTone;
  theme: CompanionTheme;
  color: CompanionColor;
  size: CompanionSize;
  enabled: boolean;
  roamingEnabled: boolean;
  gameInvitesEnabled: boolean;
  onboardingCompleted: boolean;
}

export const DEFAULT_COMPANION_PREFERENCES: CompanionPreferences = {
  name: "Dev",
  tone: "playful",
  theme: "robot",
  color: "violet",
  size: "medium",
  enabled: true,
  roamingEnabled: true,
  gameInvitesEnabled: true,
  onboardingCompleted: false,
};

const STORAGE_KEY = "devplay:companion:preferences";
const EVENT_NAME = "devplay:companion:preferences-changed";

export function normalizeCompanionName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 18);
  return name || DEFAULT_COMPANION_PREFERENCES.name;
}

export function readCompanionPreferences(): CompanionPreferences {
  if (typeof window === "undefined") return DEFAULT_COMPANION_PREFERENCES;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<CompanionPreferences>;
    return {
      name: normalizeCompanionName(typeof stored.name === "string" ? stored.name : DEFAULT_COMPANION_PREFERENCES.name),
      tone: ["playful", "calm", "energetic"].includes(stored.tone ?? "") ? stored.tone as CompanionTone : DEFAULT_COMPANION_PREFERENCES.tone,
      theme: ["robot", "space", "pixel", "neon"].includes(stored.theme ?? "") ? stored.theme as CompanionTheme : "robot",
      color: ["violet", "blue", "cyan", "green", "orange", "pink"].includes(stored.color ?? "") ? stored.color as CompanionColor : "violet",
      size: ["small", "medium", "large"].includes(stored.size ?? "") ? stored.size as CompanionSize : "medium",
      enabled: typeof stored.enabled === "boolean" ? stored.enabled : true,
      roamingEnabled: typeof stored.roamingEnabled === "boolean" ? stored.roamingEnabled : true,
      gameInvitesEnabled: typeof stored.gameInvitesEnabled === "boolean" ? stored.gameInvitesEnabled : true,
      onboardingCompleted: typeof stored.onboardingCompleted === "boolean" ? stored.onboardingCompleted : false,
    };
  } catch {
    return DEFAULT_COMPANION_PREFERENCES;
  }
}

export function saveCompanionPreferences(preferences: CompanionPreferences): CompanionPreferences {
  const normalized = { ...preferences, name: normalizeCompanionName(preferences.name) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent<CompanionPreferences>(EVENT_NAME, { detail: normalized }));
  return normalized;
}

export function subscribeToCompanionPreferences(listener: (preferences: CompanionPreferences) => void): () => void {
  const handleChange = (event: Event) => listener((event as CustomEvent<CompanionPreferences>).detail);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener(readCompanionPreferences());
  };
  window.addEventListener(EVENT_NAME, handleChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
