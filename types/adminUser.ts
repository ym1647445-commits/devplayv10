export type AdminUserStatus =
  | "active"
  | "suspended"
  | "banned"
  | "pending_verification";

export interface AdminUserWallet {
  id: string;

  balanceUsd: number;
  balanceEgp: number;

  frozenBalanceUsd: number;
  frozenBalanceEgp: number;

  exchangeRate: number;

  isFrozen: boolean;
  freezeReason: string | null;
}

export interface AdminUser {
  id: string;

  customerId: string;
  fullName: string | null;

  email: string | null;
  phone: string | null;
  avatarUrl: string | null;

  role: string;
  status: AdminUserStatus;

  trustScore: number;
  suspiciousScore: number;
  warningsCount: number;

  successfulOrdersCount: number;
  failedOrdersCount: number;
  fakeDepositCount: number;

  points: number;
  pointsDebt: number;

  customerLevel: string;

  birthDate: string | null;
  birthDateLocked: boolean;

  totalSpentUsd: number;

  ordersRestrictedUntil: string | null;
  depositsRestrictedUntil: string | null;

  banReason: string | null;
  internalNotes: string | null;

  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;

  ordersCount: number;
  completedOrdersCount: number;

  couponsCount: number;

  wallet: AdminUserWallet | null;
}

export interface AdminUserStats {
  total: number;
  active: number;
  suspended: number;
  banned: number;

  birthdaysToday: number;

  walletsFrozen: number;

  totalWalletBalanceUsd: number;
  totalCustomerPoints: number;
}

export interface AdminUserActionResult {
  success: boolean;
  message: string;

  data?: Record<
    string,
    unknown
  >;
}