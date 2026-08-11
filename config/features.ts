export const features = {
  wallet: true,
  cart: true,
  coupons: true,
  rewards: true,
  levels: true,
  wheel: true,
  favorites: true,
  compareProducts: true,
  priceHistory: true,
  recentlyViewed: true,
  achievements: true,
  invoices: true,
  smartRecommendations: true,
  onboardingTour: true,
  notifications: true,
  telegramBot: true,
  pwa: true,

  aiAssistant: false,
  referrals: false,
} as const;

export type FeatureName = keyof typeof features;

export function isFeatureEnabled(feature: FeatureName): boolean {
  return features[feature];
}