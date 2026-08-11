"use client";

import {
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Smartphone,
} from "lucide-react";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  syncProviderCategories,
} from "@/app/admin/api-center/actions";

import type {
  ProviderCatalogType,
} from "@/lib/provider";

import styles from "./CategorySyncButtons.module.css";

interface SyncResult {
  type:
    ProviderCatalogType;

  success: boolean;
  message: string;

  found?: number;
  created?: number;
  updated?: number;
}

export function CategorySyncButtons() {
  const router =
    useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [
    currentType,
    setCurrentType,
  ] =
    useState<
      ProviderCatalogType | null
    >(null);

  const [
    result,
    setResult,
  ] =
    useState<SyncResult | null>(
      null,
    );

  function handleSync(
    type:
      ProviderCatalogType,
  ): void {
    if (pending) {
      return;
    }

    setCurrentType(type);
    setResult(null);

    startTransition(
      async () => {
        const response =
          await syncProviderCategories(
            type,
          );

        setResult({
          type,
          ...response,
        });

        setCurrentType(null);

        if (
          response.success
        ) {
          router.refresh();
        }
      },
    );
  }

  return (
    <section
      className={styles.wrapper}
    >
      <div
        className={
          styles.buttons
        }
      >
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            handleSync(
              "topup",
            )
          }
        >
          {pending &&
          currentType ===
            "topup" ? (
            <LoaderCircle
              className={
                styles.spinner
              }
              size={17}
            />
          ) : (
            <Smartphone
              size={17}
            />
          )}

          مزامنة أقسام الشحن
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            handleSync("gc")
          }
        >
          {pending &&
          currentType ===
            "gc" ? (
            <LoaderCircle
              className={
                styles.spinner
              }
              size={17}
            />
          ) : (
            <CreditCard
              size={17}
            />
          )}

          مزامنة بطاقات الهدايا
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setResult(null);
            router.refresh();
          }}
        >
          <RefreshCw
            size={17}
          />

          تحديث العرض
        </button>
      </div>

      {result && (
        <div
          className={`${styles.result} ${
            result.success
              ? styles.success
              : styles.error
          }`}
          role="status"
        >
          <strong>
            {result.message}
          </strong>

          {result.success && (
            <span>
              موجود:{" "}
              {Number(
                result.found ??
                  0,
              ).toLocaleString(
                "ar-EG",
              )}
              {" · "}
              جديد:{" "}
              {Number(
                result.created ??
                  0,
              ).toLocaleString(
                "ar-EG",
              )}
              {" · "}
              محدث:{" "}
              {Number(
                result.updated ??
                  0,
              ).toLocaleString(
                "ar-EG",
              )}
            </span>
          )}
        </div>
      )}
    </section>
  );
}