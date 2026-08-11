import { CheckCircle2, Clock3, Eye, XCircle } from "lucide-react";

import { AdminDeposit } from "@/types/adminDeposit";

interface Props {
  deposits: AdminDeposit[];
}

export function DepositStats({
  deposits,
}: Props) {
  const pending = deposits.filter(
    (d) => d.status === "pending",
  ).length;

  const review = deposits.filter(
    (d) => d.status === "under_review",
  ).length;

  const approved = deposits.filter(
    (d) => d.status === "approved",
  ).length;

  const rejected = deposits.filter(
    (d) => d.status === "rejected",
  ).length;

  const cards = [
    {
      title: "قيد الانتظار",
      value: pending,
      icon: Clock3,
    },
    {
      title: "قيد المراجعة",
      value: review,
      icon: Eye,
    },
    {
      title: "تمت الموافقة",
      value: approved,
      icon: CheckCircle2,
    },
    {
      title: "مرفوضة",
      value: rejected,
      icon: XCircle,
    },
  ];

  return (
    <section className="depositStats">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article key={card.title}>
            <Icon size={20} />

            <strong>{card.value}</strong>

            <span>{card.title}</span>
          </article>
        );
      })}
    </section>
  );
}