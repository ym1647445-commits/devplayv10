"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Gift,
  History,
  RotateCcw,
  Search,
  Settings2,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import type {
  WalletTransaction,
  WalletTransactionType,
} from "@/types/walletTransaction";

import styles from "./TransactionsHistory.module.css";

interface TransactionsHistoryProps {
  transactions: WalletTransaction[];
}

type TransactionFilter =
  | "all"
  | WalletTransactionType;

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

function formatDate(
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

function getTransactionLabel(
  type: WalletTransactionType,
  referenceType?: string | null,
): string {
  if (referenceType === "wallet_transfer_sent") return "إرسال رصيد";
  if (referenceType === "wallet_transfer_received") return "استلام رصيد";
  const labels: Record<
    WalletTransactionType,
    string
  > = {
    deposit: "إضافة رصيد",
    purchase: "شراء منتج",
    refund: "استرداد",
    reward: "مكافأة",
    adjustment: "تعديل إداري",
    freeze: "تجميد رصيد",
    unfreeze: "فك تجميد",
  };

  return labels[type];
}

function isCreditTransaction(
  type: WalletTransactionType,
  referenceType?: string | null,
): boolean {
  if (referenceType === "wallet_transfer_received") return true;
  if (referenceType === "wallet_transfer_sent") return false;
  return [
    "deposit",
    "refund",
    "reward",
    "unfreeze",
  ].includes(type);
}

function getTransactionIcon(
  type: WalletTransactionType,
  referenceType?: string | null,
) {
  if (referenceType === "wallet_transfer_received") return ArrowDownLeft;
  if (referenceType === "wallet_transfer_sent") return ArrowUpRight;
  if (type === "deposit") {
    return ArrowDownLeft;
  }

  if (type === "purchase") {
    return ArrowUpRight;
  }

  if (type === "refund") {
    return RotateCcw;
  }

  if (type === "reward") {
    return Gift;
  }

  return Settings2;
}

export function TransactionsHistory({
  transactions,
}: TransactionsHistoryProps) {
  const [filter, setFilter] =
    useState<TransactionFilter>(
      "all",
    );

  const [searchText, setSearchText] =
    useState("");

  const filteredTransactions =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {
          const matchesFilter =
            filter === "all" ||
            transaction.type === filter;

          if (!matchesFilter) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            transaction.referenceNumber,
            transaction.referenceType,
            transaction.description,
            getTransactionLabel(
              transaction.type,
              transaction.referenceType,
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      filter,
      searchText,
      transactions,
    ]);

  const filters: {
    value: TransactionFilter;
    label: string;
  }[] = [
    {
      value: "all",
      label: "الكل",
    },
    {
      value: "deposit",
      label: "إيداع",
    },
    {
      value: "purchase",
      label: "شراء",
    },
    {
      value: "refund",
      label: "استرداد",
    },
    {
      value: "reward",
      label: "مكافآت",
    },
  ];

  return (
    <section className={styles.wrapper}>
      <div className={styles.filters}>
        {filters.map((item) => {
          const count =
            item.value === "all"
              ? transactions.length
              : transactions.filter(
                  (transaction) =>
                    transaction.type ===
                    item.value,
                ).length;

          return (
            <button
              type="button"
              key={item.value}
              className={
                filter === item.value
                  ? styles.activeFilter
                  : ""
              }
              onClick={() =>
                setFilter(item.value)
              }
            >
              <span>
                {item.label}
              </span>

              <strong>
                {count}
              </strong>
            </button>
          );
        })}
      </div>

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
          placeholder="بحث برقم الطلب أو نوع العملية"
        />
      </label>

      {filteredTransactions.length ===
      0 ? (
        <section className={styles.empty}>
          <span>
            <History size={31} />
          </span>

          <h2>
            لا توجد عمليات
          </h2>

          <p>
            عمليات الإيداع والشراء
            والاسترداد ستظهر هنا.
          </p>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredTransactions.map(
            (transaction) => {
              const Icon =
                getTransactionIcon(
                  transaction.type,
                  transaction.referenceType,
                );

              const credit =
                isCreditTransaction(
                  transaction.type,
                  transaction.referenceType,
                );

              return (
                <article
                  className={
                    styles.card
                  }
                  key={transaction.id}
                >
                  <div
                    className={`${styles.icon} ${
                      credit
                        ? styles.creditIcon
                        : styles.debitIcon
                    }`}
                  >
                    <Icon size={19} />
                  </div>

                  <div
                    className={
                      styles.copy
                    }
                  >
                    <div
                      className={
                        styles.topRow
                      }
                    >
                      <strong>
                        {getTransactionLabel(
                          transaction.type,
                          transaction.referenceType,
                        )}
                      </strong>

                      <span
                        className={
                          credit
                            ? styles.creditAmount
                            : styles.debitAmount
                        }
                      >
                        {credit
                          ? "+"
                          : "-"}
                        {formatUsd(
                          transaction.amountUsd,
                        )}
                      </span>
                    </div>

                    <a href={`/api/wallet/statement?transactionId=${transaction.id}`}>
                      تنزيل إيصال PDF
                    </a>

                    <span
                      className={
                        styles.description
                      }
                    >
                      {transaction.description ||
                        "عملية على محفظة DevPlay"}
                    </span>

                    <div
                      className={
                        styles.meta
                      }
                    >
                      <span>
                        {formatDate(
                          transaction.createdAt,
                        )}
                      </span>

                      {transaction.referenceNumber && (
                        <span>
                          {
                            transaction.referenceNumber
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={
                      styles.details
                    }
                  >
                    <div>
                      <span>
                        قبل العملية
                      </span>

                      <strong>
                        {formatUsd(
                          transaction.balanceBeforeUsd,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        بعد العملية
                      </span>

                      <strong>
                        {formatUsd(
                          transaction.balanceAfterUsd,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        المقابل بالجنيه
                      </span>

                      <strong>
                        {formatEgp(
                          transaction.amountEgpSnapshot,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        سعر التحويل
                      </span>

                      <strong>
                        {Number(
                          transaction.exchangeRate,
                        ).toFixed(2)}{" "}
                        ج.م
                      </strong>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      <section className={styles.info}>
        <CircleDollarSign size={19} />

        <p>
          المبلغ داخل سجل المحفظة يُخزن
          موجبًا، ونوع العملية هو الذي
          يحدد إذا كانت إضافة أو خصمًا.
        </p>
      </section>
    </section>
  );
}
