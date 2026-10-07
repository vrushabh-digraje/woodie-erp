import type { ComponentType } from "react";
import { CARD_ICONS, COLORS } from "../../constants/colors";
import { RADIUS, statCardSurface } from "../../constants/surfaces";

export type AppStatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  iconIndex?: number;
  valueClassName?: string;
};

export function AppStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconIndex = 0,
  valueClassName = "",
}: AppStatCardProps) {
  const iconTheme = CARD_ICONS[iconIndex % CARD_ICONS.length];

  return (
    <article
      className={`relative flex flex-col transition-colors hover:bg-[#f8fafc] ${
        Icon ? "min-h-[84px] p-3" : "min-h-[72px] p-3"
      }`}
      style={statCardSurface()}
    >
      {Icon ? (
        <span
          className="mb-2 flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            backgroundColor: iconTheme.bg,
            borderRadius: RADIUS.icon,
            color: COLORS.sidebar.bg,
          }}
        >
          <Icon className="h-[15px] w-[15px]" />
        </span>
      ) : null}
      <p
        className="text-[9px] font-bold uppercase tracking-[0.1em]"
        style={{ color: COLORS.text.secondary }}
      >
        {title}
      </p>
      <p
        className={`mt-0.5 line-clamp-2 text-xl font-bold leading-tight tabular-nums ${valueClassName}`.trim()}
        style={valueClassName ? undefined : { color: COLORS.sidebar.bg }}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 line-clamp-1 text-[10px] font-medium" style={{ color: COLORS.text.muted }}>
          {subtitle}
        </p>
      ) : null}
    </article>
  );
}
