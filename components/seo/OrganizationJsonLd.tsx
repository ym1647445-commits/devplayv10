import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl, jsonLd } from "@/lib/seo/site";

export function OrganizationJsonLd(){
  const data={"@context":"https://schema.org","@type":"OnlineStore","@id":`${SITE_URL}/#store`,name:SITE_NAME,alternateName:"DevPlay",url:SITE_URL,logo:absoluteUrl("/devplay-app-icon-512.png"),image:absoluteUrl("/devplay-app-icon-512.png"),description:DEFAULT_DESCRIPTION,email:"support@devplaystudio.com",telephone:"+201035966569",sameAs:["https://t.me/DevPlaySupport"],contactPoint:[{"@type":"ContactPoint",contactType:"customer support",telephone:"+201035966569",availableLanguage:["Arabic","English"],url:absoluteUrl("/support")}],currenciesAccepted:["EGP","USD"],paymentAccepted:"DevPlay Wallet"};
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(data)}}/>;
}
