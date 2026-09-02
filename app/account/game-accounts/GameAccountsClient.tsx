"use client";

import {
  ArrowLeft,
  Check,
  Gamepad2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { maskGameIdentifier } from "@/lib/game-accounts/privacy";

import { deleteGameAccount, saveGameAccount } from "./actions";
import styles from "./game-accounts.module.css";
import type { GameAccountProduct, SavedGameAccount } from "./types";

interface Props {
  initialAccounts: SavedGameAccount[];
  products: GameAccountProduct[];
  setupRequired: boolean;
}

export function GameAccountsClient({ initialAccounts, products, setupRequired }: Props) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [gameQuery, setGameQuery] = useState("");
  const [editing, setEditing] = useState<SavedGameAccount | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [nickname, setNickname] = useState("");
  const [identifiers, setIdentifiers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavedGameAccount | null>(null);
  const [pending, startTransition] = useTransition();

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const accounts = useMemo(
    () => initialAccounts.filter((account) => !deletedIds.has(account.id)),
    [deletedIds, initialAccounts],
  );
  const selectedProduct = productMap.get(selectedProductId) ?? null;
  const visibleProducts = useMemo(() => {
    const needle = gameQuery.trim().toLocaleLowerCase("ar");
    return needle ? products.filter((product) => product.name.toLocaleLowerCase("ar").includes(needle)) : products;
  }, [gameQuery, products]);
  const visibleAccounts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ar");
    if (!needle) return accounts;
    return accounts.filter((account) => {
      const productName = productMap.get(account.productId)?.name ?? "";
      return `${account.nickname} ${productName}`.toLocaleLowerCase("ar").includes(needle);
    });
  }, [accounts, productMap, query]);

  function openCreate() {
    setEditing(null);
    setSelectedProductId("");
    setNickname("");
    setIdentifiers({});
    setGameQuery("");
    setMessage("");
    setSheetOpen(true);
  }

  function openEdit(account: SavedGameAccount) {
    setEditing(account);
    setSelectedProductId(account.productId);
    setNickname(account.nickname);
    setIdentifiers(account.identifiers);
    setGameQuery("");
    setMessage("");
    setSheetOpen(true);
  }

  function selectProduct(productId: string) {
    if (editing) return;
    setSelectedProductId(productId);
    setIdentifiers({});
  }

  function submit() {
    if (!selectedProduct) {
      setMessage("اختاري اللعبة أولًا.");
      return;
    }
    startTransition(async () => {
      const result = await saveGameAccount({
        accountId: editing?.id,
        productId: selectedProduct.id,
        nickname,
        identifiers,
      });
      setMessage(result.message);
      if (!result.success) return;
      setSheetOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteGameAccount(deleteTarget.id);
      setMessage(result.message);
      if (!result.success) return;
      setDeletedIds((current) => new Set(current).add(deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.hero}>
        <div className={styles.heroIcon}><Gamepad2 size={24} /></div>
        <div>
          <span>GAME ACCOUNT MANAGER</span>
          <h1>حسابات ألعابي <b>🎮</b></h1>
          <p>احفظ حسابات ألعابك واشحن لها أسرع في المرات الجاية.</p>
        </div>
        <button type="button" className={styles.primaryAction} onClick={openCreate} disabled={setupRequired || products.length === 0}>
          <Plus size={17} /> إضافة حساب
        </button>
      </header>

      {setupRequired && (
        <section className={styles.setupNotice}>
          <ShieldCheck size={20} />
          <div><strong>يلزم تجهيز قاعدة البيانات مرة واحدة</strong><p>شغّلي ملف <code>docs/saved_game_accounts.sql</code> داخل Supabase SQL Editor، ثم أعيدي تحميل الصفحة.</p></div>
        </section>
      )}

      {!setupRequired && products.length === 0 && (
        <section className={styles.setupNotice}>
          <Gamepad2 size={20} />
          <div><strong>لا توجد ألعاب مؤهلة حاليًا</strong><p>ستظهر هنا المنتجات الفعالة التي لديها حقول Player/User ID حقيقية.</p></div>
        </section>
      )}

      {accounts.length > 2 && (
        <label className={styles.searchBar}>
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باللعبة أو اسم الحساب" />
        </label>
      )}

      {accounts.length === 0 && !setupRequired ? (
        <section className={styles.emptyState}>
          <span><Gamepad2 size={29} /></span>
          <h2>لسه مفيش حسابات محفوظة</h2>
          <p>احفظ أول حساب لعبة علشان تقدر تستخدمه بسرعة وقت الشحن.</p>
          <button type="button" onClick={openCreate} disabled={products.length === 0}><Plus size={17} /> إضافة أول حساب</button>
        </section>
      ) : (
        <section className={styles.accountsGrid} aria-label="الحسابات المحفوظة">
          {visibleAccounts.map((account) => {
            const product = productMap.get(account.productId);
            if (!product) return null;
            return (
              <article className={styles.accountCard} key={account.id}>
                <header>
                  <div className={styles.gameImage}>
                    {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Gamepad2 size={22} />}
                  </div>
                  <div><small>{product.name}</small><strong>{account.nickname}</strong></div>
                </header>
                <div className={styles.identifiers}>
                  {product.fields.map((field) => account.identifiers[field.id] ? (
                    <div key={field.id}><span>{field.label}</span><b dir="ltr">{maskGameIdentifier(account.identifiers[field.id])}</b></div>
                  ) : null)}
                </div>
                <footer>
                  <Link href={`/products/${product.slug}`}>استخدم للشحن <ArrowLeft size={15} /></Link>
                  <button type="button" onClick={() => openEdit(account)} aria-label={`تعديل ${account.nickname}`}><Pencil size={16} /></button>
                  <button type="button" className={styles.deleteButton} onClick={() => { setMessage(""); setDeleteTarget(account); }} aria-label={`حذف ${account.nickname}`}><Trash2 size={16} /></button>
                </footer>
              </article>
            );
          })}
          {visibleAccounts.length === 0 && <div className={styles.noResults}>لا توجد حسابات تطابق البحث.</div>}
        </section>
      )}

      {sheetOpen && (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setSheetOpen(false); }}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="game-account-form-title">
            <header>
              <div><small>{editing ? "تعديل آمن" : "حساب جديد"}</small><h2 id="game-account-form-title">{editing ? editing.nickname : "إضافة حساب لعبة"}</h2></div>
              <button type="button" onClick={() => setSheetOpen(false)} disabled={pending} aria-label="إغلاق"><X size={19} /></button>
            </header>

            <div className={styles.sheetBody}>
              <section className={styles.gamePicker}>
                <div className={styles.fieldHeading}><strong>اللعبة *</strong>{editing && <small>لا يمكن تغيير اللعبة أثناء التعديل لحماية توافق الـIDs.</small>}</div>
                {!editing && <label><Search size={15} /><input value={gameQuery} onChange={(event) => setGameQuery(event.target.value)} placeholder="ابحث عن لعبة" /></label>}
                <div className={styles.gameList}>
                  {(editing && selectedProduct ? [selectedProduct] : visibleProducts).map((product) => (
                    <button type="button" key={product.id} aria-pressed={selectedProductId === product.id} onClick={() => selectProduct(product.id)}>
                      <span>{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Gamepad2 size={18} />}</span>
                      <strong>{product.name}</strong>
                      {selectedProductId === product.id && <Check size={17} />}
                    </button>
                  ))}
                  {visibleProducts.length === 0 && !editing && <p>لا توجد لعبة تطابق البحث.</p>}
                </div>
              </section>

              <label className={styles.formField}>
                <span>اسم مميز للحساب *</span>
                <input value={nickname} maxLength={40} onChange={(event) => setNickname(event.target.value)} placeholder="مثال: حسابي الأساسي" autoComplete="off" />
                <small>اسم يساعدك تفرق بين حساباتك.</small>
              </label>

              {selectedProduct && (
                <section className={styles.idFields}>
                  <div className={styles.fieldHeading}><strong>بيانات الحساب</strong><small>لا تحفظ كلمات مرور أو OTP أو أكواد استرداد هنا.</small></div>
                  {selectedProduct.fields.map((field) => (
                    <label className={styles.formField} key={field.id}>
                      <span>{field.label} {field.required && <b>*</b>}</span>
                      <input
                        type={field.type}
                        inputMode={field.type === "number" ? "numeric" : undefined}
                        value={identifiers[field.id] ?? ""}
                        maxLength={160}
                        onChange={(event) => setIdentifiers((current) => ({ ...current, [field.id]: event.target.value }))}
                        placeholder={field.placeholder}
                        autoComplete="off"
                      />
                      {field.helperText && <small>{field.helperText}</small>}
                    </label>
                  ))}
                </section>
              )}

              {message && <div className={styles.formMessage}>{message}</div>}
            </div>
            <footer><button type="button" className={styles.cancel} onClick={() => setSheetOpen(false)} disabled={pending}>إلغاء</button><button type="button" className={styles.save} onClick={submit} disabled={pending}>{pending ? "جارٍ الحفظ..." : editing ? "حفظ التعديل" : "حفظ الحساب"}</button></footer>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.overlay} role="presentation">
          <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-game-account-title">
            <span><Trash2 size={22} /></span>
            <h2 id="delete-game-account-title">حذف الحساب المحفوظ؟</h2>
            <p>هتحذف «{deleteTarget.nickname}» من حسابات ألعابك المحفوظة فقط.</p>
            {message && <div className={styles.formMessage}>{message}</div>}
            <footer><button type="button" onClick={() => setDeleteTarget(null)} disabled={pending}>إلغاء</button><button type="button" className={styles.confirmDelete} onClick={confirmDelete} disabled={pending}>{pending ? "جارٍ الحذف..." : "حذف"}</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}
