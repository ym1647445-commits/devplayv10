import type { ReactNode } from "react";

import { DeliveredCodeGuard } from "./DeliveredCodeGuard";

export default function OrdersTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <DeliveredCodeGuard />
      {children}
    </>
  );
}
