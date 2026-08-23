import type { ReactNode } from "react";

import { Item4GamerOrderControls } from "./Item4GamerOrderControls";

export default function AdminOrdersTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <Item4GamerOrderControls />
      {children}
    </>
  );
}
