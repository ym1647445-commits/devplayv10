import type { ReactNode } from "react";

import "./providers.css";

export default function ProvidersLayout({ children }: { children: ReactNode }) {
  return <div className="providers-admin-shell">{children}</div>;
}
