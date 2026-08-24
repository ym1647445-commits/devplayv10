import type { ReactNode } from "react";

import { PremiumAtmosphere } from "@/components/effects/PremiumAtmosphere";
import { CommerceExperience } from "@/components/experience/CommerceExperience";
import "@/styles/premium-effects.css";
import "@/styles/commerce-experience.css";

export default function RootTemplate({ children }: { children: ReactNode }) {
  return <><PremiumAtmosphere /><CommerceExperience />{children}</>;
}
