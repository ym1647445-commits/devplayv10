"use client";

import {
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  Save,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";

import {
  ChangeEvent,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  updateMainProduct,
} from "@/app/admin/products/[id]/product-actions";

import {
  createClient,
} from "@/lib/supabase/client";

interface ProductDetailsEditorProps {
  product: {
    id: string;

    nameAr: string;
    nameEn: string | null;

    shortDescriptionAr:
      | string
      | null;

    descriptionAr:
      | string
      | null;

    imageUrl:
      | string
      | null;

    active: boolean;
    featured: boolean;

    deliveryTime:
      | string
      | null;

    badge:
      | string
      | null;
  };
}

export function ProductDetailsEditor({
  product,
}: ProductDetailsEditorProps) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  const [
    nameAr,
    setNameAr,
  ] = useState(
    product.nameAr,
  );

  const [
    nameEn,
    setNameEn,
  ] = useState(
    product.nameEn ??
      "",
  );

  const [
    shortDescriptionAr,
    setShortDescriptionAr,
  ] = useState(
    product.shortDescriptionAr ??
      "",
  );

  const [
    descriptionAr,
    setDescriptionAr,
  ] = useState(
    product.descriptionAr ??
      "",
  );

  const [
    imageUrl,
    setImageUrl,
  ] = useState(
    product.imageUrl ??
      "",
  );

  const [
    active,
    setActive,
  ] = useState(
    product.active,
  );

  const [
    featured,
    setFeatured,
  ] = useState(
    product.featured,
  );

  const [
    deliveryTime,
    setDeliveryTime,
  ] = useState(
    product.deliveryTime ??
      "",
  );

  const [
    badge,
    setBadge,
  ] = useState(
    product.badge ??
      "",
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

  async function handleImageUpload(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage(null);
    setSuccess(false);

    /*
     * نتأكد إنها صورة.
     */
    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      setMessage(
        "اختاري ملف صورة فقط.",
      );

      return;
    }

    /*
     * حد أقصى 5MB
     */
    const maxSize =
      5 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      setMessage(
        "حجم الصورة يجب ألا يتجاوز 5MB.",
      );

      return;
    }

    setUploadingImage(
      true,
    );

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const safeExtension =
        [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "gif",
        ].includes(
          extension,
        )
          ? extension
          : "jpg";

      /*
       * كل منتج له فولدر خاص.
       */
      const filePath =
        `${product.id}/` +
        `${Date.now()}-` +
        `${crypto.randomUUID()}.` +
        safeExtension;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "product-images",
          )
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                file.type,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "product-images",
          )
          .getPublicUrl(
            filePath,
          );

      const uploadedUrl =
        publicUrlData.publicUrl;

      if (
        !uploadedUrl
      ) {
        throw new Error(
          "تعذر الحصول على رابط الصورة.",
        );
      }

      setImageUrl(
        uploadedUrl,
      );

      setMessage(
        "تم رفع الصورة. اضغطي حفظ التعديلات لتثبيتها على المنتج.",
      );

      setSuccess(true);
    } catch (error) {
      console.error(
        "PRODUCT IMAGE UPLOAD ERROR:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر رفع الصورة.",
      );

      setSuccess(false);
    } finally {
      setUploadingImage(
        false,
      );

      /*
       * يسمح باختيار نفس الصورة
       * مرة ثانية لو احتجنا.
       */
      event.target.value =
        "";
    }
  }

  function removeImage() {
    setImageUrl("");

    setMessage(
      "تم حذف الصورة من المعاينة. اضغطي حفظ التعديلات لتأكيد الحذف.",
    );

    setSuccess(true);
  }

  function handleSave() {
    if (
      pending ||
      uploadingImage
    ) {
      return;
    }

    setMessage(null);
    setSuccess(false);

    startTransition(
      async () => {
        const result =
          await updateMainProduct({
            productId:
              product.id,

            nameAr,

            nameEn,

            shortDescriptionAr,

            descriptionAr,

            imageUrl,

            active,

            featured,

            deliveryTime,

            badge,
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

  const busy =
    pending ||
    uploadingImage;

  return (
    <section
      style={{
        display:
          "grid",

        gap:
          12,

        padding:
          14,

        border:
          "1px solid var(--border)",

        borderRadius:
          15,

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

          flexWrap:
            "wrap",

          gap:
            10,

          paddingBottom:
            10,

          borderBottom:
            "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display:
              "grid",

            gap:
              4,
          }}
        >
          <strong
            style={{
              fontSize:
                11,
            }}
          >
            معلومات المنتج الرئيسي
          </strong>

          <small
            style={{
              color:
                "var(--muted)",

              fontSize:
                7,

              lineHeight:
                1.7,
            }}
          >
            البيانات التي يراها العميل قبل اختيار الباقة.
          </small>
        </div>

        <button
          type="button"
          disabled={
            busy
          }
          onClick={
            handleSave
          }
          style={{
            display:
              "inline-flex",

            minHeight:
              38,

            alignItems:
              "center",

            justifyContent:
              "center",

            gap:
              6,

            paddingInline:
              12,

            border:
              "1px solid var(--primary-border)",

            borderRadius:
              10,

            background:
              "var(--primary)",

            color:
              "#fff",

            fontSize:
              7,

            fontWeight:
              900,

            cursor:
              busy
                ? "not-allowed"
                : "pointer",

            opacity:
              busy
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

          حفظ التعديلات
        </button>
      </header>

      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          alignItems:
            "flex-start",

          gap:
            14,
        }}
      >
        {/* =========================
            الصورة
        ========================= */}

        <div
          style={{
            display:
              "grid",

            flex:
              "0 1 180px",

            minWidth:
              130,

            gap:
              8,
          }}
        >
          <span
            style={{
              display:
                "grid",

              width:
                "100%",

              aspectRatio:
                "1 / 1",

              placeItems:
                "center",

              overflow:
                "hidden",

              border:
                "1px solid var(--border)",

              borderRadius:
                14,

              background:
                "var(--surface-soft)",

              color:
                "var(--primary)",
            }}
          >
            {imageUrl ? (
              <img
                src={
                  imageUrl
                }
                alt={
                  nameAr ||
                  "صورة المنتج"
                }
                style={{
                  width:
                    "100%",

                  height:
                    "100%",

                  objectFit:
                    "cover",
                }}
              />
            ) : (
              <ImageIcon
                size={34}
              />
            )}
          </span>

          <label
            style={{
              display:
                "inline-flex",

              minHeight:
                40,

              alignItems:
                "center",

              justifyContent:
                "center",

              gap:
                7,

              paddingInline:
                10,

              border:
                "1px solid var(--primary-border)",

              borderRadius:
                10,

              background:
                "var(--primary-soft)",

              color:
                "var(--primary)",

              fontSize:
                7,

              fontWeight:
                900,

              cursor:
                uploadingImage
                  ? "not-allowed"
                  : "pointer",

              opacity:
                uploadingImage
                  ? 0.65
                  : 1,
            }}
          >
            {uploadingImage ? (
              <>
                <LoaderCircle
                  size={16}
                />

                جاري رفع الصورة...
              </>
            ) : (
              <>
                <UploadCloud
                  size={16}
                />

                {imageUrl
                  ? "تغيير الصورة"
                  : "رفع صورة"}
              </>
            )}

            <input
              type="file"
              accept="image/*"
              disabled={
                uploadingImage
              }
              onChange={
                handleImageUpload
              }
              style={{
                display:
                  "none",
              }}
            />
          </label>

          {imageUrl && (
            <button
              type="button"
              disabled={
                uploadingImage
              }
              onClick={
                removeImage
              }
              style={{
                display:
                  "inline-flex",

                minHeight:
                  36,

                alignItems:
                  "center",

                justifyContent:
                  "center",

                gap:
                  6,

                border:
                  "1px solid var(--danger)",

                borderRadius:
                  9,

                background:
                  "transparent",

                color:
                  "var(--danger)",

                fontSize:
                  7,

                fontWeight:
                  800,
              }}
            >
              <Trash2
                size={14}
              />

              إزالة الصورة
            </button>
          )}

          <small
            style={{
              color:
                "var(--muted)",

              fontSize:
                6,

              lineHeight:
                1.7,
            }}
          >
            JPG أو PNG أو WEBP بحد أقصى 5MB.
          </small>
        </div>

        {/* =========================
            البيانات
        ========================= */}

        <div
          style={{
            display:
              "grid",

            flex:
              "1 1 300px",

            minWidth:
              0,

            gap:
              10,
          }}
        >
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",

              gap:
                8,
            }}
          >
            <label
              style={{
                display:
                  "grid",

                gap:
                  5,

                fontSize:
                  7,
              }}
            >
              <span>
                الاسم بالعربي
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

                gap:
                  5,

                fontSize:
                  7,
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
          </div>

          <label
            style={{
              display:
                "grid",

              gap:
                5,

              fontSize:
                7,
            }}
          >
            <span>
              الوصف المختصر
            </span>

            <textarea
              rows={3}
              value={
                shortDescriptionAr
              }
              onChange={(
                event,
              ) =>
                setShortDescriptionAr(
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

              gap:
                5,

              fontSize:
                7,
            }}
          >
            <span>
              الوصف الكامل
            </span>

            <textarea
              rows={5}
              value={
                descriptionAr
              }
              onChange={(
                event,
              ) =>
                setDescriptionAr(
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
                "repeat(auto-fit, minmax(180px, 1fr))",

              gap:
                8,
            }}
          >
            <label
              style={{
                display:
                  "grid",

                gap:
                  5,

                fontSize:
                  7,
              }}
            >
              <span>
                وقت التنفيذ
              </span>

              <input
                value={
                  deliveryTime
                }
                onChange={(
                  event,
                ) =>
                  setDeliveryTime(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="مثال: خلال 5 دقائق"
              />
            </label>

            <label
              style={{
                display:
                  "grid",

                gap:
                  5,

                fontSize:
                  7,
              }}
            >
              <span>
                Badge
              </span>

              <input
                value={
                  badge
                }
                onChange={(
                  event,
                ) =>
                  setBadge(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="الأكثر طلبًا"
              />
            </label>
          </div>

          <div
            style={{
              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                8,
            }}
          >
            <label
              style={{
                display:
                  "inline-flex",

                minHeight:
                  38,

                alignItems:
                  "center",

                gap:
                  7,

                paddingInline:
                  10,

                border:
                  "1px solid var(--border)",

                borderRadius:
                  9,

                background:
                  "var(--surface-soft)",

                fontSize:
                  7,
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

              المنتج نشط
            </label>

            <label
              style={{
                display:
                  "inline-flex",

                minHeight:
                  38,

                alignItems:
                  "center",

                gap:
                  7,

                paddingInline:
                  10,

                border:
                  "1px solid var(--border)",

                borderRadius:
                  9,

                background:
                  "var(--surface-soft)",

                fontSize:
                  7,
              }}
            >
              <input
                type="checkbox"
                checked={
                  featured
                }
                onChange={(
                  event,
                ) =>
                  setFeatured(
                    event
                      .target
                      .checked,
                  )
                }
              />

              <Star
                size={14}
              />

              منتج مميز
            </label>
          </div>

          {message && (
            <p
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  6,

                margin:
                  0,

                padding:
                  10,

                border:
                  `1px solid ${
                    success
                      ? "var(--success)"
                      : "var(--danger)"
                  }`,

                borderRadius:
                  9,

                color:
                  success
                    ? "var(--success)"
                    : "var(--danger)",

                fontSize:
                  7,

                lineHeight:
                  1.7,
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
        </div>
      </div>
    </section>
  );
}