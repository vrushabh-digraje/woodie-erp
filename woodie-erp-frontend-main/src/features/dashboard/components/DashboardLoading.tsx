import { COLORS } from "../../../constants/colors";
import { panelSurface } from "../../../constants/surfaces";

const panelStyle = panelSurface();

export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="mt-1 h-9 w-[3px] rounded-full" style={{ backgroundColor: COLORS.brand }} />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded" style={{ backgroundColor: COLORS.page.cardBorder }} />
            <div className="h-7 w-52 rounded" style={{ backgroundColor: COLORS.page.cardBorder }} />
            <div className="h-3 w-64 rounded" style={{ backgroundColor: COLORS.page.cardBorder }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-[10px]" style={{ backgroundColor: COLORS.page.cardBorder }} />
          <div className="h-9 w-28 rounded-[10px]" style={{ backgroundColor: COLORS.page.cardBorder }} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-h-[84px] p-3" style={panelStyle} />
        ))}
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="min-h-[320px]" style={panelStyle} />
          <div className="min-h-[320px]" style={panelStyle} />
        </div>
        <div className="min-h-[240px]" style={panelStyle} />
      </div>
    </div>
  );
}
