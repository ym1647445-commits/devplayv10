import type { ReactNode } from "react";

import { AdminProviderQuickNav } from "./AdminProviderQuickNav";

export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <><AdminProviderQuickNav/>{children}</>;
}
