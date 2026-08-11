export type CouponType =
  | "fixed"
  | "percentage";

export type CouponCurrency =
  | "USD"
  | "EGP";

export interface AppliedCoupon {
  id: string;
  code: string;
  title: string;
  discount: number;
}

export interface CouponValidationResult {
  success: boolean;
  message: string;
  coupon: AppliedCoupon | null;
}