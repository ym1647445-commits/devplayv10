"use client";

import {
  BadgeDollarSign,
  Boxes,
  Check,
  CircleDollarSign,
  Copy,
  Eye,
  EyeOff,
  ImageIcon,
  Layers3,
  LoaderCircle,
  PackageCheck,
  PackageOpen,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  deleteAdminProduct,
  duplicateAdminProduct,
  saveAdminProduct,
  toggleAdminProductActive,
  toggleAdminProductFeatured,
  updateAdminProductStatus,
} from "@/app/admin/products/actions";
import type {
  AdminProduct,
  AdminProductCategory,
  AdminProductFormInput,
  AdminProductStats,
} from "@/types/adminProduct";
import type {
  ProductInputType,
  ProductRequiredField,
  ProductStatus,
} from "@/types/product";

import styles from "./ProductsManager.module.css";

interface ProductsManagerProps {
  products: AdminProduct[];
  categories: AdminProductCategory[];
  stats: AdminProductStats;
}

type ProductFilter =
  | "all"
  | "active"
  | "inactive"
  | "featured"
  | "available"
  | "busy"
  | "unavailable"
  | "instant";

interface ProductFormState {
  productId?: string;

  externalId: string;
  supplierProductId: string;

  categoryId: string;

  slug: string;

  nameAr: string;
  nameEn: string;

  shortDescriptionAr: string;
  descriptionAr: string;

  imageUrl: string;

  supplierPriceUsd: string;
  profitUsd: string;
  oldPriceUsd: string;

  minimumQuantity: string;
  maximumQuantity: string;

  requiredFields:
    ProductRequiredField[];

  status: ProductStatus;

  active: boolean;
  featured: boolean;
  instantDelivery: boolean;

  deliveryTime: string;
  badge: string;
}

const emptyForm:
  ProductFormState = {
    externalId: "",
    supplierProductId: "",

    categoryId: "",

    slug: "",

    nameAr: "",
    nameEn: "",

    shortDescriptionAr: "",
    descriptionAr: "",

    imageUrl: "",

    supplierPriceUsd: "0",
    profitUsd: "0",
    oldPriceUsd: "",

    minimumQuantity: "1",
    maximumQuantity: "99",

    requiredFields: [],

    status: "available",

    active: true,
    featured: false,
    instantDelivery: false,

    deliveryTime: "",
    badge: "",
  };

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

function getStatusLabel(
  status: ProductStatus,
): string {
  const labels: Record<
    ProductStatus,
    string
  > = {
    available: "متوفر",
    busy: "ضغط مرتفع",
    unavailable: "غير متوفر",
  };

  return labels[status];
}

function createRequiredField():
  ProductRequiredField {
  return {
    id: `field_${Date.now()}`,

    label: "",
    placeholder: "",

    type: "text",
    required: true,
  };
}

function productToForm(
  product: AdminProduct,
): ProductFormState {
  return {
    productId: product.id,

    externalId:
      product.externalId ?? "",

    supplierProductId:
      product.supplierProductId ??
      "",

    categoryId:
      product.categoryId ?? "",

    slug: product.slug,

    nameAr: product.nameAr,

    nameEn:
      product.nameEn ?? "",

    shortDescriptionAr:
      product.shortDescriptionAr ??
      "",

    descriptionAr:
      product.descriptionAr ?? "",

    imageUrl:
      product.imageUrl ?? "",

    supplierPriceUsd:
      String(
        product.supplierPriceUsd,
      ),

    profitUsd:
      String(product.profitUsd),

    oldPriceUsd:
      product.oldPriceUsd === null
        ? ""
        : String(
            product.oldPriceUsd,
          ),

    minimumQuantity:
      String(
        product.minimumQuantity,
      ),

    maximumQuantity:
      String(
        product.maximumQuantity,
      ),

    requiredFields:
      product.requiredFields.map(
        (field) => ({
          ...field,
        }),
      ),

    status: product.status,

    active: product.active,

    featured:
      product.featured,

    instantDelivery:
      product.instantDelivery,

    deliveryTime:
      product.deliveryTime ?? "",

    badge:
      product.badge ?? "",
  };
}

