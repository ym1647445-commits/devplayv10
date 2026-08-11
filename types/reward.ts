export interface RewardStoreItem {
  id: string;

  title: string;
  description: string | null;
  imageUrl: string | null;

  pointsCost: number;

  couponValueEgp: number;
  minimumCartEgp: number;

  expiryDays: number;

  totalLimit: number | null;
  redeemedCount: number;
  perUserLimit: number;

  userRedemptionsCount: number;

  featured: boolean;
  badge: string | null;

  sortOrder: number;
  active: boolean;
}

export interface RewardRedemptionResult {
  success: boolean;
  message: string;

  coupon?: {
    id: string;
    code: string;

    valueEgp: number;
    minimumCartEgp: number;

    pointsSpent: number;
    pointsRemaining: number;

    expiresAt: string;
  };
}

export interface RewardPointTransaction {
  id: string;

  type: string;
  direction: "credit" | "debit";

  points: number;

  balanceBefore: number;
  balanceAfter: number;

  description: string | null;

  createdAt: string;
}