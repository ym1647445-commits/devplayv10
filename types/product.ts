export type ProductStatus =
  | "available"
  | "busy"
  | "unavailable";

export type ProductInputType =
  | "text"
  | "number"
  | "email"
  | "url"
  | "tel";

export interface ProductRequiredField {
  id: string;
  label: string;
  placeholder: string;
  type: ProductInputType;
  required: boolean;

  helperText?: string;
  pattern?: string;
  patternMessage?: string;
}

export interface Product {
  id: string;
  slug: string;

  name: string;
  category: string;
  image: string;

  shortDescription?: string;
  description?: string;

  /**
   * النظام الجديد.
   * السعر النهائي =
   * supplierPriceUsd + profitUsd
   */
  supplierPriceUsd?: number;
  profitUsd?: number;
  priceUsd?: number;
  oldPriceUsd?: number;

  /**
   * الحقول القديمة متروكة مؤقتًا
   * حتى لا تتعطل المنتجات الحالية.
   */
  costPrice: number;
  price: number;
  oldPrice?: number;
  currency: "EGP" | "USD";
  fallbackUsdRate?: number;

  rating: number;
  reviewsCount: number;

  badge?: string;
  status: ProductStatus;

  featured?: boolean;
  instantDelivery?: boolean;

  deliveryTime?: string;
  minimumQuantity?: number;
  maximumQuantity?: number;

  requiredFields?: ProductRequiredField[];

  /**
   * مراجع داخلية توافقية للسلة. لا تُستخدم كمصدر موثوق للسعر.
   * يتحقق السيرفر من المنتج والباقة مجددًا قبل إنشاء الطلب.
   */
  providerData?: Record<string, unknown>;
}
