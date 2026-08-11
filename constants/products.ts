import type { Product } from "@/types/product";

export const products: Product[] = [
  {
  id: "pubg-mobile-60-uc",
  slug: "pubg-mobile-60-uc",

  name: "PUBG Mobile 60 UC",
  category: "PUBG Mobile",
  image: "/public/products/pubg-mobile.jpg",

  shortDescription:
    "شحن 60 UC من خلال Player ID.",

  description:
    "يتم تنفيذ الشحن من خلال رقم اللاعب.",

  supplierPriceUsd: 0.84,

  profitUsd: 0.16,

  /*
   * الحقول دي مؤقتة للتوافق فقط.
   */
  costPrice: 0.84,
  price: 1,
  currency: "USD",

  rating: 4.9,
  reviewsCount: 523,

  status: "available",
  instantDelivery: true,

  requiredFields: [
    {
      id: "player_id",
      label: "Player ID",
      placeholder: "اكتب رقم اللاعب",
      type: "number",
      required: true,
      helperText:
        "تأكد من كتابة الرقم بدون مسافات.",
      pattern: "^[0-9]{5,20}$",
      patternMessage:
        "رقم اللاعب يجب أن يحتوي على أرقام فقط.",
    },
  ],
}
];

export function getProductBySlug(
  slug: string,
): Product | undefined {
  return products.find(
    (product) => product.slug === slug,
  );
}