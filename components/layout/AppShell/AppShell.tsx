import type { ReactNode } from "react";

import { DevPlayAI } from "@/components/support/DevPlayAI";

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

      <DevPlayAI />

      <BottomNavigation />
    </div>
  );
}
