export type CustomerCouponState =
  | "available"
  | "used"
  | "expired"
  | "upcoming"
  | "unavailable";

export interface CustomerCoupon {
  id: string;

  code: string;
  title: string;
  description: string | null;

  type: "fixed" | "percentage";
  value: number;
  currency: "USD" | "EGP";

  minimumCartAmount: number;
  maximumDiscount: number | null;
  minimumItemsCount: number;

  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  userUsageCount: number;

  firstOrderOnly: boolean;
  autoApply: boolean;

  applicationScope:
    | "cart"
    | "categories"
    | "products";

  startsAt: string;
  expiresAt: string | null;

  state: CustomerCouponState;
}