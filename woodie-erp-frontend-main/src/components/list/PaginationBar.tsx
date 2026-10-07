import { COLORS } from "../../constants/colors";
import { RADIUS } from "../../constants/surfaces";

type PaginationBarProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

const btnStyle = {
  borderRadius: RADIUS.button,
  border: `1px solid ${COLORS.page.cardBorder}`,
  backgroundColor: COLORS.page.cardBg,
  color: COLORS.text.secondary,
};

export default function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-4"
      style={{ borderTop: `1px solid ${COLORS.page.cardBorder}` }}
    >
      <p className="text-xs" style={{ color: COLORS.text.muted }}>
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={btnStyle}
        >
          Previous
        </button>
        <span className="text-xs" style={{ color: COLORS.text.muted }}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={btnStyle}
        >
          Next
        </button>
      </div>
    </div>
  );
}
