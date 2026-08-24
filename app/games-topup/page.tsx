import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SeoLanding } from "@/components/seo/SeoLanding";
import { DEFAULT_KEYWORDS, SITE_NAME, absoluteUrl, jsonLd } from "@/lib/seo/site";

const title="شحن ألعاب في مصر — PUBG وFree Fire وMobile Legends";
const description="اشحن ألعابك بالـID من DevPlay: ببجي UC، فري فاير، موبايل ليجندز والمزيد. أسعار واضحة، تنفيذ سريع، محفظة آمنة ودعم عربي.";
export const metadata:Metadata={title,description,keywords:[...DEFAULT_KEYWORDS,"شحن ألعاب في مصر","شحن ببجي بال ID","شحن فري فاير فوري"],alternates:{canonical:absoluteUrl("/games-topup")},openGraph:{title,description,url:absoluteUrl("/games-topup"),siteName:SITE_NAME,locale:"ar_EG",images:[absoluteUrl("/devplay-app-icon-512.png")]},twitter:{card:"summary_large_image",title,description,images:[absoluteUrl("/devplay-app-icon-512.png")]}};
export default function GamesTopupPage(){const faq={"@context":"https://schema.org","@type":"FAQPage",mainEntity:[{"@type":"Question",name:"كيف أشحن الألعاب من DevPlay؟",acceptedAnswer:{"@type":"Answer",text:"اختر اللعبة والباقة، أدخل Player ID بدقة، ثم أكد الطلب من رصيد محفظة DevPlay وتابع حالة التنفيذ من صفحة طلباتي."}},{"@type":"Question",name:"كم يستغرق شحن الـ ID؟",acceptedAnswer:{"@type":"Answer",text:"يستغرق الشحن المباشر عادةً من دقيقة إلى 30 دقيقة حسب اللعبة وحالة المورد."}},{"@type":"Question",name:"هل السعر الظاهر نهائي؟",acceptedAnswer:{"@type":"Answer",text:"يعيد خادم DevPlay التحقق من السعر والتوفر قبل إنشاء الطلب، ولا يعتمد على سعر محفوظ في المتصفح."}}]};return <AppShell><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(faq)}}/><SeoLanding kind="games"/></AppShell>}
