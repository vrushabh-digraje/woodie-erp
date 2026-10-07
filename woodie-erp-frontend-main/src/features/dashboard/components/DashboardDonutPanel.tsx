import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colors } from "../../../theme/colors";

type Slice = { name: string; value: number; fill: string };

function DonutBlock({ title, subtitle, data }: { title: string; subtitle: string; data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const active = data.filter((d) => d.value > 0);

  return (
    <div className="dashboard-card flex flex-1 flex-col p-5">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
      </div>

      {total === 0 ? (
        <p className="mt-10 flex flex-1 items-center justify-center text-sm text-text-muted">No data yet</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative h-[148px] w-[148px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={active}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  stroke={colors.surface.card}
                  strokeWidth={2}
                >
                  {active.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.surface.card,
                    border: `1px solid ${colors.surface.borderLight}`,
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(26,29,33,0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Total</span>
              <span className="text-xl font-semibold text-text-primary">{total}</span>
            </div>
          </div>

          <ul className="w-full space-y-2 sm:max-w-[200px]">
            {active.map((s) => {
              const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
              return (
                <li key={s.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-text-secondary">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.fill }} />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-text-primary">
                    {s.value}
                    <span className="ml-1 font-normal text-text-muted">({pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

type DashboardDonutPanelProps = {
  worksData: Slice[];
  categoryData: Slice[];
};

export default function DashboardDonutPanel({ worksData, categoryData }: DashboardDonutPanelProps) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DonutBlock title="Works overview" subtitle="Inquiry stages in your pipeline" data={worksData} />
      <DonutBlock title="Category breakdown" subtitle="Distribution by work status" data={categoryData} />
    </section>
  );
}
