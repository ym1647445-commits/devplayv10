import {
  providerFetch,
} from "./client";

import type {
  ProviderCatalogType,
  ProviderOffer,
} from "./types";

interface ProviderOfferRow {
  card_id?:
    | string
    | number
    | null;

  offer_id?:
    | string
    | number
    | null;

  id?:
    | string
    | number
    | null;

  name: string;

  price:
    | number
    | string;

  original_price?:
    | number
    | string
    | null;

  currency?:
    | string
    | null;

  stock?:
    | number
    | string
    | null;
}

interface OffersResponse {
  success: boolean;

  offers?:
    ProviderOfferRow[];

  data?:
    ProviderOfferRow[];

  message?: string;
}

export async function getProviderOffers(
  categoryId: string,
  catalogType:
    ProviderCatalogType,
): Promise<ProviderOffer[]> {
  const data =
    await providerFetch<OffersResponse>(
      `offers.php?type=${encodeURIComponent(
        catalogType,
      )}&category_id=${encodeURIComponent(
        categoryId,
      )}`,
    );

  if (!data.success) {
    throw new Error(
      data.message ||
        "Failed to load provider offers.",
    );
  }

  const offers =
    data.offers ??
    data.data ??
    [];

  if (!Array.isArray(offers)) {
    throw new Error(
      "Invalid provider offers response.",
    );
  }

  return offers
    .map((offer) => {
      /*
       * Flexy لا يستخدم نفس اسم الـ ID
       * في كل أنواع الباقات.
       *
       * بعض الباقات:
       * card_id
       *
       * وبعضها:
       * offer_id
       *
       * ونحتفظ بـ id كـ fallback.
       */
      const rawOfferId =
        offer.offer_id ??
        offer.card_id ??
        offer.id ??
        null;

      const cardId =
        rawOfferId === null
          ? ""
          : String(
              rawOfferId,
            ).trim();

      const name =
        String(
          offer.name ?? "",
        ).trim();

      const price =
        Number(
          offer.price,
        );

      const originalPrice =
        offer.original_price ===
          null ||
        offer.original_price ===
          undefined
          ? price
          : Number(
              offer.original_price,
            );

      const stock =
        offer.stock === null ||
        offer.stock === undefined
          ? null
          : Number(
              offer.stock,
            );

      return {
        cardId,

        name,

        price,

        originalPrice:
          Number.isFinite(
            originalPrice,
          )
            ? originalPrice
            : price,

        currency:
          String(
            offer.currency ??
              "USD",
          ),

        stock:
          stock === null ||
          !Number.isFinite(
            stock,
          )
            ? null
            : stock,

        rawData:
          offer as unknown as Record<
            string,
            unknown
          >,
      };
    })
    /*
     * مهم جدًا:
     * لا نسمح نهائيًا بدخول
     * undefined أو ID فارغ للقاعدة.
     */
    .filter(
      (offer) =>
        offer.cardId.length >
          0 &&
        offer.cardId !==
          "undefined" &&
        offer.cardId !==
          "null" &&
        offer.name.length > 0 &&
        Number.isFinite(
          offer.price,
        ),
    );
}
