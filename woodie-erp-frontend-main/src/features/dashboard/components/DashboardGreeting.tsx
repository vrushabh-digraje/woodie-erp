import { Calendar, ChevronDown, MapPin } from "lucide-react";
import { COLORS } from "../../../constants/colors";
import { panelSurface } from "../../../constants/surfaces";
import type { AuthUser } from "../../auth/authTypes";
import { roleLabel } from "../../auth/permissions";

export type DashboardPeriod = "month" | "year" | "all";

type DashboardGreetingProps = {
  user: AuthUser;
  location: string;
  period: DashboardPeriod;
  locations: string[];
  onLocationChange: (location: string) => void;
  onPeriodChange: (period: DashboardPeriod) => void;
};

export default function DashboardGreeting({
  user,
  location,
  period,
  locations,
  onLocationChange,
  onPeriodChange,
}: DashboardGreetingProps) {
  const firstName = user.name?.trim().split(/\s+/)[0] ?? "there";
  const role = roleLabel(user.role);

  const filterStyle = {
    ...panelSurface(),
    paddingLeft: 36,
    paddingRight: 36,
    color: COLORS.text.primary,
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-1 h-9 w-[3px] shrink-0 rounded-full"
          style={{ backgroundColor: COLORS.brand }}
          aria-hidden
        />
        <div className="min-w-0">
          <h2
            className="mt-0.5 text-xl font-bold tracking-tight sm:text-[1.65rem] sm:leading-tight"
            style={{ color: COLORS.sidebar.bg }}
          >
            Welcome back, {firstName}
          </h2>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: COLORS.text.secondary }}>
            {role} · Here&apos;s your business overview
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Filter by location</span>
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: COLORS.brand }}
          />
          <select
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="appearance-none py-2 pl-9 pr-8 text-xs font-semibold outline-none"
            style={filterStyle}
          >
            <option value="all">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: COLORS.text.muted }}
          />
        </label>
        <label className="relative">
          <span className="sr-only">Filter by period</span>
          <Calendar
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: COLORS.brand }}
          />
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as DashboardPeriod)}
            className="appearance-none py-2 pl-9 pr-8 text-xs font-semibold outline-none"
            style={filterStyle}
          >
            <option value="year">This year</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: COLORS.text.muted }}
          />
        </label>
      </div>
    </div>
  );
}
