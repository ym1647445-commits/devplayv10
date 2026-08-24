import type { Metadata } from "next";
import { DEFAULT_KEYWORDS, SITE_NAME, absoluteUrl } from "@/lib/seo/site";
import { ProductKindVisuals } from "./ProductKindVisuals";

const title="كل الألعاب والباقات المتاحة";
const description="تصفح ألعاب وخدمات DevPlay واختر باقات الشحن المباشر والبطاقات الرقمية المتاحة بأسعار يتم التحقق منها من السيرفر.";
export const metadata:Metadata={title,description,keywords:[...DEFAULT_KEYWORDS,"أسعار شحن الألعاب","متجر شحن ألعاب مصر"],alternates:{canonical:absoluteUrl("/products")},openGraph:{title,description,url:absoluteUrl("/products"),siteName:SITE_NAME,locale:"ar_EG",images:[absoluteUrl("/devplay-app-icon-512.png")]}};
export default function ProductsLayout({children}:{children:React.ReactNode}){return <><ProductKindVisuals/>{children}</>}
