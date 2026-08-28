"use client";

import {
  Search,
  WalletCards,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import type {
  AdminDeposit,
  DepositStatus,
} from "@/types/adminDeposit";

import { DepositCard } from "./DepositCard";
import { DepositDrawer } from "./DepositDrawer";

interface DepositsClientProps {
  deposits: AdminDeposit[];
}

type FilterValue =
  | "all"
  | DepositStatus;

export function DepositsClient({
  deposits,
}: DepositsClientProps) {
  const [selectedDeposit, setSelectedDeposit] =
    useState<AdminDeposit | null>(
      null,
    );

  const [searchText, setSearchText] =
    useState("");

  const [filter, setFilter] =
    useState<FilterValue>("all");

  const filteredDeposits = useMemo(
    () =>
      deposits.filter((deposit) => {
        const matchesFilter =
          filter === "all" ||
          deposit.status === filter;

        const normalizedSearch =
          searchText
            .trim()
            .toLowerCase();

        if (!normalizedSearch) {
          return matchesFilter;
        }

        const searchTarget = [
          deposit.deposit_id,
          deposit.customer_name,
          deposit.customer_id,
          deposit.customer_email,
          deposit.sender_account,
          deposit.transaction_reference,
          deposit.payment_method_name,
          deposit.payment_network,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          matchesFilter &&
          searchTarget.includes(
            normalizedSearch,
          )
        );
      }),
    [deposits, filter, searchText],
  );

  return (
    <>
      <section className="admin-deposit-toolbar">
        <label>
          <Search size={16} />

          <input
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value,
              )
            }
            placeholder="بحث برقم الطلب أو العميل"
          />
        </label>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(
              event.target
                .value as FilterValue,
            )
          }
        >
          <option value="all">
            كل الحالات
          </option>

          <option value="pending">
            بانتظار المراجعة
          </option>

          <option value="under_review">
            قيد المراجعة
          </option>

          <option value="approved">
            تمت الموافقة
          </option>

          <option value="rejected">
            مرفوض
          </option>

          <option value="needs_information">
            مطلوب بيانات
          </option>

          <option value="frozen">
            مجمّد
          </option>
        </select>
      </section>

      {filteredDeposits.length === 0 ? (
        <section className="admin-deposits-empty">
          <WalletCards size={28} />

          <strong>
            لا توجد طلبات مطابقة
          </strong>

          <span>
            جربي تغيير البحث أو الفلتر.
          </span>
        </section>
      ) : (
        <section className="admin-deposits-grid">
          {filteredDeposits.map(
            (deposit) => (
              <DepositCard
                key={deposit.id}
                deposit={deposit}
                onOpen={
                  setSelectedDeposit
                }
              />
            ),
          )}
        </section>
      )}

      <DepositDrawer
        key={selectedDeposit?.id ?? "closed"}
        deposit={selectedDeposit}
        onClose={() =>
          setSelectedDeposit(null)
        }
      />
    </>
  );
}