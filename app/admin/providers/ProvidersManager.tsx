"use client";

import { Activity, CheckCircle2, CircleDollarSign, PackageSearch, PlugZap, RefreshCw, Settings2, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import { setProviderActive, testProviderConnection, updateProviderOptions } from "./actions";

export interface ProviderAdminRow {
  id: string; code: string; name: string; active: boolean; status: string; priority: number;
  selectionMode: "manual" | "auto"; exposeName: boolean; apiBaseUrl: string | null;
  currentBalance: number | null; currency: string; lastSync: string | null; productsCount: number;
  successfulOrders: number; failedOrders: number; averageExecutionSeconds: number | null; lastError: string | null;
}

export function ProvidersManager({ providers, migrationMissing = false }: { providers: ProviderAdminRow[]; migrationMissing?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(task: () => Promise<{ success: boolean; message: string }>) { setMessage(null); startTransition(async () => { const result = await task(); setMessage(result.message); }); }
  return <main className="admin-providers-page">
    <header><div><small>MULTI-PROVIDER CONTROL</small><h1>الموردون</h1><p>إدارة الاتصال والأولوية والتوفر بدون كشف أي API Key للواجهة.</p></div><span><PlugZap size={24}/> {providers.filter((provider) => provider.active).length} نشط</span></header>
    {migrationMissing && <div className="admin-provider-warning"><TriangleAlert size={18}/><div><strong>شغّلي Migration أولًا</strong><p>docs/multi_provider_foundation.sql</p></div></div>}
    {message && <p className="admin-provider-message">{message}</p>}
    <section className="admin-provider-grid">{providers.map((provider) => <article key={provider.id}>
      <div className="admin-provider-head"><span className={`provider-health provider-health-${provider.status}`}>{provider.status === "healthy" ? <CheckCircle2 size={18}/> : <Activity size={18}/>}</span><div><strong>{provider.name}</strong><small>{provider.code}</small></div><b>{provider.active ? "مفعّل" : "متوقف"}</b></div>
      <dl><div><dt><CircleDollarSign size={14}/> الرصيد</dt><dd>{provider.currentBalance === null ? "غير معروف" : `${provider.currentBalance.toFixed(2)} ${provider.currency}`}</dd></div><div><dt><PackageSearch size={14}/> المنتجات</dt><dd>{provider.productsCount}</dd></div><div><dt>ناجح / فشل</dt><dd>{provider.successfulOrders} / {provider.failedOrders}</dd></div><div><dt>متوسط التنفيذ</dt><dd>{provider.averageExecutionSeconds === null ? "—" : `${Math.round(provider.averageExecutionSeconds)} ث`}</dd></div></dl>
      <small className="provider-meta">آخر مزامنة: {provider.lastSync ? new Date(provider.lastSync).toLocaleString("ar-EG") : "لم تتم"}</small>{provider.lastError && <p className="provider-error">{provider.lastError}</p>}
      <div className="provider-options"><label>الأولوية<input type="number" defaultValue={provider.priority} id={`priority-${provider.id}`}/></label><label>الاختيار<select defaultValue={provider.selectionMode} id={`mode-${provider.id}`}><option value="manual">Manual</option><option value="auto">Auto</option></select></label></div>
      <div className="provider-actions"><button disabled={pending} onClick={() => run(() => testProviderConnection(provider.id))}><PlugZap size={15}/> اختبار</button><button disabled={pending} onClick={() => { const priority = Number((document.getElementById(`priority-${provider.id}`) as HTMLInputElement)?.value); const mode = (document.getElementById(`mode-${provider.id}`) as HTMLSelectElement)?.value as "manual"|"auto"; run(() => updateProviderOptions(provider.id,{ priority, selectionMode: mode, exposeName: provider.exposeName })); }}><Settings2 size={15}/> حفظ</button><button disabled={pending} onClick={() => run(() => setProviderActive(provider.id,!provider.active))}>{provider.active ? "تعطيل" : "تفعيل"}</button><a href={`/admin/provider-offers?provider=${encodeURIComponent(provider.code)}`}><RefreshCw size={15}/> المنتجات</a></div>
    </article>)}</section>
  </main>;
}
