"use client";

import { Bell, CalendarHeart, Check, Languages, LoaderCircle, LockKeyhole, MonitorCog, RotateCcw, Save, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import type { AccentColor, DisplayDensity, FontSize, ThemeMode } from "@/types/theme";

import { updateCustomerSettings, type SettingsPayload } from "./actions";
import styles from "./settings.module.css";

const themeOptions: Array<{value:ThemeMode;label:string;description:string}>=[
  {value:"dark",label:"داكن",description:"المظهر الافتراضي"},{value:"light",label:"فاتح",description:"خلفية مضيئة"},{value:"oled",label:"OLED",description:"أسود عميق"},{value:"high-contrast",label:"تباين عالٍ",description:"وضوح أقوى"},
];
const accentOptions:Array<{value:AccentColor;label:string}>=[{value:"violet",label:"بنفسجي"},{value:"blue",label:"أزرق"},{value:"cyan",label:"سماوي"},{value:"green",label:"أخضر"},{value:"yellow",label:"ذهبي"},{value:"orange",label:"برتقالي"},{value:"red",label:"أحمر"},{value:"pink",label:"وردي"}];

export function SettingsClient({ initial }: { initial: SettingsPayload }) {
  const [form,setForm]=useState(initial); const [saving,setSaving]=useState(false); const [message,setMessage]=useState<{type:"success"|"error";text:string}|null>(null);
  const { setTheme,setAccent,setFontSize,setDensity,setReduceMotion,resetAppearance }=useTheme(); const { refreshAuth }=useAuth();
  function update<K extends keyof SettingsPayload>(key:K,value:SettingsPayload[K]){setForm(current=>({...current,[key]:value}));}
  function chooseTheme(value:ThemeMode){update("theme",value);setTheme(value)} function chooseAccent(value:AccentColor){update("accentColor",value);setAccent(value)}
  async function save(){setSaving(true);setMessage(null);const result=await updateCustomerSettings(form);setSaving(false);setMessage({type:result.success?"success":"error",text:result.message});if(result.success)await refreshAuth();}
  return <div className={styles.layout}>
    <div className={styles.column}>
      <section className={styles.panel}><header><span><CalendarHeart size={18}/></span><div><strong>عيد ميلادك وهدايا DevPlay</strong><small>إضافة تاريخ الميلاد اختيارية، لكنها تؤهلك لمكافآت عيد الميلاد.</small></div></header><div className={styles.birthdayBox}><label><span>تاريخ الميلاد</span><input type="date" dir="ltr" max={new Date().toISOString().slice(0,10)} value={form.birthDate} disabled={form.birthDateLocked} onChange={e=>update("birthDate",e.target.value)}/></label>{form.birthDateLocked?<p><LockKeyhole size={15}/> تم حفظ تاريخ الميلاد وتأمينه. لتصحيح أي خطأ تواصلي مع خدمة العملاء.</p>:<p><CalendarHeart size={15}/> اختياري — راجعي التاريخ جيدًا؛ بعد الحفظ لن يمكنك تغييره بنفسك.</p>}</div></section>
      <section className={styles.panel}><header><span><UserRound size={18}/></span><div><strong>البيانات الأساسية</strong><small>البيانات الظاهرة داخل حسابك وطلباتك.</small></div></header><div className={styles.fields}><label><span>الاسم الكامل</span><input value={form.fullName} maxLength={100} onChange={e=>update("fullName",e.target.value)}/></label><label><span>رقم الهاتف</span><input value={form.phone} maxLength={30} dir="ltr" onChange={e=>update("phone",e.target.value)}/></label><label><span>اللغة</span><select value={form.language} onChange={e=>update("language",e.target.value as "ar"|"en")}><option value="ar">العربية</option><option value="en">English (قريبًا)</option></select></label></div></section>
      <section className={styles.panel}><header><span><MonitorCog size={18}/></span><div><strong>المظهر</strong><small>اختاري الشكل المناسب لك وسيُطبّق مباشرة.</small></div></header><div className={styles.optionGrid}>{themeOptions.map(option=><button className={form.theme===option.value?styles.selected:""} type="button" onClick={()=>chooseTheme(option.value)} key={option.value}><strong>{option.label}</strong><small>{option.description}</small>{form.theme===option.value&&<Check size={15}/>}</button>)}</div><div className={styles.group}><b>لون الواجهة</b><div className={styles.accents}>{accentOptions.map(option=><button type="button" data-accent={option.value} className={form.accentColor===option.value?styles.activeAccent:""} onClick={()=>chooseAccent(option.value)} aria-label={option.label} title={option.label} key={option.value}/>)}</div></div><div className={styles.twoColumns}><label><span>حجم الخط</span><select value={form.fontSize} onChange={e=>{const v=e.target.value as FontSize;update("fontSize",v);setFontSize(v)}}><option value="small">صغير</option><option value="medium">متوسط</option><option value="large">كبير</option><option value="xlarge">كبير جدًا</option></select></label><label><span>كثافة العرض</span><select value={form.displayDensity} onChange={e=>{const v=e.target.value as DisplayDensity;update("displayDensity",v);setDensity(v)}}><option value="compact">مدمج</option><option value="comfortable">مريح</option></select></label></div><Toggle label="تقليل الحركة" description="تعطيل أغلب المؤثرات الانتقالية." checked={form.reduceMotion} onChange={v=>{update("reduceMotion",v);setReduceMotion(v)}}/></section>
    </div>
    <div className={styles.column}>
      <section className={styles.panel}><header><span><Bell size={18}/></span><div><strong>الإشعارات</strong><small>تحكمي في أنواع التنبيهات التي تصلك.</small></div></header><div className={styles.toggles}><Toggle label="إشعارات داخل الموقع" description="إظهار تحديثات الحساب داخل DevPlay." checked={form.inAppEnabled} onChange={v=>update("inAppEnabled",v)}/><Toggle label="البريد الإلكتروني" description="السماح بإرسال التنبيهات إلى بريدك." checked={form.emailEnabled} onChange={v=>update("emailEnabled",v)}/><Toggle label="تحديثات الطلبات" description="إنشاء الطلب وتغير حالته واكتماله." checked={form.orderNotifications} onChange={v=>update("orderNotifications",v)}/><Toggle label="طلبات الإيداع" description="مراجعة وقبول أو رفض إضافة الرصيد." checked={form.depositNotifications} onChange={v=>update("depositNotifications",v)}/><Toggle label="العروض والتخفيضات" description="العروض الجديدة والكوبونات المتاحة." checked={form.promotionNotifications} onChange={v=>update("promotionNotifications",v)}/><Toggle label="تنبيهات الأمان" description="تغيرات الحساب والتنبيهات المهمة." checked={form.securityNotifications} onChange={v=>update("securityNotifications",v)}/></div></section>
      <section className={styles.security}><ShieldCheck size={22}/><div><strong>إعدادات آمنة</strong><p>لا تعرض هذه الصفحة كلمة المرور أو مفاتيح المورد. يتم حفظ إعدادات الحساب للمستخدم المسجل فقط.</p></div></section>
      {message&&<p className={message.type==="success"?styles.success:styles.error} role="alert">{message.text}</p>}
      <div className={styles.actions}><button type="button" className={styles.reset} onClick={()=>{resetAppearance();setForm(c=>({...c,theme:"dark",accentColor:"violet",fontSize:"medium",displayDensity:"compact",reduceMotion:false}))}}><RotateCcw size={16}/> الافتراضي</button><button type="button" className={styles.save} disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className={styles.spinner} size={17}/>:<Save size={17}/>} حفظ الإعدادات</button></div>
      <div className={styles.languageNote}><Languages size={18}/><span>الواجهة العربية هي الأساسية حاليًا، مع تجهيز تفضيل اللغة لدعم الإنجليزية لاحقًا.</span></div>
    </div>
  </div>;
}

function Toggle({label,description,checked,onChange}:{label:string;description:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className={styles.toggle}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i aria-hidden="true"/></label>}
