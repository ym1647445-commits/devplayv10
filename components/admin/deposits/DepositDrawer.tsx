"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  ImageIcon,
  LoaderCircle,
  Mail,
  UserRound,
  WalletCards,
  X,
  XCircle,
  ZoomIn,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  approveDeposit,
  markDepositUnderReview,
  rejectDeposit,
} from "@/app/admin/deposits/actions";
import type { AdminDeposit } from "@/types/adminDeposit";

import styles from "./DepositDrawer.module.css";

interface DepositDrawerProps {
  deposit: AdminDeposit | null;
  onClose: () => void;
}

type ActionMode =
  | "approve"
  | "reject"
  | null;

function formatCurrency(
  value: number,
  currency: "EGP" | "USD",
): string {
  if (currency === "USD") {
    return `${value.toFixed(2)} USDT`;
  }

  return `${value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

export function DepositDrawer({
  deposit,
  onClose,
}: DepositDrawerProps) {
  const router = useRouter();

  const [imageOpen, setImageOpen] =
    useState(false);

  const [mode, setMode] =
    useState<ActionMode>(null);

  const [adminNote, setAdminNote] =
    useState("");

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!deposit) {
      return;
    }

    setMode(null);
    setMessage(null);
    setAdminNote(
      deposit.admin_note ?? "",
    );
    setRejectionReason(
      deposit.rejection_reason ?? "",
    );

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        if (imageOpen) {
          setImageOpen(false);
          return;
        }

        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        "";

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    deposit,
    imageOpen,
    onClose,
  ]);

  if (!deposit) {
    return null;
  }

  const canReview =
    deposit.status === "pending";

  const canApprove = [
    "pending",
    "under_review",
    "needs_information",
    "frozen",
  ].includes(deposit.status);

  const canReject = ![
    "approved",
    "rejected",
    "cancelled",
  ].includes(deposit.status);

  async function handleReview() {
    setLoading(true);
    setMessage(null);

    const result =
      await markDepositUnderReview(
        deposit!.id,
      );

    setLoading(false);
    setMessage(result.message);

    if (result.success) {
      router.refresh();

      window.setTimeout(() => {
        onClose();
      }, 700);
    }
  }

  async function handleApprove() {
    setLoading(true);
    setMessage(null);

    const result = await approveDeposit(
      deposit!.id,
      adminNote,
    );

    setLoading(false);
    setMessage(result.message);

    if (result.success) {
      router.refresh();

      window.setTimeout(() => {
        onClose();
      }, 900);
    }
  }

  async function handleReject() {
    setLoading(true);
    setMessage(null);

    const result = await rejectDeposit(
      deposit!.id,
      rejectionReason,
      adminNote,
    );

    setLoading(false);
    setMessage(result.message);

    if (result.success) {
      router.refresh();

      window.setTimeout(() => {
        onClose();
      }, 900);
    }
  }

  async function copyText(
    text: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        text,
      );

      setMessage("تم النسخ.");
    } catch {
      setMessage("تعذر النسخ.");
    }
  }

  return (
    <>
      <div
        className={styles.overlay}
        onMouseDown={onClose}
      >
        <aside
          className={styles.drawer}
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          <header className={styles.header}>
            <div>
              <span>مراجعة الإيداع</span>
              <h2>
                {deposit.deposit_id}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </header>

          <div className={styles.scroll}>
            <section
              className={
                styles.proofSection
              }
            >
              <button
                className={
                  styles.proofThumbnail
                }
                type="button"
                disabled={
                  !deposit.proof_url
                }
                onClick={() =>
                  setImageOpen(true)
                }
              >
                {deposit.proof_url ? (
                  <img
                    src={
                      deposit.proof_url
                    }
                    alt="إثبات التحويل"
                  />
                ) : (
                  <ImageIcon
                    size={24}
                  />
                )}
              </button>

              <div>
                <strong>
                  إثبات التحويل
                </strong>

                <small>
                  الصورة مصغرة لتوفير
                  المساحة
                </small>
              </div>

              {deposit.proof_url && (
                <button
                  type="button"
                  onClick={() =>
                    setImageOpen(true)
                  }
                >
                  <ZoomIn size={15} />
                  تكبير
                </button>
              )}
            </section>

            <section
              className={
                styles.summaryGrid
              }
            >
              <article>
                <span>
                  المبلغ المطلوب
                </span>

                <strong>
                  {formatCurrency(
                    deposit.requested_amount,
                    deposit.requested_currency,
                  )}
                </strong>
              </article>

              <article>
                <span>
                  إجمالي التحويل
                </span>

                <strong>
                  {formatCurrency(
                    deposit.total_to_transfer,
                    deposit.requested_currency,
                  )}
                </strong>
              </article>

              <article>
                <span>
                  الرسوم
                </span>

                <strong>
                  {formatCurrency(
                    deposit.fee_amount,
                    deposit.requested_currency,
                  )}
                </strong>
              </article>

              <article>
                <span>
                  سيضاف للمحفظة
                </span>

                <strong>
                  $
                  {deposit.credit_usd.toFixed(
                    4,
                  )}
                </strong>
              </article>
            </section>

            <section
              className={styles.details}
            >
              <div>
                <span>
                  <UserRound size={15} />
                  العميل
                </span>

                <strong>
                  {deposit.customer_name ||
                    "عميل DevPlay"}
                </strong>

                <small>
                  {deposit.customer_id}
                </small>
              </div>

              <div>
                <span>
                  <Mail size={15} />
                  البريد
                </span>

                <strong>
                  {deposit.customer_email ||
                    "غير مضاف"}
                </strong>
              </div>

              <div>
                <span>
                  <WalletCards
                    size={15}
                  />
                  وسيلة الدفع
                </span>

                <strong>
                  {
                    deposit.payment_method_name
                  }

                  {deposit.payment_network
                    ? ` — ${deposit.payment_network}`
                    : ""}
                </strong>
              </div>

              <div>
                <span>
                  الحساب المحوّل منه
                </span>

                <strong>
                  {deposit.sender_account ||
                    "غير مضاف"}
                </strong>

                {deposit.sender_account && (
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        deposit.sender_account!,
                      )
                    }
                  >
                    <Copy size={14} />
                  </button>
                )}
              </div>

              <div>
                <span>
                  رقم العملية
                </span>

                <strong>
                  {deposit.transaction_reference ||
                    "غير مضاف"}
                </strong>

                {deposit.transaction_reference && (
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        deposit.transaction_reference!,
                      )
                    }
                  >
                    <Copy size={14} />
                  </button>
                )}
              </div>

              <div>
                <span>
                  سعر الدولار وقت الطلب
                </span>

                <strong>
                  {deposit.usd_to_egp_rate.toFixed(
                    2,
                  )}{" "}
                  ج.م
                </strong>
              </div>
            </section>

            {deposit.customer_note && (
              <section
                className={
                  styles.noteCard
                }
              >
                <strong>
                  ملاحظة العميل
                </strong>

                <p>
                  {deposit.customer_note}
                </p>
              </section>
            )}

            {deposit.rejection_reason && (
              <section
                className={
                  styles.rejectionCard
                }
              >
                <AlertTriangle
                  size={17}
                />

                <div>
                  <strong>
                    سبب الرفض
                  </strong>

                  <p>
                    {
                      deposit.rejection_reason
                    }
                  </p>
                </div>
              </section>
            )}

            {mode && (
              <section
                className={styles.actionForm}
              >
                {mode === "reject" && (
                  <label>
                    <span>
                      سبب الرفض
                    </span>

                    <textarea
                      value={
                        rejectionReason
                      }
                      onChange={(event) =>
                        setRejectionReason(
                          event.target
                            .value,
                        )
                      }
                      placeholder="مثال: صورة التحويل غير واضحة"
                    />
                  </label>
                )}

                <label>
                  <span>
                    ملاحظة داخلية
                  </span>

                  <textarea
                    value={adminNote}
                    onChange={(event) =>
                      setAdminNote(
                        event.target.value,
                      )
                    }
                    placeholder="اختياري"
                  />
                </label>

                <div
                  className={
                    styles.formActions
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setMode(null)
                    }
                    disabled={loading}
                  >
                    إلغاء
                  </button>

                  <button
                    className={
                      mode === "approve"
                        ? styles.confirmApprove
                        : styles.confirmReject
                    }
                    type="button"
                    disabled={loading}
                    onClick={
                      mode === "approve"
                        ? handleApprove
                        : handleReject
                    }
                  >
                    {loading ? (
                      <LoaderCircle
                        className={
                          styles.spinner
                        }
                        size={17}
                      />
                    ) : mode ===
                      "approve" ? (
                      <CheckCircle2
                        size={17}
                      />
                    ) : (
                      <XCircle
                        size={17}
                      />
                    )}

                    {mode === "approve"
                      ? "تأكيد الاعتماد"
                      : "تأكيد الرفض"}
                  </button>
                </div>
              </section>
            )}

            {message && (
              <p
                className={
                  styles.message
                }
              >
                {message}
              </p>
            )}
          </div>

          {!mode && (
            <footer className={styles.footer}>
              {canReview && (
                <button
                  className={
                    styles.reviewButton
                  }
                  type="button"
                  onClick={handleReview}
                  disabled={loading}
                >
                  <ClipboardCheck
                    size={17}
                  />
                  بدء المراجعة
                </button>
              )}

              {canReject && (
                <button
                  className={
                    styles.rejectButton
                  }
                  type="button"
                  onClick={() =>
                    setMode("reject")
                  }
                >
                  <XCircle size={17} />
                  رفض
                </button>
              )}

              {canApprove && (
                <button
                  className={
                    styles.approveButton
                  }
                  type="button"
                  onClick={() =>
                    setMode("approve")
                  }
                >
                  <CheckCircle2
                    size={17}
                  />
                  اعتماد
                </button>
              )}
            </footer>
          )}
        </aside>
      </div>

      {imageOpen &&
        deposit.proof_url && (
          <div
            className={
              styles.imageOverlay
            }
            onMouseDown={() =>
              setImageOpen(false)
            }
          >
            <button
              type="button"
              aria-label="إغلاق الصورة"
              onClick={() =>
                setImageOpen(false)
              }
            >
              <X size={20} />
            </button>

            <img
              src={deposit.proof_url}
              alt="إثبات التحويل بالحجم الكامل"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            />

            <a
              href={deposit.proof_url}
              target="_blank"
              rel="noreferrer"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <ExternalLink size={16} />
              فتح في تبويب جديد
            </a>
          </div>
        )}
    </>
  );
}