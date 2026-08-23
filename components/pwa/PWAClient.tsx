"use client";

import { Download, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./PWAClient.module.css";

interface InstallPromptEvent extends Event { prompt():Promise<void>; userChoice:Promise<{outcome:"accepted"|"dismissed"}> }
type InstallWindow = Window & { __devplayInstallPrompt?: InstallPromptEvent };

export function PWAClient() {
  const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const [showIOS,setShowIOS]=useState(false);
  const [dismissed,setDismissed]=useState(true);

  useEffect(()=>{
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).catch(()=>undefined);
    const standalone=window.matchMedia("(display-mode: standalone)").matches;
    const hidden=sessionStorage.getItem("devplay-install-dismissed")==="1";
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
    const initializeWindowState=window.setTimeout(()=>{
      setDismissed(hidden||standalone);
      setShowIOS(ios&&!standalone&&!hidden);
    },0);
    const handler=(event:Event)=>{event.preventDefault();const installEvent=event as InstallPromptEvent;(window as InstallWindow).__devplayInstallPrompt=installEvent;window.dispatchEvent(new CustomEvent("devplay-install-prompt"));setPromptEvent(installEvent);setDismissed(false)};
    window.addEventListener("beforeinstallprompt",handler);
    return()=>{window.clearTimeout(initializeWindowState);window.removeEventListener("beforeinstallprompt",handler)};
  },[]);

  function dismiss(){sessionStorage.setItem("devplay-install-dismissed","1");setDismissed(true);setShowIOS(false)}
  async function install(){if(!promptEvent)return;await promptEvent.prompt();const choice=await promptEvent.userChoice;if(choice.outcome==="accepted")setDismissed(true);delete (window as InstallWindow).__devplayInstallPrompt;setPromptEvent(null)}
  if(dismissed||(!promptEvent&&!showIOS))return null;
  return <aside className={styles.prompt} role="status" dir="rtl"><span>{showIOS?<Share2/>:<Download/>}</span><div><strong>ثبّتي تطبيق DevPlay</strong><small>{showIOS?"من زر المشاركة اختاري «إضافة إلى الشاشة الرئيسية».":"دخول أسرع وتجربة كاملة مثل التطبيق."}</small></div>{promptEvent&&<button onClick={()=>void install()}>تثبيت</button>}<button className={styles.close} onClick={dismiss} aria-label="إغلاق"><X/></button></aside>;
}
