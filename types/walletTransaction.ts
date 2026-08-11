export type WalletTransactionType =
  | "deposit"
  | "purchase"
  | "refund"
  | "reward"
  | "adjustment"
  | "freeze"
  | "unfreeze";

export interface WalletTransaction {
  id: string;

  type: WalletTransactionType;

  amountUsd: number;

  balanceBeforeUsd: number;
  balanceAfterUsd: number;

  exchangeRate: number;
  amountEgpSnapshot: number;

  referenceType: string | null;
  referenceId: string | null;

  referenceNumber: string | null;

  description: string | null;

  createdAt: string;
}