import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { themeClasses } from "../../theme/classes";

export function ListActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-1">{children}</div>;
}

export function ListIconLink({
  to,
  label,
  children,
  variant = "default",
}: {
  to: string;
  label: string;
  children: ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={
        variant === "danger"
          ? "inline-flex rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
          : `${themeClasses.btnGhost} !px-2 !py-2`
      }
    >
      {children}
    </Link>
  );
}

export function ListIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex cursor-pointer rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
    >
      {children}
    </button>
  );
}
