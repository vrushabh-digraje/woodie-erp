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
import { COLORS } from "../../../constants/colors";
import { panelSurface } from "../../../constants/surfaces";
import type { MonthlyTrendPoint } from "../dashboardApi";
import DashboardSectionHeader from "./DashboardSectionHeader";

type ChartSlice = { name: string; value: number; fill: string };

const panelStyle = panelSurface();

const tooltipStyle = {
  backgroundColor: COLORS.page.cardBg,
  border: `1px solid ${COLORS.page.cardBorder}`,
  borderRadius: 8,
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      className="flex h-52 items-center justify-center text-sm"
      style={{
        borderRadius: 8,
        border: `1px dashed ${COLORS.page.cardBorder}`,
        backgroundColor: COLORS.badge.pending.bg,
        color: COLORS.text.muted,
      }}
    >
      {message}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex h-full flex-col p-4 lg:p-5" style={panelStyle}>
      <DashboardSectionHeader title={title} subtitle={subtitle} />
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function DashboardInquiryBarChart({
  title,
  subtitle,
  data,
  horizontal = true,
  embedded = false,
}: {
  title: string;
  subtitle?: string;
  data: ChartSlice[];
  horizontal?: boolean;
  embedded?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const chart = total === 0 ? (
    <EmptyChart message="No data yet." />
  ) : horizontal ? (
    <ResponsiveContainer width="100%" height={Math.max(168, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.page.cardBorder} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: COLORS.text.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={112}
          tick={{ fill: COLORS.text.secondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} maxBarSize={32}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.page.cardBorder} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: COLORS.text.muted, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={56}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: COLORS.text.muted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  if (embedded) return chart;

  return (
    <ChartCard title={title} subtitle={subtitle}>
      {chart}
    </ChartCard>
  );
}

export function DashboardInvoiceDonutChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: ChartSlice[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const active = data.filter((d) => d.value > 0);

  return (
    <section className="flex h-full w-full min-w-0 flex-col p-4 lg:p-5" style={panelStyle}>
      <DashboardSectionHeader
        title={title}
        subtitle={subtitle}
        action={<span className="inline-flex h-[30px] w-[88px] shrink-0" aria-hidden />}
      />
      <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center">
        {total === 0 ? (
          <EmptyChart message="No invoice data yet." />
        ) : (
          <div className="flex w-full max-w-sm flex-col justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={active}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={3}
                  stroke={COLORS.page.cardBg}
                  strokeWidth={3}
                >
                  {active.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 12, color: COLORS.text.muted, paddingTop: 16 }}
                  formatter={(value) => (
                    <span style={{ color: COLORS.text.secondary }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardMonthlyTrendChart({
  title = "Monthly trend",
  subtitle = "Inquiries & work orders created",
  data,
}: {
  title?: string;
  subtitle?: string;
  data: MonthlyTrendPoint[];
}) {
  const hasData = data.some((d) => d.inquiries > 0 || d.workOrders > 0);

  return (
    <section className="flex h-full flex-col p-4 lg:p-5" style={panelStyle}>
      <DashboardSectionHeader title={title} subtitle={subtitle} />
      <div className="flex-1">
        {!hasData ? (
          <EmptyChart message="No trend data for this filter yet." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.page.cardBorder} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: COLORS.text.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: COLORS.text.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: COLORS.text.muted }} />
              <Line
                type="monotone"
                dataKey="inquiries"
                name="Inquiries"
                stroke={COLORS.brand}
                strokeWidth={2}
                dot={{ fill: COLORS.brand, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="workOrders"
                name="Work orders"
                stroke={COLORS.sidebar.bg}
                strokeWidth={2}
                dot={{ fill: COLORS.sidebar.bg, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export function DashboardChartsRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
      <div className="flex min-w-0">{left}</div>
      <div className="flex min-w-0">{right}</div>
    </div>
  );
}
