import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:["/","/products","/products/","/categories","/categories/","/offers","/support","/games-topup","/gift-cards-egypt"],disallow:["/admin/","/api/","/account","/cart","/checkout","/notifications","/orders","/settings","/wallet","/auth","/search"]},sitemap:`${SITE_URL}/sitemap.xml`,host:SITE_URL}}
