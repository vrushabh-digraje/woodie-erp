import type { ReactNode } from "react";
import { COLORS } from "../../constants/colors";
import { panelSurface, tableHeadSurface } from "../../constants/surfaces";

type Align = "left" | "right" | "center";

const thClass =
  "whitespace-nowrap px-3.5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] first:rounded-tl-[9px] first:pl-4 last:rounded-tr-[9px] last:pr-4";
const tdClass = "px-3.5 py-3 text-sm first:pl-4 last:pr-4";

export function DataTable({
  children,
  className = "",
  minWidth,
  framed = false,
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
  /** Standalone bordered table card; omit when nested inside an app-panel section */
  framed?: boolean;
}) {
  return (
    <div className={`overflow-hidden ${className}`} style={framed ? panelSurface() : undefined}>
      <div className="overflow-x-auto">
        <table
          className="min-w-full w-full border-collapse text-sm"
          style={minWidth ? { minWidth } : undefined}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function DataTableHeadRow({ children }: { children: ReactNode }) {
  return <tr style={tableHeadSurface()}>{children}</tr>;
}

export function DataTableTh({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: Align;
  className?: string;
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`${thClass} ${alignClass} ${className}`.trim()}
      style={{ color: COLORS.sidebar.activeText }}
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`transition-colors hover:bg-[#fffbf5] ${className}`.trim()}
      style={{ borderTop: `1px solid ${COLORS.page.cardBorder}` }}
    >
      {children}
    </tr>
  );
}

export function DataTableTd({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: Align;
  className?: string;
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td
      className={`${tdClass} ${alignClass} ${className}`.trim()}
      style={{ color: COLORS.text.primary }}
    >
      {children}
    </td>
  );
}
