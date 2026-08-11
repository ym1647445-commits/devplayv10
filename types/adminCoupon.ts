export type CouponDiscountType =
  | "fixed"
  | "percentage";

export type CouponCurrency =
  | "USD"
  | "EGP";

export type CouponAudienceType =
  | "all_users"
  | "specific_users"
  | "new_users"
  | "selected_levels";

export type CouponApplicationScope =
  | "cart"
  | "categories"
  | "products";

export type CouponVisibility =
  | "public"
  | "private";

export type CouponNotificationMode =
  | "none"
  | "in_app"
  | "in_app_and_email";

export interface AdminCoupon {
  id: string;

  code: string;
  title: string;
  description: string | null;

  type: CouponDiscountType;
  value: number;
  currency: CouponCurrency;

  minimum_cart_amount: number;
  maximum_discount: number | null;

  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;

  minimum_items_count: number;
  first_order_only: boolean;
  auto_apply: boolean;
  stackable: boolean;

  audience_type: CouponAudienceType;
  application_scope: CouponApplicationScope;
  visibility: CouponVisibility;
  notification_mode: CouponNotificationMode;

  selected_levels: string[];

  notify_on_publish: boolean;
  published_at: string | null;

  starts_at: string;
  expires_at: string | null;

  active: boolean;

  internal_note: string | null;

  created_at: string;
  updated_at: string;
}

export interface CreateCouponInput {
  code: string;
  title: string;
  description: string | null;

  type: CouponDiscountType;
  value: number;
  currency: CouponCurrency;

  minimumCartAmount: number;
  maximumDiscount: number | null;

  usageLimit: number | null;
  perUserLimit: number;

  minimumItemsCount: number;
  firstOrderOnly: boolean;
  autoApply: boolean;
  stackable: boolean;

  audienceType: CouponAudienceType;
  applicationScope: CouponApplicationScope;
  visibility: CouponVisibility;
  notificationMode: CouponNotificationMode;

  selectedLevels: string[];

  notifyOnPublish: boolean;

  startsAt: string;
  expiresAt: string | null;

  active: boolean;
  internalNote: string | null;

  selectedUserIds: string[];
  selectedProductIds: string[];
  selectedCategoryIds: string[];
}

export interface CouponActionResult {
  success: boolean;
  message: string;
  couponId?: string;
}