export function ProductsManager({
  products,
  categories,
  stats,
}: ProductsManagerProps) {
  const router = useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [filter, setFilter] =
    useState<ProductFilter>("all");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [searchText, setSearchText] =
    useState("");

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [form, setForm] =
    useState<ProductFormState>(
      emptyForm,
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState<string | null>(null);

  const filteredProducts =
    useMemo(() => {
      const normalized =
        searchText
          .trim()
          .toLowerCase();

      return products.filter(
        (product) => {
          if (
            filter === "active" &&
            !product.active
          ) {
            return false;
          }

          if (
            filter === "inactive" &&
            product.active
          ) {
            return false;
          }

          if (
            filter === "featured" &&
            !product.featured
          ) {
            return false;
          }

          if (
            filter === "available" &&
            product.status !==
              "available"
          ) {
            return false;
          }

          if (
            filter === "busy" &&
            product.status !== "busy"
          ) {
            return false;
          }

          if (
            filter ===
              "unavailable" &&
            product.status !==
              "unavailable"
          ) {
            return false;
          }

          if (
            filter === "instant" &&
            !product.instantDelivery
          ) {
            return false;
          }

          if (
            categoryFilter !==
              "all" &&
            product.categoryId !==
              categoryFilter
          ) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          return [
            product.nameAr,
            product.nameEn,
            product.slug,
            product.externalId,
            product.supplierProductId,
            product.category?.nameAr,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        },
      );
    }, [
      products,
      filter,
      categoryFilter,
      searchText,
    ]);

  const liveSupplierPrice =
    Number(
      form.supplierPriceUsd,
    ) || 0;

  const liveProfit =
    Number(form.profitUsd) || 0;

  const liveFinalPrice =
    liveSupplierPrice +
    liveProfit;

  function openCreate(): void {
    setForm({
      ...emptyForm,
      requiredFields: [],
    });

    setMessage(null);
    setDrawerOpen(true);
  }

  function openEdit(
    product: AdminProduct,
  ): void {
    setForm(
      productToForm(product),
    );

    setMessage(null);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    if (pending) {
      return;
    }

    setDrawerOpen(false);
    setMessage(null);
  }

  function updateForm<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateRequiredField(
    index: number,
    key: keyof ProductRequiredField,
    value:
      | string
      | boolean,
  ): void {
    setForm((current) => ({
      ...current,

      requiredFields:
        current.requiredFields.map(
          (field, fieldIndex) =>
            fieldIndex === index
              ? {
                  ...field,
                  [key]: value,
                }
              : field,
        ),
    }));
  }

  function addRequiredField(): void {
    setForm((current) => ({
      ...current,

      requiredFields: [
        ...current.requiredFields,
        createRequiredField(),
      ],
    }));
  }

  function removeRequiredField(
    index: number,
  ): void {
    setForm((current) => ({
      ...current,

      requiredFields:
        current.requiredFields.filter(
          (_, fieldIndex) =>
            fieldIndex !== index,
        ),
    }));
  }

  async function copyValue(
    value: string,
    label: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(label);

      window.setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      window.alert(value);
    }
  }

  function buildPayload():
    AdminProductFormInput {
    return {
      productId:
        form.productId,

      externalId:
        form.externalId.trim() ||
        null,

      supplierProductId:
        form.supplierProductId.trim() ||
        null,

      categoryId:
        form.categoryId || null,

      slug:
        form.slug.trim(),

      nameAr:
        form.nameAr.trim(),

      nameEn:
        form.nameEn.trim() ||
        null,

      shortDescriptionAr:
        form.shortDescriptionAr.trim() ||
        null,

      descriptionAr:
        form.descriptionAr.trim() ||
        null,

      imageUrl:
        form.imageUrl.trim() ||
        null,

      supplierPriceUsd:
        Number(
          form.supplierPriceUsd,
        ),

      profitUsd:
        Number(form.profitUsd),

      oldPriceUsd:
        form.oldPriceUsd.trim()
          ? Number(
              form.oldPriceUsd,
            )
          : null,

      minimumQuantity:
        Number(
          form.minimumQuantity,
        ),

      maximumQuantity:
        Number(
          form.maximumQuantity,
        ),

      requiredFields:
        form.requiredFields,

      status: form.status,

      active: form.active,

      featured:
        form.featured,

      instantDelivery:
        form.instantDelivery,

      deliveryTime:
        form.deliveryTime.trim() ||
        null,

      badge:
        form.badge.trim() ||
        null,
    };
  }

  function handleSave(): void {
    if (pending) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await saveAdminProduct(
          buildPayload(),
        );

      setMessage(result.message);

      if (result.success) {
        router.refresh();

        window.setTimeout(() => {
          setDrawerOpen(false);
        }, 700);
      }
    });
  }

  function handleDuplicate(
    productId: string,
  ): void {
    if (pending) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await duplicateAdminProduct(
          productId,
        );

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDelete(): void {
    if (
      !form.productId ||
      pending
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "هل أنتِ متأكدة من حذف أو أرشفة المنتج؟",
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await deleteAdminProduct(
          form.productId!,
        );

      setMessage(result.message);

      if (result.success) {
        router.refresh();

        window.setTimeout(() => {
          setDrawerOpen(false);
        }, 700);
      }
    });
  }

  function handleQuickActive(
    product: AdminProduct,
  ): void {
    startTransition(async () => {
      const result =
        await toggleAdminProductActive({
          productId: product.id,
          active: !product.active,
        });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleQuickFeatured(
    product: AdminProduct,
  ): void {
    startTransition(async () => {
      const result =
        await toggleAdminProductFeatured({
          productId: product.id,
          featured:
            !product.featured,
        });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleQuickStatus(
    product: AdminProduct,
    status: ProductStatus,
  ): void {
    startTransition(async () => {
      const result =
        await updateAdminProductStatus({
          productId:
            product.id,

          status,
        });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const statCards = [
    {
      title: "إجمالي المنتجات",
      value: stats.total,
      icon: Boxes,
    },
    {
      title: "المنتجات النشطة",
      value: stats.active,
      icon: PackageCheck,
    },
    {
      title: "غير المتاحة",
      value: stats.unavailable,
      icon: PackageOpen,
    },
    {
      title: "المنتجات المميزة",
      value: stats.featured,
      icon: Sparkles,
    },
    {
      title: "متوسط سعر المورد",
      value: formatUsd(
        stats.averageSupplierPriceUsd,
      ),
      icon: CircleDollarSign,
    },
    {
      title: "متوسط الربح",
      value: formatUsd(
        stats.averageProfitUsd,
      ),
      icon: BadgeDollarSign,
    },
  ];

  return (
    <section className={styles.wrapper}>
      <section className={styles.stats}>
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title}>
              <span>
                <Icon size={19} />
              </span>

              <div>
                <small>
                  {card.title}
                </small>

                <strong>
                  {typeof card.value ===
                  "number"
                    ? card.value.toLocaleString(
                        "ar-EG",
                      )
                    : card.value}
                </strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <label className={styles.search}>
            <Search size={17} />

            <input
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value,
                )
              }
              placeholder="بحث بالاسم أو Slug أو Supplier ID"
            />
          </label>

          <button
            className={styles.createButton}
            type="button"
            onClick={openCreate}
          >
            <Plus size={17} />
            منتج جديد
          </button>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filters}>
            {(
              [
                ["all", "الكل"],
                ["active", "النشطة"],
                ["inactive", "المخفية"],
                ["featured", "المميزة"],
                ["available", "متاحة"],
                ["busy", "ضغط"],
                [
                  "unavailable",
                  "غير متاحة",
                ],
                ["instant", "تنفيذ فوري"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  filter === value
                    ? styles.activeFilter
                    : ""
                }
                onClick={() =>
                  setFilter(value)
                }
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              كل الأقسام
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.nameAr}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      {filteredProducts.length === 0 ? (
        <section className={styles.empty}>
          <Boxes size={35} />

          <h2>
            لا توجد منتجات
          </h2>

          <p>
            المنتجات المطابقة للبحث أو
            الفلتر ستظهر هنا.
          </p>

          <button
            type="button"
            onClick={openCreate}
          >
            <Plus size={16} />
            إضافة أول منتج
          </button>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredProducts.map(
            (product) => (
              <article
  className={styles.card}
  key={product.id}
  onClick={() =>
    router.push(
      `/admin/products/${product.id}`,
    )
  }
>
                <span
                  className={
                    styles.image
                  }
                >
                  {product.imageUrl ? (
                    <img
                      src={
                        product.imageUrl
                      }
                      alt={
                        product.nameAr
                      }
                    />
                  ) : (
                    <ImageIcon
                      size={23}
                    />
                  )}
                </span>

                <div
                  className={
                    styles.productCopy
                  }
                >
                  <div>
                    <strong>
                      {product.nameAr}
                    </strong>

                    {product.featured && (
                      <span
                        className={
                          styles.featuredBadge
                        }
                      >
                        <Star
                          size={11}
                          fill="currentColor"
                        />
                        مميز
                      </span>
                    )}

                    {!product.active && (
                      <span
                        className={
                          styles.hiddenBadge
                        }
                      >
                        مخفي
                      </span>
                    )}
                  </div>

                  <p>
                    {product.slug}
                    {" · "}
                    {product.category
                      ?.nameAr ||
                      "بدون قسم"}
                  </p>
                </div>

                <div
                  className={
                    styles.pricing
                  }
                >
                  <span>
                    <small>
                      المورد
                    </small>

                    <strong>
                      {formatUsd(
                        product.supplierPriceUsd,
                      )}
                    </strong>
                  </span>

                  <span>
                    <small>
                      الربح
                    </small>

                    <strong>
                      {formatUsd(
                        product.profitUsd,
                      )}
                    </strong>
                  </span>

                  <span>
                    <small>
                      البيع
                    </small>

                    <strong>
                      {formatUsd(
                        product.finalPriceUsd,
                      )}
                    </strong>
                  </span>
                </div>

                <div
                  className={
                    styles.quickControls
                  }
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <select
                    value={product.status}
                    disabled={pending}
                    onChange={(event) =>
                      handleQuickStatus(
                        product,
                        event.target
                          .value as ProductStatus,
                      )
                    }
                  >
                    <option value="available">
                      متوفر
                    </option>

                    <option value="busy">
                      ضغط مرتفع
                    </option>

                    <option value="unavailable">
                      غير متوفر
                    </option>
                  </select>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleQuickFeatured(
                        product,
                      )
                    }
                    aria-label="تعديل حالة المميز"
                  >
                    <Star
                      size={16}
                      fill={
                        product.featured
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleQuickActive(
                        product,
                      )
                    }
                    aria-label="تفعيل أو إخفاء المنتج"
                  >
                    {product.active ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff size={16} />
                    )}
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      )}

      {drawerOpen && (
        <div className={styles.overlay}>
          <button
            className={styles.backdrop}
            type="button"
            onClick={closeDrawer}
            aria-label="إغلاق"
          />

          <aside className={styles.drawer}>
            <header>
              <div>
                <span>
                  PRODUCT EDITOR
                </span>

                <h2>
                  {form.productId
                    ? "تعديل المنتج"
                    : "إضافة منتج جديد"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                disabled={pending}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className={styles.drawerBody}>
              <section
                className={
                  styles.previewCard
                }
              >
                <span>
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt={
                        form.nameAr ||
                        "صورة المنتج"
                      }
                    />
                  ) : (
                    <ImageIcon
                      size={26}
                    />
                  )}
                </span>

                <div>
                  <small>
                    معاينة المنتج
                  </small>

                  <h3>
                    {form.nameAr ||
                      "اسم المنتج"}
                  </h3>

                  <p>
                    {form.categoryId
                      ? categories.find(
                          (category) =>
                            category.id ===
                            form.categoryId,
                        )?.nameAr
                      : "بدون قسم"}
                  </p>
                </div>

                <strong>
                  {formatUsd(
                    liveFinalPrice,
                  )}
                </strong>
              </section>

              <section className={styles.panel}>
                <header>
                  <PackageOpen size={17} />
                  <strong>
                    البيانات الأساسية
                  </strong>
                </header>

                <label>
                  <span>
                    اسم المنتج بالعربي
                  </span>

                  <input
                    value={form.nameAr}
                    onChange={(event) =>
                      updateForm(
                        "nameAr",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    الاسم بالإنجليزي
                  </span>

                  <input
                    value={form.nameEn}
                    onChange={(event) =>
                      updateForm(
                        "nameEn",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <div
                  className={
                    styles.twoColumns
                  }
                >
                  <label>
                    <span>Slug</span>

                    <input
                      value={form.slug}
                      onChange={(event) =>
                        updateForm(
                          "slug",
                          event.target.value
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-",
                            ),
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>القسم</span>

                    <select
                      value={
                        form.categoryId
                      }
                      onChange={(event) =>
                        updateForm(
                          "categoryId",
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="">
                        بدون قسم
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.nameAr
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>

                <label>
                  <span>رابط الصورة</span>

                  <input
                    value={form.imageUrl}
                    onChange={(event) =>
                      updateForm(
                        "imageUrl",
                        event.target.value,
                      )
                    }
                    placeholder="/products/product.jpg"
                  />
                </label>

                <label>
                  <span>
                    الوصف المختصر
                  </span>

                  <textarea
                    value={
                      form.shortDescriptionAr
                    }
                    onChange={(event) =>
                      updateForm(
                        "shortDescriptionAr",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    الوصف الكامل
                  </span>

                  <textarea
                    value={
                      form.descriptionAr
                    }
                    onChange={(event) =>
                      updateForm(
                        "descriptionAr",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </section>

              <section className={styles.panel}>
                <header>
                  <CircleDollarSign
                    size={17}
                  />

                  <strong>
                    التسعير
                  </strong>
                </header>

                <div
                  className={
                    styles.pricingPreview
                  }
                >
                  <div>
                    <span>
                      سعر المورد
                    </span>

                    <strong>
                      {formatUsd(
                        liveSupplierPrice,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ربح المنصة
                    </span>

                    <strong>
                      {formatUsd(
                        liveProfit,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      سعر البيع النهائي
                    </span>

                    <strong>
                      {formatUsd(
                        liveFinalPrice,
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.twoColumns
                  }
                >
                  <label>
                    <span>
                      سعر المورد $
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={
                        form.supplierPriceUsd
                      }
                      onChange={(event) =>
                        updateForm(
                          "supplierPriceUsd",
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      الربح $
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={
                        form.profitUsd
                      }
                      onChange={(event) =>
                        updateForm(
                          "profitUsd",
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>
                </div>

                <label>
                  <span>
                    السعر القديم اختياري
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={
                      form.oldPriceUsd
                    }
                    onChange={(event) =>
                      updateForm(
                        "oldPriceUsd",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </section>

              <section className={styles.panel}>
                <header>
                  <Layers3 size={17} />
                  <strong>
                    الكميات والتوفر
                  </strong>
                </header>

                <div
                  className={
                    styles.twoColumns
                  }
                >
                  <label>
                    <span>
                      أقل كمية
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={
                        form.minimumQuantity
                      }
                      onChange={(event) =>
                        updateForm(
                          "minimumQuantity",
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      أقصى كمية
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={
                        form.maximumQuantity
                      }
                      onChange={(event) =>
                        updateForm(
                          "maximumQuantity",
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>
                </div>

                <label>
                  <span>
                    حالة المنتج
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target
                          .value as ProductStatus,
                      )
                    }
                  >
                    <option value="available">
                      متوفر
                    </option>

                    <option value="busy">
                      ضغط مرتفع
                    </option>

                    <option value="unavailable">
                      غير متوفر
                    </option>
                  </select>
                </label>

                <div
                  className={
                    styles.switchGrid
                  }
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        updateForm(
                          "active",
                          event.target
                            .checked,
                        )
                      }
                    />

                    <span>
                      المنتج نشط
                    </span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        form.featured
                      }
                      onChange={(event) =>
                        updateForm(
                          "featured",
                          event.target
                            .checked,
                        )
                      }
                    />

                    <span>
                      منتج مميز
                    </span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        form.instantDelivery
                      }
                      onChange={(event) =>
                        updateForm(
                          "instantDelivery",
                          event.target
                            .checked,
                        )
                      }
                    />

                    <span>
                      تنفيذ فوري
                    </span>
                  </label>
                </div>

                <div
                  className={
                    styles.twoColumns
                  }
                >
                  <label>
                    <span>
                      وقت التنفيذ
                    </span>

                    <input
                      value={
                        form.deliveryTime
                      }
                      onChange={(event) =>
                        updateForm(
                          "deliveryTime",
                          event.target
                            .value,
                        )
                      }
                      placeholder="مثال: 5 دقائق"
                    />
                  </label>

                  <label>
                    <span>Badge</span>

                    <input
                      value={form.badge}
                      onChange={(event) =>
                        updateForm(
                          "badge",
                          event.target.value,
                        )
                      }
                      placeholder="الأكثر طلبًا"
                    />
                  </label>
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <Truck size={17} />
                  <strong>
                    بيانات المورد
                  </strong>
                </header>

                <label>
                  <span>
                    External ID
                  </span>

                  <div
                    className={
                      styles.copyInput
                    }
                  >
                    <input
                      value={
                        form.externalId
                      }
                      onChange={(event) =>
                        updateForm(
                          "externalId",
                          event.target
                            .value,
                        )
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        !form.externalId
                      }
                      onClick={() => {
                        void copyValue(
                          form.externalId,
                          "external-id",
                        );
                      }}
                    >
                      {copied ===
                      "external-id" ? (
                        <Check
                          size={15}
                        />
                      ) : (
                        <Copy
                          size={15}
                        />
                      )}
                    </button>
                  </div>
                </label>

                <label>
                  <span>
                    Supplier Product ID
                  </span>

                  <div
                    className={
                      styles.copyInput
                    }
                  >
                    <input
                      value={
                        form.supplierProductId
                      }
                      onChange={(event) =>
                        updateForm(
                          "supplierProductId",
                          event.target
                            .value,
                        )
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        !form.supplierProductId
                      }
                      onClick={() => {
                        void copyValue(
                          form.supplierProductId,
                          "supplier-id",
                        );
                      }}
                    >
                      {copied ===
                      "supplier-id" ? (
                        <Check
                          size={15}
                        />
                      ) : (
                        <Copy
                          size={15}
                        />
                      )}
                    </button>
                  </div>
                </label>
              </section>

              <section className={styles.panel}>
                <header
                  className={
                    styles.fieldsHeader
                  }
                >
                  <div>
                    <Layers3 size={17} />
                    <strong>
                      بيانات التنفيذ المطلوبة
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addRequiredField
                    }
                  >
                    <Plus size={15} />
                    إضافة حقل
                  </button>
                </header>

                {form.requiredFields.length ===
                0 ? (
                  <div
                    className={
                      styles.noFields
                    }
                  >
                    المنتج لا يحتاج إلى
                    بيانات إضافية.
                  </div>
                ) : (
                  <div
                    className={
                      styles.fieldsList
                    }
                  >
                    {form.requiredFields.map(
                      (field, index) => (
                        <article
                          key={`${field.id}-${index}`}
                        >
                          <header>
                            <strong>
                              حقل رقم{" "}
                              {index + 1}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                removeRequiredField(
                                  index,
                                )
                              }
                            >
                              <Trash2
                                size={15}
                              />
                            </button>
                          </header>

                          <div
                            className={
                              styles.twoColumns
                            }
                          >
                            <label>
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
                                  updateRequiredField(
                                    index,
                                    "id",
                                    event.target
                                      .value,
                                  )
                                }
                              />
                            </label>

                            <label>
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
                                  updateRequiredField(
                                    index,
                                    "label",
                                    event.target
                                      .value,
                                  )
                                }
                              />
                            </label>
                          </div>

                          <div
                            className={
                              styles.twoColumns
                            }
                          >
                            <label>
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
                                  updateRequiredField(
                                    index,
                                    "type",
                                    event.target
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
                              className={
                                styles.requiredToggle
                              }
                            >
                              <input
                                type="checkbox"
                                checked={
                                  field.required
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateRequiredField(
                                    index,
                                    "required",
                                    event.target
                                      .checked,
                                  )
                                }
                              />

                              <span>
                                الحقل مطلوب
                              </span>
                            </label>
                          </div>

                          <label>
                            <span>
                              Placeholder
                            </span>

                            <input
                              value={
                                field.placeholder
                              }
                              onChange={(
                                event,
                              ) =>
                                updateRequiredField(
                                  index,
                                  "placeholder",
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </label>

                          <label>
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
                                updateRequiredField(
                                  index,
                                  "helperText",
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </label>

                          <label>
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
                                updateRequiredField(
                                  index,
                                  "pattern",
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </label>

                          <label>
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
                                updateRequiredField(
                                  index,
                                  "patternMessage",
                                  event.target
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
                  className={
                    styles.message
                  }
                  role="status"
                >
                  {message}
                </p>
              )}

              <section
                className={
                  styles.drawerActions
                }
              >
                {form.productId && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        handleDuplicate(
                          form.productId!,
                        )
                      }
                    >
                      <Copy size={16} />
                      نسخ المنتج
                    </button>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={
                        handleDelete
                      }
                    >
                      <Trash2 size={16} />
                      حذف أو أرشفة
                    </button>
                  </>
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
                    <LoaderCircle
                      className={
                        styles.spinner
                      }
                      size={17}
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  حفظ المنتج
                </button>
              </section>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}