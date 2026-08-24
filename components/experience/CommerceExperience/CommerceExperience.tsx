"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const benefits = [
  ["⚡", "تنفيذ Fast", "متابعة تلقائية لحالة الطلب"],
  ["🎮", "شحن الـ ID", "عادةً من دقيقة إلى 30 دقيقة"],
  ["🎁", "الهدايا والأكواد", "عادةً من دقيقة إلى 10 دقائق"],
  ["🎧", "دعم سريع", "لو حصل تأخير تواصلي معنا فورًا"],
];

export function CommerceExperience() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/products/")) return;
    const information = document.querySelector<HTMLElement>('[class*="ProductDetails_information"]');
    if (!information || information.querySelector('[data-devplay-benefits]')) return;
    const panel = document.createElement("section");
    panel.dataset.devplayBenefits = "true";
    panel.className = "devplay-commerce-benefits";
    panel.setAttribute("aria-label", "مميزات تنفيذ الطلب");
    panel.innerHTML = benefits.map(([icon,title,text]) => `<article><span aria-hidden="true">${icon}</span><div><strong>${title}</strong><small>${text}</small></div></article>`).join("");
    const description = information.querySelector('[class*="ProductDetails_shortDescription"]');
    description?.insertAdjacentElement("afterend", panel) ?? information.prepend(panel);
    return () => panel.remove();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/orders") return;
    const decorate = () => {
      document.querySelectorAll<HTMLElement>('[class*="OrdersHistory_card"]').forEach((card) => {
        if (card.querySelector('[data-devplay-invoice-link]')) return;
        const number = card.querySelector<HTMLElement>('[class*="OrdersHistory_orderTop"] strong')?.textContent?.trim();
        const details = card.querySelector<HTMLElement>('[class*="OrdersHistory_details"]');
        if (!number || !details || !number.startsWith("DP-O-")) return;
        const link = document.createElement("a");
        link.dataset.devplayInvoiceLink = "true";
        link.className = "devplay-invoice-link";
        link.href = `/orders/receipt/${encodeURIComponent(number)}`;
        link.innerHTML = '<span>عرض الفاتورة والتتبع الكامل</span><b>←</b>';
        details.append(link);
      });
    };
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
