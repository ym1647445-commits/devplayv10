import type { ProductRequiredField } from "@/types/product";

export interface GameAccountProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  fields: ProductRequiredField[];
}

export interface SavedGameAccount {
  id: string;
  productId: string;
  nickname: string;
  identifiers: Record<string, string>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameAccountMutationInput {
  accountId?: string;
  productId: string;
  nickname: string;
  identifiers: Record<string, string>;
}

export interface GameAccountActionResult {
  success: boolean;
  message: string;
  account?: SavedGameAccount;
}
