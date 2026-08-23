import type { ReactNode } from "react";

import "./item4gamer.css";

export default function Item4GamerLayout({ children }: { children: ReactNode }) {
  return <div className="item4gamer-admin-shell">{children}</div>;
}
