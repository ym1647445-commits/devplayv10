import {
  CircleDollarSign,
  CreditCard,
  PlugZap,
  Smartphone,
} from "lucide-react";

import {
  CategorySyncButtons,
} from "@/components/admin/api-center/CategorySyncButtons";
import {
  CategoryCatalog,
} from "@/components/admin/api-center/CategoryCatalog";
import {
  getProviderBalance,
} from "@/lib/provider";

import {
  createClient,
} from "@/lib/supabase/server";

interface ProviderCategoryRow {
  id: string;

  provider_name: string;

  catalog_type:
    | "topup"
    | "gc";

  provider_category_id: string;

  name: string;

  provider_category:
    | string
    | null;

  active: boolean;

  offers_count: number;

  last_synced_at: string;

  created_at: string;
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
  ).format(new Date(value));
}

export default async function ApiCenterPage() {
  const supabase =
    await createClient();

  const [
    balanceResult,
    categoriesResult,
  ] = await Promise.allSettled([
    getProviderBalance(),

    supabase
      .from(
        "provider_categories",
      )
      .select(`
        id,
        provider_name,
        catalog_type,
        provider_category_id,
        name,
        provider_category,
        active,
        offers_count,
        last_synced_at,
        created_at
      `)
      .eq(
        "provider_name",
        "flexy",
      )
      .order(
        "name",
        {
          ascending: true,
        },
      )
      .returns<
        ProviderCategoryRow[]
      >(),
  ]);

  const balance =
    balanceResult.status ===
    "fulfilled"
      ? balanceResult.value
      : null;

  const balanceError =
    balanceResult.status ===
    "rejected"
      ? balanceResult.reason instanceof
        Error
        ? balanceResult.reason.message
        : "تعذر قراءة رصيد المورد."
      : null;

  const categoriesResponse =
    categoriesResult.status ===
    "fulfilled"
      ? categoriesResult.value
      : null;

  const categoriesError =
    categoriesResult.status ===
    "rejected"
      ? categoriesResult.reason instanceof
        Error
        ? categoriesResult.reason.message
        : "تعذر قراءة الأقسام المحفوظة."
      : categoriesResponse?.error
        ? categoriesResponse.error.message
        : null;

  const categories =
    categoriesResponse?.data ?? [];

  const topupCategories =
    categories.filter(
      (category) =>
        category.catalog_type ===
        "topup",
    );

  const giftCardCategories =
    categories.filter(
      (category) =>
        category.catalog_type ===
        "gc",
    );

  const activeCategories =
    categories.filter(
      (category) =>
        category.active,
    );

  const connected =
    Boolean(balance);

  const latestSync =
    categories.length > 0
      ? categories.reduce(
          (latest, category) => {
            const categoryTime =
              new Date(
                category.last_synced_at,
              ).getTime();

            const latestTime =
              new Date(
                latest.last_synced_at,
              ).getTime();

            return categoryTime >
              latestTime
              ? category
              : latest;
          },
        ).last_synced_at
      : null;

  return (
    <section
      style={{
        display: "grid",
        gap: 16,

        width: "100%",
        maxWidth: 1250,

        marginInline: "auto",
      }}
    >
      <header
        style={{
          display: "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 5,
          }}
        >
          <span
            style={{
              color:
                "var(--primary)",

              fontSize: 7,
              fontWeight: 900,

              letterSpacing: 1,
            }}
          >
            PROVIDER API CENTER
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: 23,
            }}
          >
            مركز ربط المورد
          </h1>

          <p
            style={{
              margin: 0,

              color:
                "var(--muted)",

              fontSize: 8,
              lineHeight: 1.8,
            }}
          >
            متابعة اتصال Flexy والرصيد
            والأقسام المحفوظة داخل قاعدة
            البيانات.
          </p>
        </div>

        <span
          style={{
            display:
              "inline-flex",

            minHeight: 40,

            alignItems:
              "center",

            gap: 7,

            paddingInline: 12,

            border:
              "1px solid var(--border)",

            borderRadius: 12,

            background:
              "var(--surface)",

            color: connected
              ? "var(--success)"
              : "var(--danger)",

            fontSize: 8,
            fontWeight: 900,

            whiteSpace:
              "nowrap",
          }}
        >
          <PlugZap size={17} />

          {connected
            ? "متصل بالمورد"
            : "الاتصال غير متاح"}
        </span>
      </header>

      <section
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",

          gap: 8,
        }}
      >
        <article
          style={{
            display: "flex",

            minHeight: 82,

            alignItems:
              "center",

            gap: 9,
            padding: 11,

            border:
              "1px solid var(--border)",

            borderRadius: 15,

            background:
              "var(--surface)",
          }}
        >
          <span
            style={{
              display: "grid",

              width: 39,
              height: 39,

              placeItems:
                "center",

              borderRadius: 12,

              background:
                "var(--primary-soft)",

              color:
                "var(--primary)",
            }}
          >
            <PlugZap size={19} />
          </span>

          <div
            style={{
              display: "grid",
              gap: 5,
            }}
          >
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize: 6,
              }}
            >
              حالة الاتصال
            </small>

            <strong
              style={{
                fontSize: 14,

                color: connected
                  ? "var(--success)"
                  : "var(--danger)",
              }}
            >
              {connected
                ? "Connected"
                : "Disconnected"}
            </strong>
          </div>
        </article>

        <article
          style={{
            display: "flex",

            minHeight: 82,

            alignItems:
              "center",

            gap: 9,
            padding: 11,

            border:
              "1px solid var(--border)",

            borderRadius: 15,

            background:
              "var(--surface)",
          }}
        >
          <span
            style={{
              display: "grid",

              width: 39,
              height: 39,

              placeItems:
                "center",

              borderRadius: 12,

              background:
                "var(--primary-soft)",

              color:
                "var(--primary)",
            }}
          >
            <CircleDollarSign
              size={19}
            />
          </span>

          <div
            style={{
              display: "grid",
              gap: 5,
            }}
          >
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize: 6,
              }}
            >
              رصيد المورد
            </small>

            <strong
              style={{
                fontSize: 14,
              }}
            >
              {balance
                ? `${Number(
                    balance.balance,
                  ).toFixed(2)} ${
                    balance.currency
                  }`
                : "غير متاح"}
            </strong>
          </div>
        </article>

        <article
          style={{
            display: "flex",

            minHeight: 82,

            alignItems:
              "center",

            gap: 9,
            padding: 11,

            border:
              "1px solid var(--border)",

            borderRadius: 15,

            background:
              "var(--surface)",
          }}
        >
          <span
            style={{
              display: "grid",

              width: 39,
              height: 39,

              placeItems:
                "center",

              borderRadius: 12,

              background:
                "var(--primary-soft)",

              color:
                "var(--primary)",
            }}
          >
            <Smartphone
              size={19}
            />
          </span>

          <div
            style={{
              display: "grid",
              gap: 5,
            }}
          >
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize: 6,
              }}
            >
              أقسام الشحن
            </small>

            <strong
              style={{
                fontSize: 14,
              }}
            >
              {topupCategories.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article
          style={{
            display: "flex",

            minHeight: 82,

            alignItems:
              "center",

            gap: 9,
            padding: 11,

            border:
              "1px solid var(--border)",

            borderRadius: 15,

            background:
              "var(--surface)",
          }}
        >
          <span
            style={{
              display: "grid",

              width: 39,
              height: 39,

              placeItems:
                "center",

              borderRadius: 12,

              background:
                "var(--primary-soft)",

              color:
                "var(--primary)",
            }}
          >
            <CreditCard
              size={19}
            />
          </span>

          <div
            style={{
              display: "grid",
              gap: 5,
            }}
          >
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize: 6,
              }}
            >
              بطاقات الهدايا
            </small>

            <strong
              style={{
                fontSize: 14,
              }}
            >
              {giftCardCategories.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>
      </section>

      <CategorySyncButtons />

      {balanceError && (
        <p
          style={{
            margin: 0,
            padding: 10,

            border:
              "1px solid var(--danger)",

            borderRadius: 11,

            color:
              "var(--danger)",

            fontSize: 8,
          }}
        >
          خطأ الرصيد:{" "}
          {balanceError}
        </p>
      )}

      {categoriesError && (
        <p
          style={{
            margin: 0,
            padding: 10,

            border:
              "1px solid var(--danger)",

            borderRadius: 11,

            color:
              "var(--danger)",

            fontSize: 8,
          }}
        >
          خطأ الأقسام المحفوظة:{" "}
          {categoriesError}
        </p>
      )}

      {balance && (
        <section
          style={{
            display: "grid",
            gap: 10,

            padding: 13,

            border:
              "1px solid var(--border)",

            borderRadius: 15,

            background:
              "var(--surface)",
          }}
        >
          <header
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 8,

              paddingBottom: 10,

              borderBottom:
                "1px solid var(--border)",
            }}
          >
            <CircleDollarSign
              size={18}
              color="var(--primary)"
            />

            <div
              style={{
                display: "grid",
                gap: 4,
              }}
            >
              <strong
                style={{
                  fontSize: 10,
                }}
              >
                بيانات حساب المورد
              </strong>

              <small
                style={{
                  color:
                    "var(--muted)",

                  fontSize: 7,
                }}
              >
                بيانات الرصيد القادمة
                مباشرة من Flexy.
              </small>
            </div>
          </header>

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",

              gap: 7,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 4,

                padding: 10,

                border:
                  "1px solid var(--border)",

                borderRadius: 10,

                background:
                  "var(--surface-soft)",
              }}
            >
              <span
                style={{
                  color:
                    "var(--muted)",

                  fontSize: 6,
                }}
              >
                اسم الحساب
              </span>

              <strong
                style={{
                  fontSize: 9,
                }}
              >
                {balance.clientName}
              </strong>
            </div>

            <div
              style={{
                display: "grid",
                gap: 4,

                padding: 10,

                border:
                  "1px solid var(--border)",

                borderRadius: 10,

                background:
                  "var(--surface-soft)",
              }}
            >
              <span
                style={{
                  color:
                    "var(--muted)",

                  fontSize: 6,
                }}
              >
                الرصيد
              </span>

              <strong
                style={{
                  fontSize: 9,
                }}
              >
                {Number(
                  balance.balance,
                ).toFixed(2)}
              </strong>
            </div>

            <div
              style={{
                display: "grid",
                gap: 4,

                padding: 10,

                border:
                  "1px solid var(--border)",

                borderRadius: 10,

                background:
                  "var(--surface-soft)",
              }}
            >
              <span
                style={{
                  color:
                    "var(--muted)",

                  fontSize: 6,
                }}
              >
                العملة
              </span>

              <strong
                style={{
                  fontSize: 9,
                }}
              >
                {balance.currency}
              </strong>
            </div>

            <div
              style={{
                display: "grid",
                gap: 4,

                padding: 10,

                border:
                  "1px solid var(--border)",

                borderRadius: 10,

                background:
                  "var(--surface-soft)",
              }}
            >
              <span
                style={{
                  color:
                    "var(--muted)",

                  fontSize: 6,
                }}
              >
                آخر مزامنة
              </span>

              <strong
                style={{
                  fontSize: 8,
                }}
              >
                {latestSync
                  ? formatDateTime(
                      latestSync,
                    )
                  : "لم تتم المزامنة"}
              </strong>
            </div>
          </div>
        </section>
      )}

            <CategoryCatalog
        categories={categories}
      />
    </section>
  );
}