import { useEffect, useId, useMemo, useRef, type MouseEvent, type ReactNode } from "react";
import { FileText, ImagePlus, Upload, X } from "lucide-react";

function fileLabel(files: FileList | File[] | null | undefined): string {
  if (!files?.length) return "";
  const list = Array.from(files);
  if (list.length === 1) return list[0].name;
  return `${list.length} files selected`;
}

type FilePickFieldProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  files?: FileList | null;
  file?: File | null;
  onFilesChange?: (files: FileList | null) => void;
  onFileChange?: (file: File | null) => void;
  title?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "amber";
  /** Shorter drop zone for dense layouts (e.g. work order tiles). */
  compact?: boolean;
};

export function FilePickField({
  accept = "image/*",
  multiple = false,
  disabled = false,
  files = null,
  file = null,
  onFilesChange,
  onFileChange,
  title = "Choose files",
  hint = "Tap here to browse your device",
  icon,
  tone = "default",
  compact = false,
}: FilePickFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedFile = file ?? (files?.length ? files[0] : null);
  const selectedLabel = file ? file.name : fileLabel(files);
  const isImage = Boolean(selectedFile?.type?.startsWith("image/"));

  const previewUrl = useMemo(() => {
    if (!selectedFile || !isImage) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile, isImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(list: FileList | null) {
    if (onFileChange) {
      onFileChange(list?.[0] ?? null);
      return;
    }
    onFilesChange?.(list);
  }

  function handleClear(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    handleChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const toneClasses =
    tone === "amber"
      ? "border-amber-300 bg-amber-50/60 hover:border-amber-500 hover:bg-amber-50 text-amber-900"
      : "border-surface-border bg-surface-muted/40 hover:border-ui-primary/50 hover:bg-ui-primary-light/20 text-text-primary";

  if (selectedFile && !disabled) {
    return (
      <div className={compact ? "flex h-full min-h-0 flex-col gap-1.5" : "space-y-2"}>
        <div
          className={`relative overflow-hidden rounded-xl border-2 border-dashed ${
            tone === "amber" ? "border-amber-300 bg-amber-50/40" : "border-ui-primary/30 bg-ui-primary-light/15"
          } ${compact ? "min-h-[88px]" : "min-h-[96px]"}`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={selectedLabel || "Selected file"}
              className={`mx-auto w-full object-contain ${compact ? "h-[88px]" : "max-h-40 min-h-[100px] p-2"}`}
            />
          ) : (
            <div
              className={`flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center ${compact ? "min-h-[88px]" : "min-h-[100px]"}`}
            >
              <FileText className="h-7 w-7 text-ui-primary opacity-80" strokeWidth={1.75} />
              <p className="max-w-full truncate px-2 text-xs font-semibold text-text-primary">
                {selectedLabel}
              </p>
              <p className="text-[11px] text-text-muted">PDF / file attached</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-md ring-2 ring-white transition hover:bg-rose-700"
            title="Remove and choose another"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <label
            htmlFor={inputId}
            className="absolute bottom-2 left-2 cursor-pointer rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-ui-primary underline decoration-ui-primary/50 underline-offset-2 shadow-sm hover:bg-white"
          >
            Replace file
          </label>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => handleChange(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col gap-1.5" : "space-y-2"}>
      <label
        htmlFor={inputId}
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition ${compact ? "min-h-[88px] px-2 py-3" : "min-h-[96px] gap-1.5 px-3 py-4"} ${toneClasses} ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {icon ?? (
          <ImagePlus
            className={`shrink-0 opacity-80 ${compact ? "h-6 w-6" : "h-7 w-7"}`}
            strokeWidth={1.75}
          />
        )}
        <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>{title}</span>
        {!compact && hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
        {compact ? (
          <span className="text-[11px] text-text-muted">{hint || "Tap to browse"}</span>
        ) : (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-text-muted">
            <Upload className="h-3.5 w-3.5" />
            No file chosen yet
          </span>
        )}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => handleChange(e.target.files)}
      />
    </div>
  );
}
