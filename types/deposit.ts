export type DepositMethodType =
  | "egyptian_wallet"
  | "crypto";

export type DepositCurrency =
  | "EGP"
  | "USD";

export interface DepositPaymentMethod {
  id: string;
  type: DepositMethodType;
  name: string;
  network: string | null;
  address: string;
  currency: DepositCurrency;
  minimum_amount: number;
  instructions: string | null;
  sort_order: number;
}

export interface CreatedDepositRequest {
  id: string;
  deposit_id: string;
  requested_currency: DepositCurrency;
  requested_amount: number;
  fee_amount: number;
  total_to_transfer: number;
  credit_usd: number;
  status: string;
  created_at: string;
}