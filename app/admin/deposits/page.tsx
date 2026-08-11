import {
  DepositsClient,
  DepositStats,
} from "@/components/admin/deposits";

import { getDeposits } from "./actions";

export default async function AdminDepositsPage() {
  const deposits =
    await getDeposits();

  return (
    <section className="admin-deposits-page">
      <header className="admin-deposits-heading">
        <div>
          <span>
            العمليات المالية
          </span>

          <h1>
            طلبات الإيداع
          </h1>

          <p>
            مراجعة إثباتات التحويل واعتماد
            أو رفض طلبات إضافة الرصيد.
          </p>
        </div>

        <strong>
          {deposits.length.toLocaleString(
            "ar-EG",
          )}{" "}
          طلب
        </strong>
      </header>

      <DepositStats
        deposits={deposits}
      />

      <DepositsClient
        deposits={deposits}
      />
    </section>
  );
}