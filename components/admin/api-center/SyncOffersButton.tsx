"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { syncCategoryOffers } from "@/app/admin/api-center/actions";

interface Props {
  categoryId: string;
  type: "topup" | "gc";
}

export function SyncOffersButton({
  categoryId,
  type,
}: Props) {
  const [loading, start] =
    useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          const result =
            await syncCategoryOffers(
              categoryId,
              type,
            );

          alert(result.message);
        })
      }
      disabled={loading}
      style={{
        marginTop: 8,
        display: "flex",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        background:
          "var(--primary)",
        color: "#fff",
        fontWeight: 700,
      }}
    >
      <RefreshCw
        size={16}
        className={
          loading ? "spin" : ""
        }
      />

      {loading
        ? "جارى المزامنة..."
        : "مزامنة الباقات"}
    </button>
  );
}