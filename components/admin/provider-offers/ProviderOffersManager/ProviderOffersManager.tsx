"use client";

import {
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Filter,
  LoaderCircle,
  PackageSearch,
  Search,
  Smartphone,
  Store,
  XCircle,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  importProviderCategoryOffersToStore,
  importProviderOfferToStore,
} from "@/app/admin/provider-offers/actions";

import type {
  AdminProviderOffer,
  ProviderPricingSettings,
} from "@/types/providerOfferAdmin";

import styles from "./ProviderOffersManager.module.css";

interface ProviderOffersManagerProps {
  offers:
    AdminProviderOffer[];

  pricingSettings:
    ProviderPricingSettings;

  loadError:
    string | null;
}

type CatalogFilter =
  | "all"
  | "topup"
  | "gc";

type ImportFilter =
  | "all"
  | "imported"
  | "not_imported";

type AvailabilityFilter =
  | "all"
  | "available"
  | "unavailable";

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

function formatEgp(
  value: number,
): string {
  return `${Number(
    value,
  ).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

function getSellingPrice(
  offer: AdminProviderOffer,
  settings:
    ProviderPricingSettings,
): number {
  if (
    settings.apiPricingMode ===
    "fixed_usd"
  ) {
    return (
      offer.price +
      settings.defaultProfitUsd
    );
  }

  if (
    settings.apiPricingMode ===
    "percentage"
  ) {
    return (
      offer.price +
      offer.price *
        (
          settings.defaultMarkupPercentage /
          100
        )
    );
  }

  return offer.price;
}

export function ProviderOffersManager({
  offers,
  pricingSettings,
  loadError,
}: ProviderOffersManagerProps) {
  const router =
    useRouter();

  const [
  importing,
  setImporting,
] =
  useState(false);
  const [
    importingOfferId,
    setImportingOfferId,
  ] =
  useState<string | null>(
      null,
    );

  const [importingCategoryKey,setImportingCategoryKey]=useState<string|null>(null);

  const [
    importMessage,
    setImportMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    importSuccess,
    setImportSuccess,
  ] =
    useState<boolean | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    catalogFilter,
    setCatalogFilter,
  ] =
    useState<CatalogFilter>(
      "all",
    );

  const [
    importFilter,
    setImportFilter,
  ] =
    useState<ImportFilter>(
      "all",
    );

  const [
    availabilityFilter,
    setAvailabilityFilter,
  ] =
    useState<AvailabilityFilter>(
      "all",
    );

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const categories =
    useMemo(() => {
      return Array.from(
        new Set(
          offers.map(
            (offer) =>
              offer.categoryName,
          ),
        ),
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            "ar",
          ),
      );
  }, [offers]);

  const categoryGroups=useMemo(()=>Array.from(offers.reduce((map,offer)=>{
    const key=[offer.providerName,offer.catalogType,offer.providerCategoryId].join("::");
    const current=map.get(key)??{key,name:offer.categoryName,providerName:offer.providerName,catalogType:offer.catalogType,providerCategoryId:offer.providerCategoryId,total:0,imported:0,available:0,pending:0,productId:null as string|null};
    current.total+=1;if(offer.importedToStore)current.imported+=1;if(offer.available)current.available+=1;if(offer.available&&!offer.importedToStore)current.pending+=1;current.productId=offer.storeProductId??current.productId;map.set(key,current);return map;
  },new Map<string,{key:string;name:string;providerName:string;catalogType:"topup"|"gc";providerCategoryId:string;total:number;imported:number;available:number;pending:number;productId:string|null}>()).values()).sort((a,b)=>a.name.localeCompare(b.name,"ar")),[offers]);

  const filteredOffers =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return offers.filter(
        (offer) => {
          const matchesSearch =
            !normalized ||
            [
              offer.name,
              offer.categoryName,
              offer.providerOfferId,
              offer.providerCategoryId,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalized);

          const matchesCatalog =
            catalogFilter ===
              "all" ||
            offer.catalogType ===
              catalogFilter;

          const matchesImport =
            importFilter ===
              "all" ||
            (
              importFilter ===
                "imported" &&
              offer.importedToStore
            ) ||
            (
              importFilter ===
                "not_imported" &&
              !offer.importedToStore
            );

          const matchesAvailability =
            availabilityFilter ===
              "all" ||
            (
              availabilityFilter ===
                "available" &&
              offer.available
            ) ||
            (
              availabilityFilter ===
                "unavailable" &&
              !offer.available
            );

          const matchesCategory =
            selectedCategory ===
              "all" ||
            offer.categoryName ===
              selectedCategory;

          return (
            matchesSearch &&
            matchesCatalog &&
            matchesImport &&
            matchesAvailability &&
            matchesCategory
          );
        },
      );
    }, [
      offers,
      search,
      catalogFilter,
      importFilter,
      availabilityFilter,
      selectedCategory,
    ]);

  const importedCount =
    offers.filter(
      (offer) =>
        offer.importedToStore,
    ).length;

  const availableCount =
    offers.filter(
      (offer) =>
        offer.available,
    ).length;

  const unavailableCount =
    offers.length -
    availableCount;

  const totalSupplierValue =
    offers.reduce(
      (total, offer) =>
        total +
        Number(
          offer.price,
        ),
      0,
    );

  async function handleImport(
  offer: AdminProviderOffer,
): Promise<void> {
  if (
    importing ||
    offer.importedToStore ||
    !offer.available
  ) {
    return;
  }

  setImporting(true);

  setImportingOfferId(
    offer.id,
  );

  setImportMessage(null);
  setImportSuccess(null);

  try {
    console.log(
      "Importing offer:",
      offer.id,
      offer.name,
    );

    const result =
      await importProviderOfferToStore(
        offer.id,
      );

    console.log(
      "Import result:",
      result,
    );

    setImportMessage(
      result.message,
    );

    setImportSuccess(
      result.success,
    );

    /*
     * مؤقتًا عشان نشوف
     * رد السيرفر بشكل مؤكد.
     */
    alert(result.message);

    if (result.success) {
      router.refresh();
    }
  } catch (error) {
    console.error(
      "IMPORT PROVIDER OFFER ERROR:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير متوقع أثناء إضافة الباقة للمتجر.";

    setImportMessage(
      message,
    );

    setImportSuccess(false);

    alert(
      `خطأ الاستيراد: ${message}`,
    );
  } finally {
    setImporting(false);

    setImportingOfferId(
      null,
    );
  }
}
  async function handleCategoryImport(group:(typeof categoryGroups)[number]){
    if(importing||importingCategoryKey||group.pending===0)return;
    setImporting(true);setImportingCategoryKey(group.key);setImportMessage(null);setImportSuccess(null);
    try{const result=await importProviderCategoryOffersToStore({providerName:group.providerName,catalogType:group.catalogType,providerCategoryId:group.providerCategoryId});setImportMessage(result.message);setImportSuccess(result.success);if(result.success||(result.importedCount??0)>0)router.refresh();}
    catch(error){setImportMessage(error instanceof Error?error.message:"تعذر إضافة باقات اللعبة.");setImportSuccess(false)}
    finally{setImporting(false);setImportingCategoryKey(null)}
  }
  return (
    <section
      className={styles.page}
    >
      <header
        className={
          styles.heading
        }
      >
        <div>
          <span>
            PROVIDER OFFERS
          </span>

          <h1>
            باقات المورد
          </h1>

          <p>
            راجعي الباقات المتزامنة
            وأسعار المورد والربح المتوقع
            قبل الاستيراد للمتجر.
          </p>
        </div>

        <span
          className={
            styles.providerBadge
          }
        >
          <Store size={17} />
          Flexy
        </span>
      </header>

      <section
        className={styles.stats}
      >
        <article>
          <span>
            <Boxes size={19} />
          </span>

          <div>
            <small>
              إجمالي الباقات
            </small>

            <strong>
              {offers.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <CheckCircle2
              size={19}
            />
          </span>

          <div>
            <small>
              المتاحة
            </small>

            <strong>
              {availableCount.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Store size={19} />
          </span>

          <div>
            <small>
              المستوردة
            </small>

            <strong>
              {importedCount.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <CircleDollarSign
              size={19}
            />
          </span>

          <div>
            <small>
              إجمالي تكلفة المورد
            </small>

            <strong>
              {formatUsd(
                totalSupplierValue,
              )}
            </strong>
          </div>
        </article>
      </section>

      {loadError && (
        <p
          className={
            styles.error
          }
          role="alert"
        >
          {loadError}
        </p>
      )}

      {importMessage && (
        <p
          className={
            importSuccess
              ? styles.success
              : styles.error
          }
          role="alert"
        >
          {importSuccess ? (
            <CheckCircle2
              size={16}
            />
          ) : (
            <XCircle
              size={16}
            />
          )}

          {importMessage}
        </p>
      )}

      <section className={styles.gameGroups}>
        <header><div><strong>استيراد اللعبة كباقة متكاملة</strong><small>زر واحد ينشئ منتجًا رئيسيًا ويضع تحته كل باقات اللعبة. الصورة والاسم والوصف تُعدّل مرة واحدة.</small></div></header>
        <div>{categoryGroups.map(group=><article key={group.key}><div><strong>{group.name}</strong><small>{group.imported} من {group.total} باقة مضافة · {group.catalogType.toUpperCase()}</small></div>{group.productId&&<a href={`/admin/products/${group.productId}`}>تعديل المنتج والصورة</a>}<button type="button" disabled={importing||group.pending===0} onClick={()=>void handleCategoryImport(group)}>{importingCategoryKey===group.key?<LoaderCircle className={styles.spinner} size={15}/>:<Boxes size={15}/>} {group.pending===0?"مضافة بالكامل":`إضافة ${group.pending} باقة دفعة واحدة`}</button></article>)}</div>
      </section>

      <section
        className={
          styles.toolbar
        }
      >
        <label
          className={
            styles.search
          }
        >
          <Search size={17} />

          <input
            type="search"
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
            placeholder="ابحثي باسم الباقة أو القسم أو ID"
          />
        </label>

        <div
          className={
            styles.filters
          }
        >
          <button
            type="button"
            className={
              catalogFilter ===
              "all"
                ? styles.active
                : ""
            }
            onClick={() =>
              setCatalogFilter(
                "all",
              )
            }
          >
            الكل
          </button>

          <button
            type="button"
            className={
              catalogFilter ===
              "topup"
                ? styles.active
                : ""
            }
            onClick={() =>
              setCatalogFilter(
                "topup",
              )
            }
          >
            <Smartphone
              size={15}
            />
            شحن
          </button>

          <button
            type="button"
            className={
              catalogFilter ===
              "gc"
                ? styles.active
                : ""
            }
            onClick={() =>
              setCatalogFilter(
                "gc",
              )
            }
          >
            <CreditCard
              size={15}
            />
            بطاقات
          </button>
        </div>

        <select
          value={
            selectedCategory
          }
          onChange={(
            event,
          ) =>
            setSelectedCategory(
              event.target
                .value,
            )
          }
        >
          <option value="all">
            كل الأقسام
          </option>

          {categories.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ),
          )}
        </select>

        <select
          value={importFilter}
          onChange={(
            event,
          ) =>
            setImportFilter(
              event.target
                .value as ImportFilter,
            )
          }
        >
          <option value="all">
            كل حالات الاستيراد
          </option>

          <option value="imported">
            تم الاستيراد
          </option>

          <option value="not_imported">
            لم يتم الاستيراد
          </option>
        </select>

        <select
          value={
            availabilityFilter
          }
          onChange={(
            event,
          ) =>
            setAvailabilityFilter(
              event.target
                .value as AvailabilityFilter,
            )
          }
        >
          <option value="all">
            كل حالات التوفر
          </option>

          <option value="available">
            متاحة
          </option>

          <option value="unavailable">
            غير متاحة
          </option>
        </select>
      </section>

      <section
        className={
          styles.summary
        }
      >
        <span>
          <Filter size={14} />

          النتائج:
          <strong>
            {filteredOffers.length.toLocaleString(
              "ar-EG",
            )}
          </strong>
        </span>

        <span>
          غير متاحة:
          <strong>
            {unavailableCount.toLocaleString(
              "ar-EG",
            )}
          </strong>
        </span>

        <span>
          الدولار:
          <strong>
            {formatEgp(
              pricingSettings.usdToEgpRate,
            )}
          </strong>
        </span>

        <span>
          طريقة التسعير:
          <strong>
            {pricingSettings.apiPricingMode ===
            "fixed_usd"
              ? "ربح ثابت"
              : pricingSettings.apiPricingMode ===
                  "percentage"
                ? "نسبة مئوية"
                : "يدوي"}
          </strong>
        </span>
      </section>

      {filteredOffers.length ===
      0 ? (
        <div
          className={
            styles.empty
          }
        >
          <PackageSearch
            size={31}
          />

          <strong>
            لا توجد باقات
          </strong>

          <span>
            جربي تغيير البحث أو
            الفلاتر، أو زامني باقات
            أقسام جديدة.
          </span>
        </div>
      ) : (
        <section
          className={
            styles.grid
          }
        >
          {filteredOffers.map(
            (offer) => {
              const sellingPrice =
                getSellingPrice(
                  offer,
                  pricingSettings,
                );

              const profit =
                sellingPrice -
                offer.price;

              const profitPercent =
                offer.price > 0
                  ? (
                      profit /
                      offer.price
                    ) *
                    100
                  : 0;

              const isThisImporting =
                importing &&
                importingOfferId ===
                  offer.id;

              return (
                <article
                  key={offer.id}
                  className={
                    styles.card
                  }
                >
                  <div
                    className={
                      styles.cardTop
                    }
                  >
                    <span
                      className={
                        styles.icon
                      }
                    >
                      {offer.catalogType ===
                      "topup" ? (
                        <Smartphone
                          size={18}
                        />
                      ) : (
                        <CreditCard
                          size={18}
                        />
                      )}
                    </span>

                    <span
                      className={
                        offer.available
                          ? styles.available
                          : styles.unavailable
                      }
                    >
                      {offer.available ? (
                        <>
                          <CheckCircle2
                            size={13}
                          />
                          متاحة
                        </>
                      ) : (
                        <>
                          <XCircle
                            size={13}
                          />
                          غير متاحة
                        </>
                      )}
                    </span>
                  </div>

                  <div
                    className={
                      styles.copy
                    }
                  >
                    <span>
                      {
                        offer.categoryName
                      }
                    </span>

                    <strong>
                      {offer.name}
                    </strong>

                    <small>
                      Offer ID:{" "}
                      {
                        offer.providerOfferId
                      }
                    </small>
                  </div>

                  <div
                    className={
                      styles.pricing
                    }
                  >
                    <div>
                      <span>
                        سعر المورد
                      </span>

                      <strong>
                        {formatUsd(
                          offer.price,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        سعر البيع المتوقع
                      </span>

                      <strong>
                        {formatUsd(
                          sellingPrice,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        المقابل بالجنيه
                      </span>

                      <strong>
                        {formatEgp(
                          sellingPrice *
                            pricingSettings.usdToEgpRate,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={
                      styles.profit
                    }
                  >
                    <BadgeDollarSign
                      size={17}
                    />

                    <span>
                      <small>
                        الربح المتوقع
                      </small>

                      <strong>
                        {formatUsd(
                          profit,
                        )}
                        {" · "}
                        {profitPercent.toFixed(
                          1,
                        )}
                        %
                      </strong>
                    </span>
                  </div>

                  <div
                    className={
                      styles.meta
                    }
                  >
                    <span>
                      المخزون:
                      <strong>
                        {offer.stock ===
                        null
                          ? "غير محدد"
                          : offer.stock.toLocaleString(
                              "ar-EG",
                            )}
                      </strong>
                    </span>

                    <span>
                      آخر تحديث:
                      <strong>
                        {formatDateTime(
                          offer.lastSyncedAt,
                        )}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      offer.importedToStore
                        ? styles.importedButton
                        : styles.importButton
                    }
                    disabled={
                      offer.importedToStore ||
                      !offer.available ||
                      importing
                    }
                    onClick={() => {
  void handleImport(
    offer,
  );
}}
                  >
                    {isThisImporting ? (
                      <>
                        <LoaderCircle
                          size={16}
                          className={
                            styles.spinner
                          }
                        />

                        جاري الإضافة...
                      </>
                    ) : offer.importedToStore ? (
                      <>
                        <CheckCircle2
                          size={16}
                        />

                        مستوردة للمتجر
                      </>
                    ) : offer.available ? (
                      <>
                        <Store
                          size={16}
                        />

                        إضافة للمتجر
                      </>
                    ) : (
                      <>
                        <XCircle
                          size={16}
                        />

                        غير متاحة
                      </>
                    )}
                  </button>
                </article>
              );
            },
          )}
        </section>
      )}
    </section>
  );
}
