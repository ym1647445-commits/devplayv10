import {
  ArrowRight,
  History,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { TransactionsHistory } from "@/components/wallet/TransactionsHistory";
import { createClient } from "@/lib/supabase/server";
import type {
  WalletTransaction,
  WalletTransactionType,
} from "@/types/walletTransaction";

interface TransactionRow {
  id: string;

  type: WalletTransactionType;

  amount_usd: number | string;

  balance_before_usd:
    | number
    | string;

  balance_after_usd:
    | number
    | string;

  exchange_rate:
    | number
    | string;

  amount_egp_snapshot:
    | number
    | string;

  reference_type:
    | string
    | null;

  reference_id:
    | string
    | null;

  description:
    | string
    | null;

  created_at: string;
}

interface ProductOrderReference {
  id: string;
  order_id: string;
}

interface DepositReference {
  id: string;
  deposit_id: string;
}

export default async function WalletTransactionsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const {
    data: transactionRows,
    error: transactionsError,
  } = await supabase
    .from(
      "account_wallet_transactions",
    )
    .select(`
      id,
      type,
      amount_usd,
      balance_before_usd,
      balance_after_usd,
      exchange_rate,
      amount_egp_snapshot,
      reference_type,
      reference_id,
      description,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .returns<TransactionRow[]>();

  if (transactionsError) {
    console.error(
      "Failed to load wallet transactions:",
      transactionsError,
    );
  }

  const safeRows =
    transactionRows ?? [];

  const productOrderIds = [
    ...new Set(
      safeRows
        .filter(
          (row) =>
            row.reference_type ===
              "product_order" &&
            row.reference_id,
        )
        .map(
          (row) =>
            row.reference_id!,
        ),
    ),
  ];

  const depositIds = [
    ...new Set(
      safeRows
        .filter(
          (row) =>
            row.reference_type ===
              "deposit_request" &&
            row.reference_id,
        )
        .map(
          (row) =>
            row.reference_id!,
        ),
    ),
  ];

  const [
    productOrdersResult,
    depositsResult,
  ] = await Promise.all([
    productOrderIds.length > 0
      ? supabase
          .from("product_orders")
          .select(`
            id,
            order_id
          `)
          .in(
            "id",
            productOrderIds,
          )
          .returns<
            ProductOrderReference[]
          >()
      : Promise.resolve({
          data:
            [] as ProductOrderReference[],
          error: null,
        }),

    depositIds.length > 0
      ? supabase
          .from("deposit_requests")
          .select(`
            id,
            deposit_id
          `)
          .in("id", depositIds)
          .returns<
            DepositReference[]
          >()
      : Promise.resolve({
          data:
            [] as DepositReference[],
          error: null,
        }),
  ]);

  const productOrderMap =
    new Map(
      (
        productOrdersResult.data ??
        []
      ).map((order) => [
        order.id,
        order.order_id,
      ]),
    );

  const depositMap =
    new Map(
      (
        depositsResult.data ?? []
      ).map((deposit) => [
        deposit.id,
        deposit.deposit_id,
      ]),
    );

  const transactions: WalletTransaction[] =
    safeRows.map(
      (
        row,
      ): WalletTransaction => {
        let referenceNumber:
          | string
          | null = null;

        if (
          row.reference_type ===
            "product_order" &&
          row.reference_id
        ) {
          referenceNumber =
            productOrderMap.get(
              row.reference_id,
            ) ?? null;
        }

        if (
          row.reference_type ===
            "deposit_request" &&
          row.reference_id
        ) {
          referenceNumber =
            depositMap.get(
              row.reference_id,
            ) ?? null;
        }

        return {
          id: row.id,

          type: row.type,

          amountUsd: Number(
            row.amount_usd,
          ),

          balanceBeforeUsd:
            Number(
              row.balance_before_usd,
            ),

          balanceAfterUsd:
            Number(
              row.balance_after_usd,
            ),

          exchangeRate: Number(
            row.exchange_rate,
          ),

          amountEgpSnapshot:
            Number(
              row.amount_egp_snapshot,
            ),

          referenceType:
            row.reference_type,

          referenceId:
            row.reference_id,

          referenceNumber,

          description:
            row.description,

          createdAt:
            row.created_at,
        };
      },
    );

  const totalAdded = transactions
    .filter(
      (transaction) =>
        transaction.type ===
        "deposit",
    )
    .reduce(
      (total, transaction) =>
        total +
        transaction.amountUsd,
      0,
    );

  const totalSpent = transactions
    .filter(
      (transaction) =>
        transaction.type ===
        "purchase",
    )
    .reduce(
      (total, transaction) =>
        total +
        transaction.amountUsd,
      0,
    );

  return (
    <AppShell>
      <section className="wallet-transactions-page">
        <header className="wallet-transactions-heading">
          <div>
            <span>
              حركة المحفظة
            </span>

            <h1>
              سجل العمليات
            </h1>

            <p>
              كل إضافات الرصيد والمشتريات
              والاستردادات في مكان واحد.
            </p>
          </div>

          <Link href="/wallet">
            <ArrowRight size={16} />
            المحفظة
          </Link>
        </header>

        <section className="wallet-transactions-overview">
          <article>
            <WalletCards size={18} />

            <span>
              <small>
                إجمالي المضاف
              </small>

              <strong>
                $
                {totalAdded.toFixed(4)}
              </strong>
            </span>
          </article>

          <article>
            <History size={18} />

            <span>
              <small>
                إجمالي المشتريات
              </small>

              <strong>
                $
                {totalSpent.toFixed(4)}
              </strong>
            </span>
          </article>

          <article>
            <History size={18} />

            <span>
              <small>
                عدد العمليات
              </small>

              <strong>
                {transactions.length.toLocaleString(
                  "ar-EG",
                )}
              </strong>
            </span>
          </article>
        </section>

        <TransactionsHistory
          transactions={transactions}
        />
      </section>
    </AppShell>
  );
}