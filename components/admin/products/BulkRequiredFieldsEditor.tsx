"use client";

import { CheckCircle2, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { updateProductOffersRequiredFields } from "@/app/admin/products/[id]/offer-actions";
import type { ProductInputType, ProductRequiredField } from "@/types/product";

const playerIdField: ProductRequiredField = {
  id: "target_account",
  label: "معرف اللاعب / Player ID",
  placeholder: "اكتب Player ID أو معرف الحساب بدقة",
  type: "text",
  required: true,
  helperText: "سيتم إرسال هذا الحقل للمورد لتنفيذ الشحن.",
};

function emptyField(index: number): ProductRequiredField {
  return {
    id: `field_${index + 1}`,
    label: "",
    placeholder: "",
    type: "text",
    required: true,
  };
}

export function BulkRequiredFieldsEditor({
  productId,
  initialFields,
  initialTargetField,
  offersCount,
}: {
  productId: string;
  initialFields: ProductRequiredField[];
  initialTargetField: string | null;
  offersCount: number;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ProductRequiredField[]>(
    initialFields.length ? initialFields : [playerIdField],
  );
  const [targetField, setTargetField] = useState(
    initialTargetField || initialFields[0]?.id || "target_account",
  );
  const [loading, setLoading] = useState<"all" | "empty" | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const validTarget = useMemo(
    () => fields.some((field) => field.id.trim() === targetField),
    [fields, targetField],
  );

  function updateField(index: number, patch: Partial<ProductRequiredField>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  async function apply(mode: "all" | "empty") {
    setLoading(mode);
    setMessage("");
    const result = await updateProductOffersRequiredFields({
      productId,
      requiredFields: fields,
      targetAccountFieldId: validTarget ? targetField : null,
      mode,
    });
    setLoading(null);
    setSuccess(result.success);
    setMessage(result.message);
    if (result.success) router.refresh();
  }

  return (
    <section style={{ display: "grid", gap: 12, padding: 14, border: "1px solid var(--primary-border)", borderRadius: 14, background: "var(--primary-soft)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 11 }}>البيانات المطلوبة لكل باقات المنتج</strong>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 8 }}>
            عدّلي الحقول مرة واحدة ثم طبّقيها على {offersCount.toLocaleString("ar-EG")} باقة، بدون فتح كل باقة.
          </p>
        </div>
        <button type="button" onClick={() => { setFields([playerIdField]); setTargetField("target_account"); }} style={{ minHeight: 34, paddingInline: 11, border: "1px solid var(--primary-border)", borderRadius: 9, background: "var(--surface)", color: "var(--primary)", fontWeight: 800 }}>
          تجهيز Player ID تلقائيًا
        </button>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        {fields.map((field, index) => (
          <article key={`${index}-${field.id}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 7, alignItems: "end", padding: 9, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 7 }}><span>Field ID</span><input value={field.id} onChange={(e) => updateField(index, { id: e.target.value.trim().replace(/\s+/g, "_").toLowerCase() })} placeholder="player_id" /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 7 }}><span>الاسم للعميل</span><input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Player ID" /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 7 }}><span>النوع</span><select value={field.type} onChange={(e) => updateField(index, { type: e.target.value as ProductInputType })}><option value="text">نص</option><option value="number">رقم</option><option value="email">Email</option><option value="tel">هاتف</option><option value="url">رابط</option></select></label>
            <button type="button" aria-label="حذف الحقل" onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))} style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: "1px solid var(--danger)", borderRadius: 9, background: "transparent", color: "var(--danger)" }}><Trash2 size={15} /></button>
            <label style={{ display: "grid", gap: 4, fontSize: 7, gridColumn: "1 / -1" }}><span>النص داخل الخانة</span><input value={field.placeholder} onChange={(e) => updateField(index, { placeholder: e.target.value })} placeholder="اكتب البيانات المطلوبة بدقة" /></label>
          </article>
        ))}
      </div>

      <button type="button" onClick={() => setFields((current) => [...current, emptyField(current.length)])} style={{ width: "fit-content", minHeight: 34, display: "inline-flex", alignItems: "center", gap: 6, paddingInline: 11, border: "1px solid var(--primary-border)", borderRadius: 9, background: "var(--surface)", color: "var(--primary)", fontWeight: 800 }}><Plus size={15} /> إضافة حقل مطلوب</button>

      <label style={{ display: "grid", gap: 5, fontSize: 8 }}>
        <span>الحقل الذي يُرسل للمورد كمعرف الشحن</span>
        <select value={targetField} onChange={(e) => setTargetField(e.target.value)}>
          <option value="">بدون حقل مورد محدد</option>
          {fields.filter((field) => field.id.trim()).map((field) => <option key={field.id} value={field.id}>{field.label || field.id}</option>)}
        </select>
        <small style={{ color: "var(--muted)" }}>في باقات Top Up اختاري Player ID؛ باقي الحقول مثل Server أو Email تُحفظ مع الطلب ولا تُستبدل به.</small>
      </label>

      {message && <p role="status" style={{ margin: 0, color: success ? "var(--success)" : "var(--danger)", fontSize: 8, fontWeight: 800 }}>{success && <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginInlineEnd: 5 }} />}{message}</p>}

      <footer style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={Boolean(loading) || !fields.length} onClick={() => void apply("empty")} style={{ minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6, paddingInline: 13, border: "1px solid var(--primary-border)", borderRadius: 10, background: "var(--surface)", color: "var(--foreground)", fontWeight: 900 }}>{loading === "empty" ? <LoaderCircle size={16} /> : <Save size={16} />} تطبيق على الباقات التي بدون حقول فقط</button>
        <button type="button" disabled={Boolean(loading) || !fields.length} onClick={() => void apply("all")} style={{ minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6, paddingInline: 13, border: 0, borderRadius: 10, background: "var(--primary)", color: "white", fontWeight: 900 }}>{loading === "all" ? <LoaderCircle size={16} /> : <Save size={16} />} تطبيق على كل الباقات</button>
      </footer>
    </section>
  );
}
