import type {
  ProductRequiredField,
  ProductStatus,
} from "@/types/product";

export interface AdminProductCategory {
  id: string;
  slug: string;

  nameAr: string;
  nameEn: string | null;

  imageUrl: string | null;

  active: boolean;
  sortOrder: number;
}

export interface AdminProduct {
  id: string;

  externalId: string | null;
  supplierProductId: string | null;

  categoryId: string | null;
  category:
    | AdminProductCategory
    | null;

  slug: string;

  nameAr: string;
  nameEn: string | null;

  shortDescriptionAr: string | null;
  descriptionAr: string | null;

  imageUrl: string | null;

  supplierPriceUsd: number;
  profitUsd: number;
  finalPriceUsd: number;

  oldPriceUsd: number | null;

  minimumQuantity: number;
  maximumQuantity: number;

  requiredFields:
    ProductRequiredField[];

  status: ProductStatus;

  active: boolean;
  featured: boolean;
  instantDelivery: boolean;

  deliveryTime: string | null;
  badge: string | null;

  rating: number;
  reviewsCount: number;

  providerData: Record<
    string,
    unknown
  >;

  createdAt: string;
  updatedAt: string;
}

export interface AdminProductStats {
  total: number;
  active: number;
  inactive: number;

  available: number;
  busy: number;
  unavailable: number;

  featured: number;

  averageSupplierPriceUsd: number;
  averageProfitUsd: number;
}

export interface AdminProductFormInput {
  productId?: string;

  externalId: string | null;
  supplierProductId: string | null;

  categoryId: string | null;

  slug: string;
  nameAr: string;
  nameEn: string | null;

  shortDescriptionAr: string | null;
  descriptionAr: string | null;

  imageUrl: string | null;

  supplierPriceUsd: number;
  profitUsd: number;
  oldPriceUsd: number | null;

  minimumQuantity: number;
  maximumQuantity: number;

  requiredFields:
    ProductRequiredField[];

  status: ProductStatus;

  active: boolean;
  featured: boolean;
  instantDelivery: boolean;

  deliveryTime: string | null;
  badge: string | null;
}

export interface AdminProductActionResult {
  success: boolean;
  message: string;

  productId?: string;
}