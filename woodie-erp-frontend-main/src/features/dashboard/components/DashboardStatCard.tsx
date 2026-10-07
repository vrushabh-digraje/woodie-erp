import type { LucideIcon } from "lucide-react";
import { colors } from "../../../theme/colors";
import { themeClasses } from "../../../theme/classes";

type DashboardStatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
};

function DashboardStatCard({ title, value, icon: Icon }: DashboardStatCardProps) {
  return (
    <article className={`${themeClasses.card} p-5`}>
      <div className="flex items-center gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.brand.primaryLight, color: colors.brand.primary }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-text-muted">{title}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-text-primary">{value}</p>
        </div>
      </div>
    </article>
  );
}

export default DashboardStatCard;
