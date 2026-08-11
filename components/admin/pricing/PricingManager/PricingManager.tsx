"use client";

import {
  BadgeDollarSign,
  Calculator,
  CircleDollarSign,
  Coins,
  CreditCard,
  Info,
  LoaderCircle,
  PackageSearch,
  Percent,
  Save,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  updateAdminPricing,
} from "@/app/admin/pricing/actions";
import type {
  AdminPricingFormInput,
  AdminPricingSettings,
  ApiPricingMode,
} from "@/types/adminPricing";

import styles from "./PricingManager.module.css";

interface PricingManagerProps {
  initialSettings:
    AdminPricingSettings;
}

interface PricingFormState {
  usdToEgpRate: string;

  profitPerUsdEgp: string;
  minimumProfitEgp: string;

  apiPricingMode:
    ApiPricingMode;

  defaultProfitUsd: string;
  defaultMarkupPercentage: string;

  lowSupplierBalanceUsd: string;

  autoDisableOverBalance:
    boolean;

  pointsPerUsd: string;

  egpDepositFeePer1000:
    string;

  egpDepositMinimumFee:
    string;

  usdDepositFixedFee:
    string;
}

function settingsToForm(
  settings: AdminPricingSettings,
): PricingFormState {
  return {
    usdToEgpRate: String(
      settings.usdToEgpRate,
    ),

    profitPerUsdEgp: String(
      settings.profitPerUsdEgp,
    ),

    minimumProfitEgp: String(
      settings.minimumProfitEgp,
    ),

    apiPricingMode:
      settings.apiPricingMode,

    defaultProfitUsd: String(
      settings.defaultProfitUsd,
    ),

    defaultMarkupPercentage:
      String(
        settings.defaultMarkupPercentage,
      ),

    lowSupplierBalanceUsd:
      String(
        settings.lowSupplierBalanceUsd,
      ),

    autoDisableOverBalance:
      settings.autoDisableOverBalance,

    pointsPerUsd: String(
      settings.pointsPerUsd,
    ),

    egpDepositFeePer1000:
      String(
        settings.egpDepositFeePer1000,
      ),

    egpDepositMinimumFee:
      String(
        settings.egpDepositMinimumFee,
      ),

    usdDepositFixedFee:
      String(
        settings.usdDepositFixedFee,
      ),
  };
}

function formatUsd(
  value: number,
): string {
  return `$${Number(value).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    },
  )}`;
}

