import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors } from "../../../theme/colors";
import { themeClasses } from "../../../theme/classes";
import { MONTHLY_INQUIRY_TREND } from "../dashboardChartData";

type ChartSlice = { name: string; value: number; fill: string };

type DashboardChartsProps = {
  inquiryData: ChartSlice[];
  boqData: ChartSlice[];
  showMonthlyTrend?: boolean;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl bg-surface-muted text-sm text-text-muted">
      {message}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className={themeClasses.cardPadding}>
      <div className="mb-5">
        <h3 className={themeClasses.chartTitle}>{title}</h3>
        {subtitle ? <p className={`mt-1 ${themeClasses.chartSubtitle}`}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DashboardCharts({ inquiryData, boqData, showMonthlyTrend = true }: DashboardChartsProps) {
  const inquiryTotal = inquiryData.reduce((s, d) => s + d.value, 0);
  const boqTotal = boqData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">
      {showMonthlyTrend ? (
        <ChartCard title="Inquiry & BOQ trend" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={MONTHLY_INQUIRY_TREND} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.surface.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: colors.text.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: colors.text.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.surface.card,
                  border: `1px solid ${colors.surface.border}`,
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.text.muted }} />
              <Line
                type="monotone"
                dataKey="inquiries"
                name="Inquiries"
                stroke={colors.chart.primary}
                strokeWidth={2}
                dot={{ fill: colors.chart.primary, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="boq"
                name="BOQ created"
                stroke={colors.chart.secondary}
                strokeWidth={2}
                dot={{ fill: colors.chart.secondary, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Inquiry pipeline" subtitle="By workflow status">
          {inquiryTotal === 0 ? (
            <EmptyChart message="No inquiry distribution data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={inquiryData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.surface.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: colors.text.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: colors.text.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.surface.card,
                    border: `1px solid ${colors.surface.border}`,
                    borderRadius: 10,
                    boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                  }}
                />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {inquiryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="BOQ status" subtitle="Quotations by approval state">
          {boqTotal === 0 ? (
            <EmptyChart message="No BOQ data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={boqData.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke={colors.surface.card}
                  strokeWidth={2}
                >
                  {boqData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.surface.card,
                    border: `1px solid ${colors.surface.border}`,
                    borderRadius: 10,
                    boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: colors.text.muted }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}









