/** Single-line ellipsis; full string in native tooltip. Use detail pages for full layout. */
export function TruncatedText({
  text,
  className = "",
  maxClass = "max-w-[10rem]",
  empty = "—",
}: {
  text?: string | null;
  className?: string;
  maxClass?: string;
  empty?: string;
}) {
  const value = String(text ?? "").trim() || empty;
  const showTitle = value !== empty && value.length > 0;

  return (
    <span
      className={`block truncate ${maxClass} ${className}`}
      title={showTitle ? value : undefined}
    >
      {value}
    </span>
  );
}
