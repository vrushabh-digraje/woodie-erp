import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type AppFeedbackMsg = { type: "ok" | "err"; text: string };

// eslint-disable-next-line react-refresh/only-export-components
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppFeedback(autoDismissMs = 5000) {
  const [msg, setMsg] = useState<AppFeedbackMsg | null>(null);

  useEffect(() => {
    if (!msg || autoDismissMs <= 0) return;
    const timer = window.setTimeout(() => setMsg(null), autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [msg, autoDismissMs]);

  const notifyOk = useCallback((text: string) => setMsg({ type: "ok", text }), []);
  const notifyErr = useCallback(
    (err: unknown, fallback: string) => setMsg({ type: "err", text: getApiErrorMessage(err, fallback) }),
    [],
  );
  const notifyErrText = useCallback((text: string) => setMsg({ type: "err", text }), []);
  const dismiss = useCallback(() => setMsg(null), []);

  return { msg, notifyOk, notifyErr, notifyErrText, dismiss };
}

const toastTone = {
  ok: {
    shell: "bg-emerald-600 text-white shadow-lg shadow-emerald-900/25",
    iconWrap: "bg-emerald-500",
  },
  err: {
    shell: "bg-rose-600 text-white shadow-lg shadow-rose-900/25",
    iconWrap: "bg-rose-500",
  },
} as const;

/** Fixed top-right toast — solid fill, white text. */
export function AppFeedbackPopup({
  msg,
  onDismiss,
}: {
  msg: AppFeedbackMsg | null;
  onDismiss: () => void;
}) {
  if (!msg) return null;

  const tone = toastTone[msg.type];
  const Icon = msg.type === "ok" ? CheckCircle2 : AlertCircle;

  return (
    <div
      className="pointer-events-none fixed right-4 top-20 z-[100] flex justify-end sm:right-6"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`pointer-events-auto inline-flex w-max max-w-[min(calc(100vw-2rem),28rem)] items-center gap-2.5 rounded-xl px-3.5 py-3 ${tone.shell}`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${tone.iconWrap}`}>
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-semibold leading-snug text-white">{msg.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-0.5 shrink-0 rounded-lg p-1.5 text-white transition hover:bg-white/20"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Inline alert (forms) — same solid fill + white text. */
export function InlineFeedbackAlert({
  type,
  children,
  className = "",
}: {
  type: "ok" | "err";
  children: ReactNode;
  className?: string;
}) {
  const tone = toastTone[type];
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-white ${tone.shell} ${className}`}
      role="alert"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white" strokeWidth={2.5} />
      <div className="font-medium leading-snug text-white">{children}</div>
    </div>
  );
}
