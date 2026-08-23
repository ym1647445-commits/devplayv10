import Link from "next/link";
import type { ReactNode } from "react";

import "./tabs.css";

export default function Item4GamerTemplate({ children }: { children: ReactNode }) {
  return <><nav className="i4g-admin-tabs"><Link href="/admin/item4gamer">المزامنة</Link><Link href="/admin/item4gamer/catalog">الكتالوج والاستيراد الجماعي</Link><Link href="/admin/products">منتجات المتجر</Link><Link href="/admin/providers">إعدادات الموردين</Link></nav>{children}</>;
}
