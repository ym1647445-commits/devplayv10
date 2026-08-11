import type { ReactNode } from "react";

import { WhatsAppSupport } from "@/components/support/WhatsAppSupport";

import { BottomNavigation } from "../BottomNavigation";
import { Header } from "../Header";

import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <Header />

      <main className={styles.content}>
        {children}
      </main>

      <WhatsAppSupport />

      <BottomNavigation />
    </div>
  );
}