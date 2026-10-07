import type { ReactNode } from "react";
import { COLORS } from "../../../constants/colors";

type DashboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function DashboardSectionHeader({ title, subtitle, action }: DashboardSectionHeaderProps) {
  return (
    <div
      className="mb-3 flex items-center justify-between gap-3 border-b pb-2.5"
      style={{ borderColor: COLORS.page.cardBorder }}
    >
      <div className="min-w-0 border-l-[3px] pl-2.5" style={{ borderColor: COLORS.brand }}>
        <h3 className="text-[15px] font-bold tracking-tight" style={{ color: COLORS.text.primary }}>
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px]" style={{ color: COLORS.text.muted }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
