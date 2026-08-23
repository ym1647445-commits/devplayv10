"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileImage,
  LoaderCircle,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  showVisualAssistant,
  trackAssistantRequest,
} from "@/components/assistant/visualAssistantEvents";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type {
  CreatedDepositRequest,
  DepositPaymentMethod,
} from "@/types/deposit";

import styles from "./DepositForm.module.css";

interface DepositFormProps {
  paymentMethods: DepositPaymentMethod[];
  usdRate: number;
  egpFeePer1000: number;
  egpMinimumFee: number;
  usdFixedFee: number;
}

interface FormMessage {
  type: "success" | "error" | "warning";
  text: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatEgp(value: number): string {
  return `${value.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ج.م`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function calculateDeposit(
  method: DepositPaymentMethod | undefined,
  amount: number,
  usdRate: number,
  egpFeePer1000: number,
  egpMinimumFee: number,
  usdFixedFee: number,
) {
  if (!method || !Number.isFinite(amount) || amount <= 0) {
    return {
      fee: 0,
      total: 0,
      creditUsd: 0,
      equivalentEgp: 0,
    };
  }

  if (method.currency === "EGP") {
    const fee = Math.max(egpMinimumFee, Math.ceil(amount / 1000) * egpFeePer1000);
    const netEgp = Math.max(0, amount - fee);

    return {
      fee,
      total: amount,
      creditUsd: netEgp / usdRate,
      equivalentEgp: netEgp,
    };
  }

  const fee = Math.min(amount, Math.max(0, usdFixedFee));

  return {
    fee,
    total: amount,
    creditUsd: Math.max(0, amount - fee),
    equivalentEgp: Math.max(0, amount - fee) * usdRate,
  };
}

export function DepositForm({
  paymentMethods,
  usdRate,
  egpFeePer1000,
  egpMinimumFee,
  usdFixedFee,
}: DepositFormProps) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const { user } = useAuth();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [selectedMethodId, setSelectedMethodId] =
    useState(paymentMethods[0]?.id ?? "");

  const [amountText, setAmountText] =
    useState("");

  const [senderAccount, setSenderAccount] =
    useState("");

  const [
    transactionReference,
    setTransactionReference,
  ] = useState("");

  const [customerNote, setCustomerNote] =
    useState("");

  const [proofFile, setProofFile] =
    useState<File | null>(null);

  const [proofPreview, setProofPreview] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<FormMessage | null>(null);

  const [
    createdRequest,
    setCreatedRequest,
  ] = useState<CreatedDepositRequest | null>(
    null,
  );

  const selectedMethod =
    paymentMethods.find(
      (method) =>
        method.id === selectedMethodId,
    );

  const amount = Number(amountText);

  const calculation = calculateDeposit(
    selectedMethod,
    amount,
    usdRate,
    egpFeePer1000,
    egpMinimumFee,
    usdFixedFee,
  );

  const egyptianMethods =
    paymentMethods.filter(
      (method) =>
        method.type === "egyptian_wallet",
    );

  const cryptoMethods =
    paymentMethods.filter(
      (method) => method.type === "crypto",
    );

  function selectMethod(
    methodId: string,
  ): void {
    setSelectedMethodId(methodId);
    setAmountText("");
    setSenderAccount("");
    setTransactionReference("");
    setMessage(null);
  }

  async function copyAddress(): Promise<void> {
    if (!selectedMethod) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selectedMethod.address,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setMessage({
        type: "error",
        text: "تعذر نسخ بيانات التحويل.",
      });
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setMessage({
        type: "error",
        text:
          "صيغة الصورة غير مدعومة. استخدمي JPG أو PNG أو WEBP.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage({
        type: "error",
        text:
          "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.",
      });
      return;
    }

    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }

    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setMessage(null);
  }

  function validateForm(): string | null {
    if (!user) {
      return "يجب تسجيل الدخول أولًا.";
    }

    if (!selectedMethod) {
      return "اختاري وسيلة الدفع.";
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return "اكتبي مبلغًا صحيحًا.";
    }

    if (
      amount <
      Number(selectedMethod.minimum_amount)
    ) {
      const currency =
        selectedMethod.currency === "EGP"
          ? "ج.م"
          : "USDT";

      return `الحد الأدنى هو ${selectedMethod.minimum_amount} ${currency}.`;
    }

    if (
      selectedMethod.type ===
        "egyptian_wallet" &&
      !/^01[0125][0-9]{8}$/.test(
        senderAccount.trim(),
      )
    ) {
      return "اكتبي رقم المحفظة المحوّل منها بشكل صحيح.";
    }

    if (!proofFile) {
      return "ارفعي صورة إثبات التحويل.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    if (
      !user ||
      !selectedMethod ||
      !proofFile
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    let uploadedPath: string | null = null;

    try {
      const extension =
        proofFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      uploadedPath =
        `${user.id}/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("deposit-proofs")
        .upload(
          uploadedPath,
          proofFile,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: proofFile.type,
          },
        );

      if (uploadError) {
        throw new Error(
          `تعذر رفع إثبات التحويل: ${uploadError.message}`,
        );
      }

      const {
        data,
        error: requestError,
      } = await supabase.rpc(
        "create_deposit_request_v2",
        {
          p_payment_method_id:
            selectedMethod.id,

          p_requested_amount: amount,

          p_sender_account:selectedMethod.type==="crypto"?null:senderAccount.trim(),

          p_transaction_reference:
            transactionReference.trim(),

          p_proof_path: uploadedPath,

          p_customer_note:
            customerNote.trim() || null,
        },
      );

      if (requestError) {
        await supabase.storage
          .from("deposit-proofs")
          .remove([uploadedPath]);

        const isCooldown =
          requestError.message
            .toLowerCase()
            .includes("30 minutes");

        setMessage({
          type: isCooldown
            ? "warning"
            : "error",

          text: isCooldown
            ? "لا يمكن إرسال طلب جديد الآن. انتظري 30 دقيقة من آخر طلب إضافة رصيد."
            : requestError.message,
        });

        return;
      }

      const result = Array.isArray(data)
        ? data[0]
        : data;

      const createdDeposit = result as CreatedDepositRequest;
      setCreatedRequest(createdDeposit);
      trackAssistantRequest({
        type: "deposit",
        id: createdDeposit.id,
        displayId: createdDeposit.deposit_id,
        status: createdDeposit.status,
      });
      showVisualAssistant({
        mood: "sit",
        text: `طلب إضافة الرصيد ${createdDeposit.deposit_id} اتبعت بنجاح. خلّينا نستنى الموافقة عليه سوا 💜`,
        action: { label: "متابعة الطلب", href: "/orders" },
        duration: 12000,
        priority: 6,
      });

      setMessage({
        type: "success",
        text:
          "تم إنشاء طلب إضافة الرصيد بنجاح.",
      });
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from("deposit-proofs")
          .remove([uploadedPath]);
      }

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إرسال الطلب.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (createdRequest) {
    return (
      <section className={styles.successCard}>
        <span className={styles.successIcon}>
          <CheckCircle2 size={34} />
        </span>

        <span className={styles.successEyebrow}>
          تم استلام طلبك
        </span>

        <h1>طلب إضافة الرصيد قيد المراجعة</h1>

        <p>
          سيتم مراجعة التحويل، وبعد الموافقة
          سيُضاف الرصيد إلى محفظتك تلقائيًا.
        </p>

        <div className={styles.requestNumber}>
          <span>رقم الطلب</span>
          <strong>
            {createdRequest.deposit_id}
          </strong>
        </div>

        <div className={styles.successSummary}>
          <div>
            <span>المبلغ المطلوب إضافته</span>

            <strong>
              {createdRequest.requested_currency ===
              "EGP"
                ? formatEgp(
                    Number(
                      createdRequest.requested_amount,
                    ),
                  )
                : formatUsd(
                    Number(
                      createdRequest.requested_amount,
                    ),
                  )}
            </strong>
          </div>

          <div>
            <span>الرصيد المتوقع</span>

            <strong>
              {formatUsd(
                Number(
                  createdRequest.credit_usd,
                ),
              )}
            </strong>
          </div>

          <div>
            <span>الحالة</span>
            <strong>بانتظار المراجعة</strong>
          </div>
        </div>

        <div className={styles.successActions}>
          <Link href="/orders">
            متابعة الطلب
          </Link>

          <Link href="/wallet">
            الرجوع للمحفظة
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>1</span>

          <div>
            <strong>اختاري وسيلة الدفع</strong>
            <small>
              تأكدي من اختيار الشبكة الصحيحة.
            </small>
          </div>
        </div>

        <div className={styles.methodGroup}>
          <strong>المحافظ المصرية</strong>

          <div className={styles.methodsGrid}>
            {egyptianMethods.map((method) => (
              <button
                type="button"
                key={method.id}
                className={
                  selectedMethodId === method.id
                    ? styles.methodActive
                    : ""
                }
                onClick={() =>
                  selectMethod(method.id)
                }
              >
                <WalletCards size={19} />

                <span>
                  <strong>{method.name}</strong>
                  <small>تحويل بالجنيه</small>
                </span>

                {selectedMethodId ===
                  method.id && (
                  <Check size={17} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.methodGroup}>
          <strong>USDT</strong>

          <div className={styles.methodsGrid}>
            {cryptoMethods.map((method) => (
              <button
                type="button"
                key={method.id}
                className={
                  selectedMethodId === method.id
                    ? styles.methodActive
                    : ""
                }
                onClick={() =>
                  selectMethod(method.id)
                }
              >
                <WalletCards size={19} />

                <span>
                  <strong>
                    {method.network}
                  </strong>

                  <small>USDT</small>
                </span>

                {selectedMethodId ===
                  method.id && (
                  <Check size={17} />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedMethod && (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>2</span>

              <div>
                <strong>
                  بيانات التحويل
                </strong>

                <small>
                  حوّلي المبلغ إلى البيانات
                  التالية.
                </small>
              </div>
            </div>

            <div className={styles.addressCard}>
              <div>
                <span>
                  {selectedMethod.type ===
                  "crypto"
                    ? `USDT — ${selectedMethod.network}`
                    : selectedMethod.name}
                </span>

                <strong>
                  {selectedMethod.address}
                </strong>
              </div>

              <button
                type="button"
                onClick={copyAddress}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    نسخ
                  </>
                )}
              </button>
            </div>

            {selectedMethod.type ===
              "crypto" && (
              <div className={styles.networkWarning}>
                <AlertTriangle size={18} />

                <p>
                  أرسلي USDT على شبكة{" "}
                  <strong>
                    {selectedMethod.network}
                  </strong>{" "}
                  فقط. استخدام شبكة مختلفة قد
                  يؤدي إلى ضياع التحويل.
                </p>
              </div>
            )}

            {selectedMethod.instructions && (
              <p className={styles.instructions}>
                {selectedMethod.instructions}
              </p>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>3</span>

              <div>
                <strong>
                  المبلغ والتفاصيل
                </strong>

                <small>
                  سيتم حساب الرسوم تلقائيًا.
                </small>
              </div>
            </div>

            <label className={styles.field}>
              <span>
                المبلغ الذي ستحوّليه
              </span>

              <div>
                <input
                  type="number"
                  min={
                    selectedMethod.minimum_amount
                  }
                  step={
                    selectedMethod.currency ===
                    "EGP"
                      ? "1"
                      : "0.01"
                  }
                  inputMode="decimal"
                  value={amountText}
                  onChange={(event) =>
                    setAmountText(
                      event.target.value,
                    )
                  }
                  placeholder={
                    selectedMethod.currency ===
                    "EGP"
                      ? "مثال: 100"
                      : "مثال: 5"
                  }
                />

                <strong>
                  {selectedMethod.currency ===
                  "EGP"
                    ? "ج.م"
                    : "USDT"}
                </strong>
              </div>
            </label>

            {amount > 0 && (
              <div className={styles.calculator}>
                <div>
                  <span>
                    المبلغ الذي ستحوّليه
                  </span>

                  <strong>
                    {selectedMethod.currency ===
                    "EGP"
                      ? formatEgp(amount)
                      : formatUsd(amount)}
                  </strong>
                </div>

                <div>
                  <span>الرسوم</span>

                  <strong>
                    {selectedMethod.currency ===
                    "EGP"
                      ? formatEgp(
                          calculation.fee,
                        )
                      : `${calculation.fee.toFixed(
                          2,
                        )} USDT`}
                  </strong>
                </div>

                <div className={styles.totalRow}>
                  <span>
                    المبلغ المسجل للتحويل
                  </span>

                  <strong>
                    {selectedMethod.currency ===
                    "EGP"
                      ? formatEgp(
                          calculation.total,
                        )
                      : `${calculation.total.toFixed(
                          2,
                        )} USDT`}
                  </strong>
                </div>

                <div>
                  <span>
                    سيضاف إلى المحفظة
                  </span>

                  <strong>
                    {formatUsd(
                      calculation.creditUsd,
                    )}
                  </strong>
                </div>

                <small>
                  يعادل تقريبًا{" "}
                  {formatEgp(
                    calculation.equivalentEgp,
                  )}
                </small>
              </div>
            )}

            {selectedMethod.type==="egyptian_wallet"&&<label className={styles.field}>
              <span>
                {selectedMethod.type ===
                "egyptian_wallet"
                  ? "رقم المحفظة المحوّل منها"
                  : "عنوان المحفظة المحوّل منها"}
              </span>

              <div>
                <input
                  type={
                    selectedMethod.type ===
                    "egyptian_wallet"
                      ? "tel"
                      : "text"
                  }
                  value={senderAccount}
                  inputMode={
                    selectedMethod.type ===
                    "egyptian_wallet"
                      ? "numeric"
                      : undefined
                  }
                  onChange={(event) => {
                    const value =
                      selectedMethod.type ===
                      "egyptian_wallet"
                        ? event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 11)
                        : event.target.value;

                    setSenderAccount(value);
                  }}
                  placeholder={
                    selectedMethod.type ===
                    "egyptian_wallet"
                      ? "01012345678"
                      : "عنوان المحفظة"
                  }
                />
              </div>
            </label>}

            <label className={styles.field}>
              <span>
                رقم العملية أو Transaction Hash
                <small>اختياري</small>
              </span>

              <div>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(event) =>
                    setTransactionReference(
                      event.target.value,
                    )
                  }
                  placeholder="اكتب رقم العملية إن وجد"
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>
                ملاحظة
                <small>اختياري</small>
              </span>

              <textarea
                value={customerNote}
                onChange={(event) =>
                  setCustomerNote(
                    event.target.value.slice(
                      0,
                      300,
                    ),
                  )
                }
                placeholder="أي ملاحظة تساعد في مراجعة التحويل"
              />
            </label>
          </section>

          <div className={styles.nonRefundable}><AlertTriangle size={18}/><p><strong>تنبيه مهم قبل التحويل</strong> الأموال التي تُضاف إلى محفظة DevPlay غير قابلة للاسترجاع أو السحب النقدي، وتُستخدم فقط لشحن الألعاب والخدمات داخل الموقع. قيمة الرصيد المعروضة تقريبية حتى اعتماد التحويل.</p></div>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>4</span>

              <div>
                <strong>
                  إثبات التحويل
                </strong>

                <small>
                  JPG أو PNG أو WEBP بحد أقصى
                  5MB.
                </small>
              </div>
            </div>

            <input
              ref={fileInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />

            <button
              className={styles.uploadArea}
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              {proofPreview ? (
                <>
                  <img
                    src={proofPreview}
                    alt="معاينة إثبات التحويل"
                  />

                  <span>
                    <FileImage size={18} />
                    تغيير الصورة
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud size={29} />

                  <strong>
                    اختيار صورة التحويل
                  </strong>

                  <small>
                    اضغطي هنا لرفع الصورة
                  </small>
                </>
              )}
            </button>
          </section>

          {message && (
            <div
              className={`${styles.message} ${
                styles[message.type]
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <Button
            fullWidth
            size="large"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle
                  className={styles.spinner}
                  size={18}
                />
                جاري إرسال الطلب
              </>
            ) : (
              "إرسال طلب إضافة الرصيد"
            )}
          </Button>

          <Link
            className={styles.backLink}
            href="/wallet"
          >
            <ArrowRight size={16} />
            الرجوع إلى المحفظة
          </Link>
        </>
      )}
    </form>
  );
}
