import { Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function ConfirmDeleteModal({
  open,
  title,
  description,
  itemLabel,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  itemLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="w-full max-w-md rounded-xl border border-rose-200/80 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <h3 id="confirm-delete-title" className="text-base font-semibold text-text-primary">
              {title}
            </h3>
            {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
          </div>
        </div>
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900">{itemLabel}</p>
        <p className="mt-2 text-xs text-text-muted">This cannot be undone.</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-surface-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteTrigger({
  label,
  disabled,
  onClick,
  className = "",
}: {
  label?: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label ?? "Delete"}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Trash2 className="h-4 w-4" />
      {label ? <span>{label}</span> : null}
    </button>
  );
}

export function DeleteHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-text-muted">{children}</p>;
}
