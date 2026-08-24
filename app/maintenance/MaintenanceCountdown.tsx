"use client";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./maintenance.module.css";
function remaining(target:string){const diff=new Date(target).getTime()-Date.now();if(diff<=0)return"نتوقع العودة في أي لحظة";const minutes=Math.ceil(diff/60000),days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),mins=minutes%60;return [days?`${days} يوم`:"",hours?`${hours} ساعة`:"",mins?`${mins} دقيقة`:""].filter(Boolean).join(" و ")}
export function MaintenanceCountdown({expectedAt}:{expectedAt:string|null}){const[text,setText]=useState(expectedAt?remaining(expectedAt):"");useEffect(()=>{if(!expectedAt)return;const timer=window.setInterval(()=>setText(remaining(expectedAt)),30000);return()=>window.clearInterval(timer)},[expectedAt]);return <div className={styles.live}>{expectedAt&&<span><i/><strong>العودة المتوقعة</strong><b>{text}</b><small>{new Date(expectedAt).toLocaleString("ar-EG")}</small></span>}<button type="button" onClick={()=>window.location.reload()}><RefreshCw size={17}/> إعادة المحاولة</button></div>}
