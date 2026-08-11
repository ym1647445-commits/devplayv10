import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DevPlay Top Up",
    short_name: "DevPlay",
    description: "متجر DevPlay لشحن الألعاب والخدمات الرقمية بأمان وسرعة.",
    start_url: "/",
    scope: "/",
    lang: "ar",
    dir: "rtl",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#090713",
    theme_color: "#7c3aed",
    categories: ["games", "shopping", "utilities"],
    icons: [
      {
        src: "/devplay-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/devplay-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "المنتجات", short_name: "المنتجات", url: "/products" },
      { name: "السلة", short_name: "السلة", url: "/cart" },
      { name: "طلباتي", short_name: "طلباتي", url: "/orders" },
      { name: "المحفظة", short_name: "المحفظة", url: "/wallet" },
    ],
  };
}
