import { CheckCircle2, Handshake, Loader2, Play, type LucideIcon } from "lucide-react";
import { themeClasses } from "../theme/classes";

type ConfirmTone = "primary" | "success" | "warning" | "handover";

const toneConfig: Record<
  ConfirmTone,
  { icon: LucideIcon; iconWrap: string; confirmBtn: string }
> = {
  primary: {
    icon: Play,
    iconWrap: "bg-ui-primary text-white",
    confirmBtn: themeClasses.btnNavy,
  },
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-600 text-white",
    confirmBtn: themeClasses.btnSuccess,
  },
  warning: {
    icon: CheckCircle2,
    iconWrap: "bg-amber-500 text-white",
    confirmBtn: themeClasses.btnNavy,
  },
  handover: {
    icon: Handshake,
    iconWrap: "bg-indigo-600 text-white",
    confirmBtn: themeClasses.btnSuccess,
  },
};

export function ConfirmActionModal({
  open,
  title,
  description,
  itemLabel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  itemLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const { icon: Icon, iconWrap, confirmBtn } = toneConfig[tone];
  const hasBody = Boolean(description?.trim() || itemLabel?.trim());

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <div className="w-full max-w-md rounded-xl border border-surface-border-light bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <span
            className={`mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconWrap}`}
          >
            <Icon className="h-6 w-6" />
          </span>
          <h3 id="confirm-action-title" className="text-lg font-semibold leading-snug text-text-primary">
            {title}
          </h3>
        </div>

        {hasBody ? (
          <div className="mt-4 space-y-3">
            {description?.trim() ? (
              <p className="text-center text-sm leading-relaxed text-text-secondary">{description}</p>
            ) : null}
            {itemLabel?.trim() ? (
              <p className="rounded-lg border border-surface-border-light border-l-4 border-l-ui-primary bg-surface-muted/60 px-4 py-3 text-center text-sm font-medium leading-relaxed text-text-primary">
                {itemLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-surface-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-muted disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-60 ${confirmBtn}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
