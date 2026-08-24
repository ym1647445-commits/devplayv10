import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SeoLanding } from "@/components/seo/SeoLanding";
import { DEFAULT_KEYWORDS, SITE_NAME, absoluteUrl, jsonLd } from "@/lib/seo/site";

const title="شراء بطاقات رقمية في مصر — Google Play وSteam وAmazon";
const description="اشتري بطاقات Google Play وSteam وAmazon وخدمات رقمية من DevPlay حسب الدولة والقيمة، واستلم الكود وتابع الطلب من حسابك.";
export const metadata:Metadata={title,description,keywords:[...DEFAULT_KEYWORDS,"شراء بطاقات رقمية مصر","بطاقات جوجل بلاي مصر","Steam Wallet مصر","Amazon Gift Card"],alternates:{canonical:absoluteUrl("/gift-cards-egypt")},openGraph:{title,description,url:absoluteUrl("/gift-cards-egypt"),siteName:SITE_NAME,locale:"ar_EG",images:[absoluteUrl("/devplay-app-icon-512.png")]},twitter:{card:"summary_large_image",title,description,images:[absoluteUrl("/devplay-app-icon-512.png")]}};
export default function GiftCardsPage(){const faq={"@context":"https://schema.org","@type":"FAQPage",mainEntity:[{"@type":"Question",name:"كيف أستلم كود البطاقة؟",acceptedAnswer:{"@type":"Answer",text:"بعد اكتمال الطلب يظهر الكود داخل تفاصيل الطلب والفاتورة الخاصة بك، ولا يمكن لأي حساب آخر الوصول إليه."}},{"@type":"Question",name:"هل يجب اختيار الدولة؟",acceptedAnswer:{"@type":"Answer",text:"نعم، بعض البطاقات مرتبطة بدولة أو منطقة معينة، لذلك يجب مراجعة اسم الباقة والمنطقة قبل تأكيد الطلب."}},{"@type":"Question",name:"كم يستغرق وصول الكود؟",acceptedAnswer:{"@type":"Answer",text:"تصل الأكواد عادةً خلال دقيقة إلى 10 دقائق حسب حالة المورد."}}]};return <AppShell><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(faq)}}/><SeoLanding kind="cards"/></AppShell>}
