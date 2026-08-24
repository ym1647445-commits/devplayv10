import type { Metadata } from "next";
import { DEFAULT_KEYWORDS, SITE_NAME, absoluteUrl } from "@/lib/seo/site";
import { CategoryCoverFix } from "./CategoryCoverFix";

const title="أقسام شحن الألعاب والبطاقات الرقمية";
const description="استكشف أقسام DevPlay للألعاب، الشحن المباشر والبطاقات الرقمية، ثم اختر الخدمة والباقات المتاحة في منطقتك.";
export const metadata:Metadata={title,description,keywords:[...DEFAULT_KEYWORDS,"أقسام شحن الألعاب","بطاقات هدايا رقمية"],alternates:{canonical:absoluteUrl("/categories")},openGraph:{title,description,url:absoluteUrl("/categories"),siteName:SITE_NAME,locale:"ar_EG",images:[absoluteUrl("/devplay-app-icon-512.png")]}};
export default function CategoriesLayout({children}:{children:React.ReactNode}){return <><CategoryCoverFix/>{children}</>}
