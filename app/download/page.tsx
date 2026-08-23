import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { InstallAppClient } from "@/components/pwa/InstallAppClient";
export const metadata:Metadata={title:"تنزيل تطبيق DevPlay",description:"ثبّت DevPlay Top Up كتطبيق ويب سريع وآمن على هاتفك أو الكمبيوتر."};
export default function DownloadPage(){return <AppShell><InstallAppClient/></AppShell>}
