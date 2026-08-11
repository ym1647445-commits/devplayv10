export type ApiPricingMode =
  | "fixed_usd"
  | "percentage"
  | "manual";

export interface AdminPricingSettings {
  usdToEgpRate: number;

  profitPerUsdEgp: number;
  minimumProfitEgp: number;

  apiPricingMode: ApiPricingMode;

  defaultProfitUsd: number;

  defaultMarkupPercentage: number;

  lowSupplierBalanceUsd: number;

  autoDisableOverBalance: boolean;

  pointsPerUsd: number;

  egpDepositFeePer1000: number;
  egpDepositMinimumFee: number;

  usdDepositFixedFee: number;

  pricingUpdatedAt: string | null;
  updatedAt: string;
}

export interface AdminPricingFormInput {
  usdToEgpRate: number;

  profitPerUsdEgp: number;
  minimumProfitEgp: number;

  apiPricingMode: ApiPricingMode;

  defaultProfitUsd: number;

  defaultMarkupPercentage: number;

  lowSupplierBalanceUsd: number;

  autoDisableOverBalance: boolean;

  pointsPerUsd: number;

  egpDepositFeePer1000: number;
  egpDepositMinimumFee: number;

  usdDepositFixedFee: number;
}

export interface AdminPricingActionResult {
  success: boolean;
  message: string;

  settings?: AdminPricingSettings;
}