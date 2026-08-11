"use client";

import {
  CalendarClock,
  ChevronLeft,
  ImageIcon,
  WalletCards,
} from "lucide-react";

import type {
  AdminDeposit,
  DepositStatus,
} from "@/types/adminDeposit";

import styles from "./DepositCard.module.css";

interface DepositCardProps {
  deposit: AdminDeposit;
  onOpen: (
    deposit: AdminDeposit,
  ) => void;
}

function getStatusLabel(
  status: DepositStatus,
): string {
  const labels: Record<
    DepositStatus,
    string
  > = {
    pending: "بانتظار المراجعة",
    under_review: "قيد المراجعة",
    approved: "تمت الموافقة",
    rejected: "مرفوض",
    needs_information: "مطلوب بيانات",
    frozen: "مجمّد",
    cancelled: "ملغي",
  };

  return labels[status];
}

function formatRequestedAmount(
  deposit: AdminDeposit,
): string {
  if (
    deposit.requested_currency === "USD"
  ) {
    return `${deposit.requested_amount.toFixed(
      2,
    )} USDT`;
  }

  return `${deposit.requested_amount.toLocaleString(
    "ar-EG",
    {
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
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export function DepositCard({
  deposit,
  onOpen,
}: DepositCardProps) {
  return (
    <article className={styles.card}>
      <button
        className={styles.mainButton}
        type="button"
        onClick={() => onOpen(deposit)}
      >
        <span className={styles.thumbnail}>
          {deposit.proof_url ? (
            <img
              src={deposit.proof_url}
              alt=""
            />
          ) : (
            <ImageIcon size={18} />
          )}
        </span>

        <span className={styles.copy}>
          <span className={styles.topLine}>
            <strong>
              {deposit.deposit_id}
            </strong>

            <span
              className={`${styles.status} ${
                styles[deposit.status]
              }`}
            >
              {getStatusLabel(
                deposit.status,
              )}
            </span>
          </span>

          <strong
            className={styles.customerName}
          >
            {deposit.customer_name ||
              "عميل DevPlay"}
          </strong>

          <span className={styles.method}>
            <WalletCards size={12} />

            {deposit.payment_method_name}

            {deposit.payment_network
              ? ` — ${deposit.payment_network}`
              : ""}
          </span>
        </span>

        <span className={styles.side}>
          <strong>
            {formatRequestedAmount(
              deposit,
            )}
          </strong>

          <small>
            ≈ $
            {deposit.credit_usd.toFixed(
              4,
            )}
          </small>

          <ChevronLeft size={15} />
        </span>
      </button>

      <footer className={styles.footer}>
        <span>
          <CalendarClock size={12} />

          {formatDate(
            deposit.created_at,
          )}
        </span>

        <button
          type="button"
          onClick={() =>
            onOpen(deposit)
          }
        >
          عرض التفاصيل
        </button>
      </footer>
    </article>
  );
}