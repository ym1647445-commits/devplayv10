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
        src: "/devplay-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/devplay-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/devplay-app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "المنتجات", short_name: "المنتجات", url: "/products" },
      { name: "السلة", short_name: "السلة", url: "/cart" },
      { name: "طلباتي", short_name: "طلباتي", url: "/orders" },
      { name: "المحفظة", short_name: "المحفظة", url: "/wallet" },
      { name: "تثبيت التطبيق", short_name: "تثبيت", url: "/download" },
    ],
  };
}
