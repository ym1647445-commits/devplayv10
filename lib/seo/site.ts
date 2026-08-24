export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://devplaystudio.com").replace(/\/$/, "");
export const SITE_NAME = "DevPlay Top Up";
export const DEFAULT_DESCRIPTION = "اشحن ألعابك واشترِ البطاقات الرقمية بأمان وسرعة من DevPlay Top Up. باقات PUBG وFree Fire وMobile Legends وخدمات رقمية بأسعار واضحة ودعم عربي.";
export const DEFAULT_KEYWORDS = ["شحن ألعاب","شحن ببجي","شحن فري فاير","شحن ألعاب بالـ ID","بطاقات رقمية","PUBG UC","Free Fire Diamonds","Mobile Legends Diamonds","DevPlay"];
export function absoluteUrl(path="/"){return `${SITE_URL}${path.startsWith("/")?path:`/${path}`}`}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c")}
