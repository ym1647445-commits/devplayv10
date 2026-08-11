export type DepositStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_information"
  | "frozen"
  | "cancelled";

export interface AdminDeposit {
  id: string;
  deposit_id: string;
  user_id: string;

  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;

  payment_method_id: string;
  payment_method_name: string;
  payment_network: string | null;
  payment_address: string;

  requested_currency: "EGP" | "USD";
  requested_amount: number;
  fee_amount: number;
  total_to_transfer: number;
  credit_usd: number;
  usd_to_egp_rate: number;

  sender_account: string | null;
  transaction_reference: string | null;

  proof_path: string | null;
  proof_url: string | null;

  customer_note: string | null;
  admin_note: string | null;
  rejection_reason: string | null;

  status: DepositStatus;

  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}