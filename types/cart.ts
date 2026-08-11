import type { Product } from "@/types/product";

export type CartItemInputValues =
  Record<string, string>;

export interface CartItem {
  /**
   * رقم فريد لسطر السلة.
   * ليس رقم المنتج.
   */
  id: string;

  product: Product;
  quantity: number;

  /**
   * ID اللاعب، السيرفر، الإيميل...
   * حسب حقول المنتج.
   */
  inputValues: CartItemInputValues;
}