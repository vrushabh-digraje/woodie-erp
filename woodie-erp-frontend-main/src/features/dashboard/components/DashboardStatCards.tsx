import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { AppStatCard } from "../../../components/ui/AppStatCard";

export type StatCardData = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  to?: string;
};

type DashboardStatCardsProps = {
  cards: StatCardData[];
};

export default function DashboardStatCards({ cards }: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const body = (
          <AppStatCard
            title={card.title}
            value={card.value}
            subtitle={card.hint}
            icon={card.icon}
            iconIndex={index}
          />
        );

        if (card.to) {
          return (
            <Link key={card.title} to={card.to} className="group block h-full">
              {body}
            </Link>
          );
        }

        return <div key={card.title} className="h-full">{body}</div>;
      })}
    </div>
  );
}