function formatEgp(
  value: number,
): string {
  return `${Number(value).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "لم يتم التحديث بعد";
  }

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function safeNumber(
  value: string,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

export function PricingManager({
  initialSettings,
}: PricingManagerProps) {
  const [
    pending,
    startTransition,
  ] = useTransition();

  const [settings, setSettings] =
    useState(initialSettings);

  const [form, setForm] =
    useState<PricingFormState>(
      settingsToForm(
        initialSettings,
      ),
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const [messageType, setMessageType] =
    useState<
      "success" | "error"
    >("success");

  const [
    previewSupplierPrice,
    setPreviewSupplierPrice,
  ] = useState("5");

  const usdRate =
    safeNumber(
      form.usdToEgpRate,
    );

  const fixedProfit =
    safeNumber(
      form.defaultProfitUsd,
    );

  const markupPercentage =
    safeNumber(
      form.defaultMarkupPercentage,
    );

  const supplierPrice =
    Math.max(
      0,
      safeNumber(
        previewSupplierPrice,
      ),
    );

  const previewProfit =
    useMemo(() => {
      if (
        form.apiPricingMode ===
        "fixed_usd"
      ) {
        return fixedProfit;
      }

      if (
        form.apiPricingMode ===
        "percentage"
      ) {
        return (
          supplierPrice *
          (
            markupPercentage /
            100
          )
        );
      }

      return 0;
    }, [
      form.apiPricingMode,
      fixedProfit,
      markupPercentage,
      supplierPrice,
    ]);

  const previewFinalPrice =
    supplierPrice +
    previewProfit;

  const previewFinalEgp =
    previewFinalPrice *
    usdRate;

  const previewPoints =
    Math.floor(
      previewFinalPrice *
      Math.max(
        0,
        safeNumber(
          form.pointsPerUsd,
        ),
      ),
    );

  const exampleEgpDeposit =
    1500;

  const depositFeePer1000 =
    safeNumber(
      form.egpDepositFeePer1000,
    );

  const minimumDepositFee =
    safeNumber(
      form.egpDepositMinimumFee,
    );

  const previewEgpFee =
    Math.max(
      minimumDepositFee,
      Math.ceil(
        exampleEgpDeposit /
          1000,
      ) *
        depositFeePer1000,
    );

  const exampleUsdDeposit = 5;

  const previewUsdTotal =
    exampleUsdDeposit +
    safeNumber(
      form.usdDepositFixedFee,
    );

  function updateForm<
    K extends keyof PricingFormState,
  >(
    key: K,
    value:
      PricingFormState[K],
  ): void {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );

    setMessage(null);
  }

  function buildPayload():
    AdminPricingFormInput {
    return {
      usdToEgpRate:
        safeNumber(
          form.usdToEgpRate,
        ),

      profitPerUsdEgp:
        safeNumber(
          form.profitPerUsdEgp,
        ),

      minimumProfitEgp:
        safeNumber(
          form.minimumProfitEgp,
        ),

      apiPricingMode:
        form.apiPricingMode,

      defaultProfitUsd:
        safeNumber(
          form.defaultProfitUsd,
        ),

      defaultMarkupPercentage:
        safeNumber(
          form.defaultMarkupPercentage,
        ),

      lowSupplierBalanceUsd:
        safeNumber(
          form.lowSupplierBalanceUsd,
        ),

      autoDisableOverBalance:
        form.autoDisableOverBalance,

      pointsPerUsd:
        Math.floor(
          safeNumber(
            form.pointsPerUsd,
          ),
        ),

      egpDepositFeePer1000:
        safeNumber(
          form.egpDepositFeePer1000,
        ),

      egpDepositMinimumFee:
        safeNumber(
          form.egpDepositMinimumFee,
        ),

      usdDepositFixedFee:
        safeNumber(
          form.usdDepositFixedFee,
        ),
    };
  }

  function handleSave(): void {
    if (pending) {
      return;
    }

    setMessage(null);

    startTransition(
      async () => {
        const result =
          await updateAdminPricing(
            buildPayload(),
          );

        setMessage(
          result.message,
        );

        setMessageType(
          result.success
            ? "success"
            : "error",
        );

        if (
          result.success &&
          result.settings
        ) {
          setSettings(
            result.settings,
          );

          setForm(
            settingsToForm(
              result.settings,
            ),
          );
        }
      },
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>
            PRICING ENGINE
          </span>

          <h1>
            إدارة التسعير
          </h1>

          <p>
            تحكمي في سعر الدولار،
            أرباح منتجات الـAPI، رسوم
            الإيداع والنقاط.
          </p>
        </div>

        <div
          className={
            styles.updatedCard
          }
        >
          <ShieldCheck size={17} />

          <span>
            <small>
              آخر تحديث
            </small>

            <strong>
              {formatDateTime(
                settings.pricingUpdatedAt,
              )}
            </strong>
          </span>
        </div>
      </header>

      <section className={styles.stats}>
        <article>
          <span>
            <CircleDollarSign
              size={19}
            />
          </span>

          <div>
            <small>
              سعر الدولار
            </small>

            <strong>
              {formatEgp(
                usdRate,
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <BadgeDollarSign
              size={19}
            />
          </span>

          <div>
            <small>
              الربح لكل دولار
            </small>

            <strong>
              {formatEgp(
                safeNumber(
                  form.profitPerUsdEgp,
                ),
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Coins size={19} />
          </span>

          <div>
            <small>
              نقاط كل دولار
            </small>

            <strong>
              {Math.floor(
                safeNumber(
                  form.pointsPerUsd,
                ),
              ).toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <WalletCards
              size={19}
            />
          </span>

          <div>
            <small>
              تنبيه رصيد المورد
            </small>

            <strong>
              {formatUsd(
                safeNumber(
                  form.lowSupplierBalanceUsd,
                ),
              )}
            </strong>
          </div>
        </article>
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.panel}>
            <header>
              <CircleDollarSign
                size={18}
              />

              <div>
                <strong>
                  سعر العملة والربح
                </strong>

                <small>
                  إعدادات الحساب المالي
                  الأساسية.
                </small>
              </div>
            </header>

            <div
              className={
                styles.twoColumns
              }
            >
              <label>
                <span>
                  سعر الدولار بالجنيه
                </span>

                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={
                    form.usdToEgpRate
                  }
                  onChange={(event) =>
                    updateForm(
                      "usdToEgpRate",
                      event.target.value,
                    )
                  }
                />

                <small>
                  يُستخدم لعرض الرصيد
                  والأسعار بالجنيه.
                </small>
              </label>

              <label>
                <span>
                  الربح لكل دولار بالجنيه
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.profitPerUsdEgp
                  }
                  onChange={(event) =>
                    updateForm(
                      "profitPerUsdEgp",
                      event.target.value,
                    )
                  }
                />

                <small>
                  تُضرب في تكلفة باقة المورد. مثال: تكلفة 3$ وربح 5 جنيه لكل دولار = 15 جنيه ربح.
                </small>
              </label>
            </div>

            <label>
              <span>
                أقل ربح مسموح بعد الخصم
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.minimumProfitEgp
                }
                onChange={(event) =>
                  updateForm(
                    "minimumProfitEgp",
                    event.target.value,
                  )
                }
              />

              <small>
                يمنع الكوبون لو هيخلي ربح
                الطلب أقل من القيمة دي.
              </small>
            </label>
          </section>

          <section className={styles.panel}>
            <header>
              <PackageSearch
                size={18}
              />

              <div>
                <strong>
                  تسعير منتجات الـAPI
                </strong>

                <small>
                  الطريقة الافتراضية عند
                  استيراد منتجات المورد.
                </small>
              </div>
            </header>

            <div
              className={
                styles.modeGrid
              }
            >
              <button
                type="button"
                className={
                  form.apiPricingMode ===
                  "fixed_usd"
                    ? styles.activeMode
                    : ""
                }
                onClick={() =>
                  updateForm(
                    "apiPricingMode",
                    "fixed_usd",
                  )
                }
              >
                <BadgeDollarSign
                  size={19}
                />

                <strong>
                  ربح لكل دولار مورد
                </strong>

                <small>
                  الربح بالجنيه = تكلفة الباقة بالدولار × المبلغ المحدد لكل دولار.
                </small>
              </button>

              <button
                type="button"
                className={
                  form.apiPricingMode ===
                  "percentage"
                    ? styles.activeMode
                    : ""
                }
                onClick={() =>
                  updateForm(
                    "apiPricingMode",
                    "percentage",
                  )
                }
              >
                <Percent size={19} />

                <strong>
                  نسبة مئوية
                </strong>

                <small>
                  إضافة نسبة من سعر
                  المورد.
                </small>
              </button>

              <button
                type="button"
                className={
                  form.apiPricingMode ===
                  "manual"
                    ? styles.activeMode
                    : ""
                }
                onClick={() =>
                  updateForm(
                    "apiPricingMode",
                    "manual",
                  )
                }
              >
                <Calculator
                  size={19}
                />

                <strong>
                  يدوي
                </strong>

                <small>
                  المنتجات لا تحصل على ربح
                  تلقائي.
                </small>
              </button>
            </div>

            <div
              className={
                styles.twoColumns
              }
            >
              <label>
                <span>
                  ربح ثابت قديم (احتياطي فقط)
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={
                    form.defaultProfitUsd
                  }
                  disabled={
                    form.apiPricingMode !==
                    "fixed_usd"
                  }
                  onChange={(event) =>
                    updateForm(
                      "defaultProfitUsd",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  نسبة الربح %
                </span>

                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  value={
                    form.defaultMarkupPercentage
                  }
                  disabled={
                    form.apiPricingMode !==
                    "percentage"
                  }
                  onChange={(event) =>
                    updateForm(
                      "defaultMarkupPercentage",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <header>
              <WalletCards size={18} />

              <div>
                <strong>
                  رصيد المورد والحماية
                </strong>

                <small>
                  إخفاء المنتجات التي لا
                  يمكن تنفيذها بسبب الرصيد.
                </small>
              </div>
            </header>

            <label>
              <span>
                حد تنبيه رصيد المورد
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.lowSupplierBalanceUsd
                }
                onChange={(event) =>
                  updateForm(
                    "lowSupplierBalanceUsd",
                    event.target.value,
                  )
                }
              />

              <small>
                يظهر تنبيه عندما يقل رصيد
                المورد عن القيمة دي.
              </small>
            </label>

            <label
              className={
                styles.switchRow
              }
            >
              <input
                type="checkbox"
                checked={
                  form.autoDisableOverBalance
                }
                onChange={(event) =>
                  updateForm(
                    "autoDisableOverBalance",
                    event.target.checked,
                  )
                }
              />

              <span>
                <strong>
                  تعطيل المنتجات الأعلى من
                  رصيد المورد
                </strong>

                <small>
                  لو رصيد المورد 20 دولار،
                  المنتج الأعلى من 20 يظهر
                  غير متوفر.
                </small>
              </span>
            </label>
          </section>

          <section className={styles.panel}>
            <header>
              <Coins size={18} />

              <div>
                <strong>
                  نظام النقاط
                </strong>

                <small>
                  النقاط التي يحصل عليها
                  العميل بعد اكتمال الطلب.
                </small>
              </div>
            </header>

            <label>
              <span>
                عدد النقاط لكل دولار
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  form.pointsPerUsd
                }
                onChange={(event) =>
                  updateForm(
                    "pointsPerUsd",
                    event.target.value,
                  )
                }
              />

              <small>
                القيمة الحالية تعني أن
                الدولار الواحد يمنح{" "}
                {Math.floor(
                  safeNumber(
                    form.pointsPerUsd,
                  ),
                ).toLocaleString(
                  "ar-EG",
                )}{" "}
                نقطة.
              </small>
            </label>
          </section>

          <section className={styles.panel}>
            <header>
              <CreditCard size={18} />

              <div>
                <strong>
                  رسوم إضافة الرصيد
                </strong>

                <small>
                  إعدادات رسوم التحويل
                  بالجنيه والدولار.
                </small>
              </div>
            </header>

            <div
              className={
                styles.twoColumns
              }
            >
              <label>
                <span>
                  رسوم كل 1000 جنيه
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.egpDepositFeePer1000
                  }
                  onChange={(event) =>
                    updateForm(
                      "egpDepositFeePer1000",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  أقل رسوم بالجنيه
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.egpDepositMinimumFee
                  }
                  onChange={(event) =>
                    updateForm(
                      "egpDepositMinimumFee",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <label>
              <span>
                رسوم الإيداع الثابتة
                بالدولار
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.usdDepositFixedFee
                }
                onChange={(event) =>
                  updateForm(
                    "usdDepositFixedFee",
                    event.target.value,
                  )
                }
              />
            </label>
          </section>
        </div>

        <aside
          className={
            styles.previewColumn
          }
        >
          <section
            className={
              styles.preview
            }
          >
            <header>
              <Sparkles size={19} />

              <div>
                <strong>
                  معاينة التسعير
                </strong>

                <small>
                  تجربة مباشرة قبل الحفظ
                </small>
              </div>
            </header>

            <label>
              <span>
                مثال لسعر المورد
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  previewSupplierPrice
                }
                onChange={(event) =>
                  setPreviewSupplierPrice(
                    event.target.value,
                  )
                }
              />
            </label>

            <div
              className={
                styles.calculation
              }
            >
              <div>
                <span>
                  سعر المورد
                </span>

                <strong>
                  {formatUsd(
                    supplierPrice,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  ربح DevPlay
                </span>

                <strong>
                  +{" "}
                  {formatUsd(
                    previewProfit,
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.finalPrice
                }
              >
                <span>
                  سعر البيع
                </span>

                <strong>
                  {formatUsd(
                    previewFinalPrice,
                  )}
                </strong>

                <small>
                  ≈{" "}
                  {formatEgp(
                    previewFinalEgp,
                  )}
                </small>
              </div>
            </div>

            <div
              className={
                styles.pointsPreview
              }
            >
              <Coins size={17} />

              <span>
                <small>
                  نقاط العميل المتوقعة
                </small>

                <strong>
                  +{" "}
                  {previewPoints.toLocaleString(
                    "ar-EG",
                  )}{" "}
                  نقطة
                </strong>
              </span>
            </div>
          </section>

          <section
            className={
              styles.feePreview
            }
          >
            <header>
              <Calculator size={18} />

              <strong>
                أمثلة الرسوم
              </strong>
            </header>

            <div>
              <span>
                تحويل{" "}
                {exampleEgpDeposit.toLocaleString(
                  "ar-EG",
                )}{" "}
                جنيه
              </span>

              <strong>
                الرسوم{" "}
                {formatEgp(
                  previewEgpFee,
                )}
              </strong>
            </div>

            <div>
              <span>
                إضافة{" "}
                {formatUsd(
                  exampleUsdDeposit,
                )}
              </span>

              <strong>
                التحويل المطلوب{" "}
                {formatUsd(
                  previewUsdTotal,
                )}
              </strong>
            </div>
          </section>

          <section
            className={
              styles.infoCard
            }
          >
            <Info size={18} />

            <p>
              التغييرات الجديدة ستُستخدم
              في المزامنات القادمة. المنتجات
              اليدوية الحالية لن يتغير
              ربحها تلقائيًا إلا عند تنفيذ
              تحديث جماعي لاحقًا.
            </p>
          </section>

          {message && (
            <p
              className={`${styles.message} ${
                messageType === "success"
                  ? styles.success
                  : styles.error
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          <button
            className={
              styles.saveButton
            }
            type="button"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? (
              <>
                <LoaderCircle
                  className={
                    styles.spinner
                  }
                  size={18}
                />

                جاري الحفظ
              </>
            ) : (
              <>
                <Save size={18} />
                حفظ إعدادات التسعير
              </>
            )}
          </button>
        </aside>
      </section>
    </section>
  );
}
