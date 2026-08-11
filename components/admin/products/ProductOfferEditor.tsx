"use client";

import {
  CheckCircle2,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  deleteProductOffer,
  updateProductOffer,
} from "@/app/admin/products/[id]/offer-actions";

import type {
  ProductInputType,
  ProductRequiredField,
} from "@/types/product";

interface ProductOfferEditorProps {
  productId: string;

  offer: {
    id: string;

    nameAr: string;
    nameEn: string | null;

    supplierPriceUsd: number;
    profitUsd: number;

    oldPriceUsd:
      | number
      | null;

    active: boolean;

    sortOrder: number;

    instructionsAr:
      | string
      | null;

    customerNoteAr:
      | string
      | null;

    requiredFields:
      ProductRequiredField[];
  };
}

function createField():
  ProductRequiredField {
  return {
    id: `field_${Date.now()}`,

    label: "",

    placeholder: "",

    type: "text",

    required: true,
  };
}

function formatUsd(
  value: number,
): string {
  return `$${Number(
    value,
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    },
  )}`;
}

export function ProductOfferEditor({
  productId,
  offer,
}: ProductOfferEditorProps) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [
    nameAr,
    setNameAr,
  ] = useState(
    offer.nameAr,
  );

  const [
    nameEn,
    setNameEn,
  ] = useState(
    offer.nameEn ??
      "",
  );

  const [
    profitUsd,
    setProfitUsd,
  ] = useState(
    String(
      offer.profitUsd,
    ),
  );

  const [
    oldPriceUsd,
    setOldPriceUsd,
  ] = useState(
    offer.oldPriceUsd ===
      null
      ? ""
      : String(
          offer.oldPriceUsd,
        ),
  );

  const [
    active,
    setActive,
  ] = useState(
    offer.active,
  );

  const [
    sortOrder,
    setSortOrder,
  ] = useState(
    String(
      offer.sortOrder,
    ),
  );

  const [
    instructionsAr,
    setInstructionsAr,
  ] = useState(
    offer.instructionsAr ??
      "",
  );

  const [
    customerNoteAr,
    setCustomerNoteAr,
  ] = useState(
    offer.customerNoteAr ??
      "",
  );

  const [
    requiredFields,
    setRequiredFields,
  ] = useState<
    ProductRequiredField[]
  >(
    offer.requiredFields.map(
      (field) => ({
        ...field,
      }),
    ),
  );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    success,
    setSuccess,
  ] = useState(false);

  const finalPrice =
    offer.supplierPriceUsd +
    (
      Number(
        profitUsd,
      ) || 0
    );

  function addField() {
    setRequiredFields(
      (current) => [
        ...current,
        createField(),
      ],
    );
  }

  function removeField(
    index: number,
  ) {
    setRequiredFields(
      (current) =>
        current.filter(
          (
            _,
            fieldIndex,
          ) =>
            fieldIndex !==
            index,
        ),
    );
  }

  function updateField(
    index: number,
    key:
      keyof ProductRequiredField,
    value:
      | string
      | boolean,
  ) {
    setRequiredFields(
      (current) =>
        current.map(
          (
            field,
            fieldIndex,
          ) =>
            fieldIndex ===
            index
              ? {
                  ...field,
                  [key]:
                    value,
                }
              : field,
        ),
    );
  }

  function handleSave() {
    if (pending) {
      return;
    }

    setMessage(null);
    setSuccess(false);

    startTransition(
      async () => {
        const result =
          await updateProductOffer({
            offerId:
              offer.id,

            productId,

            nameAr,

            nameEn,

            profitUsd:
              Number(
                profitUsd,
              ),

            oldPriceUsd:
              oldPriceUsd.trim()
                ? Number(
                    oldPriceUsd,
                  )
                : null,

            active,

            sortOrder:
              Number(
                sortOrder,
              ),

            instructionsAr,

            customerNoteAr,

            requiredFields,
          });

        setMessage(
          result.message,
        );

        setSuccess(
          result.success,
        );

        if (
          result.success
        ) {
          router.refresh();
        }
      },
    );
  }

  function handleDelete(){if(pending||!window.confirm(`حذف باقة ${offer.nameAr}؟ إذا كانت مرتبطة بطلب قديم سيتم إخفاؤها بدل حذف سجلها.`))return;setMessage(null);setSuccess(false);startTransition(async()=>{const result=await deleteProductOffer({productId,offerId:offer.id});setMessage(result.message);setSuccess(result.success);if(result.success){setOpen(false);router.refresh()}})}

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        style={{
          minHeight: 37,

          border:
            "1px solid var(--primary-border)",

          borderRadius: 9,

          background:
            "var(--primary-soft)",

          color:
            "var(--primary)",

          fontSize: 7,

          fontWeight: 900,

          cursor:
            "pointer",
        }}
      >
        تعديل الباقة
      </button>

      {open && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            zIndex: 1000,

            display:
              "grid",

            gridTemplateColumns:
              "1fr min(520px, 94vw)",

            background:
              "rgba(0,0,0,.48)",
          }}
        >
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() =>
              !pending &&
              setOpen(false)
            }
            style={{
              border: 0,

              background:
                "transparent",
            }}
          />

          <aside
            style={{
              display:
                "grid",

              gridTemplateRows:
                "auto minmax(0, 1fr)",

              minHeight:
                "100dvh",

              background:
                "var(--background)",

              borderRight:
                "1px solid var(--border)",

              boxShadow:
                "0 0 45px rgba(0,0,0,.22)",
            }}
          >
            <header
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap: 10,

                padding: 14,

                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display:
                    "grid",

                  gap: 4,
                }}
              >
                <span
                  style={{
                    color:
                      "var(--primary)",

                    fontSize: 6,

                    fontWeight:
                      900,
                  }}
                >
                  OFFER EDITOR
                </span>

                <strong
                  style={{
                    fontSize: 13,
                  }}
                >
                  تعديل الباقة
                </strong>
              </div>

              <button
                type="button"
                disabled={
                  pending
                }
                onClick={() =>
                  setOpen(false)
                }
                style={{
                  display:
                    "grid",

                  width: 38,
                  height: 38,

                  placeItems:
                    "center",

                  border:
                    "1px solid var(--border)",

                  borderRadius: 10,

                  background:
                    "var(--surface)",

                  color:
                    "var(--text)",
                }}
              >
                <X
                  size={18}
                />
              </button>
            </header>

            <div
              style={{
                display:
                  "grid",

                alignContent:
                  "start",

                gap: 12,

                overflowY:
                  "auto",

                padding: 14,
              }}
            >
              <section
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",

                  gap: 7,
                }}
              >
                <div
                  style={{
                    display:
                      "grid",

                    gap: 4,

                    padding: 10,

                    border:
                      "1px solid var(--border)",

                    borderRadius: 10,

                    background:
                      "var(--surface)",
                  }}
                >
                  <small
                    style={{
                      color:
                        "var(--muted)",

                      fontSize: 6,
                    }}
                  >
                    سعر المورد
                  </small>

                  <strong>
                    {formatUsd(
                      offer.supplierPriceUsd,
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gap: 4,

                    padding: 10,

                    border:
                      "1px solid var(--border)",

                    borderRadius: 10,

                    background:
                      "var(--surface)",
                  }}
                >
                  <small
                    style={{
                      color:
                        "var(--muted)",

                      fontSize: 6,
                    }}
                  >
                    الربح
                  </small>

                  <strong>
                    {formatUsd(
                      Number(
                        profitUsd,
                      ) || 0,
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gap: 4,

                    padding: 10,

                    border:
                      "1px solid var(--primary-border)",

                    borderRadius: 10,

                    background:
                      "var(--primary-soft)",
                  }}
                >
                  <small
                    style={{
                      color:
                        "var(--muted)",

                      fontSize: 6,
                    }}
                  >
                    سعر البيع
                  </small>

                  <strong
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  >
                    {formatUsd(
                      finalPrice,
                    )}
                  </strong>
                </div>
              </section>

              <section
                style={{
                  display:
                    "grid",

                  gap: 9,

                  padding: 12,

                  border:
                    "1px solid var(--border)",

                  borderRadius: 13,

                  background:
                    "var(--surface)",
                }}
              >
                <strong
                  style={{
                    fontSize: 10,
                  }}
                >
                  البيانات الأساسية
                </strong>

                <label
                  style={{
                    display:
                      "grid",

                    gap: 5,

                    fontSize: 7,
                  }}
                >
                  <span>
                    اسم الباقة بالعربي
                  </span>

                  <input
                    value={
                      nameAr
                    }
                    onChange={(
                      event,
                    ) =>
                      setNameAr(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label
                  style={{
                    display:
                      "grid",

                    gap: 5,

                    fontSize: 7,
                  }}
                >
                  <span>
                    الاسم بالإنجليزي
                  </span>

                  <input
                    value={
                      nameEn
                    }
                    onChange={(
                      event,
                    ) =>
                      setNameEn(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",

                    gap: 8,
                  }}
                >
                  <label
                    style={{
                      display:
                        "grid",

                      gap: 5,

                      fontSize: 7,
                    }}
                  >
                    <span>
                      الربح $
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={
                        profitUsd
                      }
                      onChange={(
                        event,
                      ) =>
                        setProfitUsd(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label
                    style={{
                      display:
                        "grid",

                      gap: 5,

                      fontSize: 7,
                    }}
                  >
                    <span>
                      السعر القديم $
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={
                        oldPriceUsd
                      }
                      onChange={(
                        event,
                      ) =>
                        setOldPriceUsd(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </label>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",

                    gap: 8,
                  }}
                >
                  <label
                    style={{
                      display:
                        "grid",

                      gap: 5,

                      fontSize: 7,
                    }}
                  >
                    <span>
                      الترتيب
                    </span>

                    <input
                      type="number"
                      value={
                        sortOrder
                      }
                      onChange={(
                        event,
                      ) =>
                        setSortOrder(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      gap: 7,

                      paddingInline:
                        10,

                      border:
                        "1px solid var(--border)",

                      borderRadius: 9,

                      background:
                        "var(--surface-soft)",

                      fontSize: 7,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        active
                      }
                      onChange={(
                        event,
                      ) =>
                        setActive(
                          event
                            .target
                            .checked,
                        )
                      }
                    />

                    الباقة نشطة
                  </label>
                </div>
              </section>

              <section
                style={{
                  display:
                    "grid",

                  gap: 9,

                  padding: 12,

                  border:
                    "1px solid var(--border)",

                  borderRadius: 13,

                  background:
                    "var(--surface)",
                }}
              >
                <strong
                  style={{
                    fontSize: 10,
                  }}
                >
                  الشروط والتعليمات
                </strong>

                <label
                  style={{
                    display:
                      "grid",

                    gap: 5,

                    fontSize: 7,
                  }}
                >
                  <span>
                    تعليمات الباقة
                  </span>

                  <textarea
                    rows={4}
                    value={
                      instructionsAr
                    }
                    onChange={(
                      event,
                    ) =>
                      setInstructionsAr(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="مثال: تأكدي من كتابة Player ID و Zone ID بشكل صحيح..."
                  />
                </label>

                <label
                  style={{
                    display:
                      "grid",

                    gap: 5,

                    fontSize: 7,
                  }}
                >
                  <span>
                    تحذير مهم يظهر للعميل باللون الأحمر
                  </span>

                  <textarea
                    rows={3}
                    value={
                      customerNoteAr
                    }
                    onChange={(
                      event,
                    ) =>
                      setCustomerNoteAr(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="مثال: هذه الباقة تعمل في دولة محددة فقط، أو تابعي بريدك بعد إتمام الطلب لاستلام كود التفعيل."
                  />
                </label>
              </section>

              <section
                style={{
                  display:
                    "grid",

                  gap: 10,

                  padding: 12,

                  border:
                    "1px solid var(--border)",

                  borderRadius: 13,

                  background:
                    "var(--surface)",
                }}
              >
                <header
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display:
                        "grid",

                      gap: 4,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 10,
                      }}
                    >
                      البيانات المطلوبة من العميل
                    </strong>

                    <small
                      style={{
                        color:
                          "var(--muted)",

                        fontSize: 6,
                      }}
                    >
                      مثل Player ID أو Zone ID أو البريد.
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addField
                    }
                    style={{
                      display:
                        "inline-flex",

                      minHeight: 34,

                      alignItems:
                        "center",

                      gap: 5,

                      paddingInline:
                        9,

                      border:
                        "1px solid var(--primary-border)",

                      borderRadius: 9,

                      background:
                        "var(--primary-soft)",

                      color:
                        "var(--primary)",

                      fontSize: 7,

                      fontWeight: 900,
                    }}
                  >
                    <Plus
                      size={14}
                    />

                    إضافة حقل
                  </button>
                </header>

                {requiredFields.length ===
                0 ? (
                  <div
                    style={{
                      padding: 14,

                      border:
                        "1px dashed var(--border)",

                      borderRadius: 10,

                      color:
                        "var(--muted)",

                      fontSize: 7,

                      textAlign:
                        "center",
                    }}
                  >
                    لا توجد بيانات مطلوبة لهذه الباقة.
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",

                      gap: 9,
                    }}
                  >
                    {requiredFields.map(
                      (
                        field,
                        index,
                      ) => (
                        <article
                          key={`${field.id}-${index}`}
                          style={{
                            display:
                              "grid",

                            gap: 8,

                            padding: 10,

                            border:
                              "1px solid var(--border)",

                            borderRadius: 10,

                            background:
                              "var(--surface-soft)",
                          }}
                        >
                          <header
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                "space-between",

                              gap: 8,
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 8,
                              }}
                            >
                              حقل {index + 1}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                removeField(
                                  index,
                                )
                              }
                              style={{
                                display:
                                  "grid",

                                width: 30,
                                height: 30,

                                placeItems:
                                  "center",

                                border:
                                  "1px solid var(--danger)",

                                borderRadius: 8,

                                background:
                                  "transparent",

                                color:
                                  "var(--danger)",
                              }}
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </header>

                          <div
                            style={{
                              display:
                                "grid",

                              gridTemplateColumns:
                                "repeat(2, minmax(0, 1fr))",

                              gap: 7,
                            }}
                          >
                            <label
                              style={{
                                display:
                                  "grid",

                                gap: 4,

                                fontSize: 6,
                              }}
                            >
                              <span>
                                Field ID
                              </span>

                              <input
                                value={
                                  field.id
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateField(
                                    index,
                                    "id",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="player_id"
                              />
                            </label>

                            <label
                              style={{
                                display:
                                  "grid",

                                gap: 4,

                                fontSize: 6,
                              }}
                            >
                              <span>
                                اسم الحقل
                              </span>

                              <input
                                value={
                                  field.label
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateField(
                                    index,
                                    "label",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Player ID"
                              />
                            </label>
                          </div>

                          <div
                            style={{
                              display:
                                "grid",

                              gridTemplateColumns:
                                "repeat(2, minmax(0, 1fr))",

                              gap: 7,
                            }}
                          >
                            <label
                              style={{
                                display:
                                  "grid",

                                gap: 4,

                                fontSize: 6,
                              }}
                            >
                              <span>
                                النوع
                              </span>

                              <select
                                value={
                                  field.type
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateField(
                                    index,
                                    "type",
                                    event
                                      .target
                                      .value as ProductInputType,
                                  )
                                }
                              >
                                <option value="text">
                                  نص
                                </option>

                                <option value="number">
                                  رقم
                                </option>

                                <option value="email">
                                  بريد
                                </option>

                                <option value="url">
                                  رابط
                                </option>
                              </select>
                            </label>

                            <label
                              style={{
                                display:
                                  "inline-flex",

                                alignItems:
                                  "center",

                                gap: 6,

                                paddingInline:
                                  8,

                                border:
                                  "1px solid var(--border)",

                                borderRadius: 8,

                                background:
                                  "var(--surface)",

                                fontSize: 6,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  field.required
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateField(
                                    index,
                                    "required",
                                    event
                                      .target
                                      .checked,
                                  )
                                }
                              />

                              مطلوب
                            </label>
                          </div>

                          <label
                            style={{
                              display:
                                "grid",

                              gap: 4,

                              fontSize: 6,
                            }}
                          >
                            <span>
                              Placeholder
                            </span>

                            <input
                              value={
                                field.placeholder ??
                                ""
                              }
                              onChange={(
                                event,
                              ) =>
                                updateField(
                                  index,
                                  "placeholder",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="اكتب Player ID"
                            />
                          </label>

                          <label
                            style={{
                              display:
                                "grid",

                              gap: 4,

                              fontSize: 6,
                            }}
                          >
                            <span>
                              النص المساعد
                            </span>

                            <input
                              value={
                                field.helperText ??
                                ""
                              }
                              onChange={(
                                event,
                              ) =>
                                updateField(
                                  index,
                                  "helperText",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </label>

                          <label
                            style={{
                              display:
                                "grid",

                              gap: 4,

                              fontSize: 6,
                            }}
                          >
                            <span>
                              Pattern اختياري
                            </span>

                            <input
                              value={
                                field.pattern ??
                                ""
                              }
                              onChange={(
                                event,
                              ) =>
                                updateField(
                                  index,
                                  "pattern",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </label>

                          <label
                            style={{
                              display:
                                "grid",

                              gap: 4,

                              fontSize: 6,
                            }}
                          >
                            <span>
                              رسالة خطأ Pattern
                            </span>

                            <input
                              value={
                                field.patternMessage ??
                                ""
                              }
                              onChange={(
                                event,
                              ) =>
                                updateField(
                                  index,
                                  "patternMessage",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </label>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>

              {message && (
                <p
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap: 6,

                    margin: 0,

                    padding: 10,

                    border:
                      `1px solid ${
                        success
                          ? "var(--success)"
                          : "var(--danger)"
                      }`,

                    borderRadius: 9,

                    color:
                      success
                        ? "var(--success)"
                        : "var(--danger)",

                    fontSize: 7,
                  }}
                >
                  {success && (
                    <CheckCircle2
                      size={15}
                    />
                  )}

                  {message}
                </p>
              )}

              <button
                type="button"
                disabled={
                  pending
                }
                onClick={
                  handleSave
                }
                style={{
                  display:
                    "inline-flex",

                  minHeight: 43,

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  gap: 7,

                  border:
                    "1px solid var(--primary-border)",

                  borderRadius: 10,

                  background:
                    "var(--primary)",

                  color:
                    "#fff",

                  fontSize: 8,

                  fontWeight: 900,

                  opacity:
                    pending
                      ? 0.65
                      : 1,
                }}
              >
                {pending ? (
                  <LoaderCircle
                    size={16}
                  />
                ) : (
                  <Save
                    size={16}
                  />
                )}

                حفظ الباقة
              </button>
              <button type="button" disabled={pending} onClick={handleDelete} style={{display:"inline-flex",minHeight:40,alignItems:"center",justifyContent:"center",gap:7,border:"1px solid var(--danger)",borderRadius:10,background:"transparent",color:"var(--danger)",fontSize:8,fontWeight:900}}><Trash2 size={15}/> حذف هذه الباقة</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
