import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

export function ImagePreviewModal({
  src,
  alt = "Image preview",
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal aria-label={alt}>
      <button type="button" className="absolute inset-0 bg-black/75" onClick={onClose} aria-label="Close preview" />
      <div className="relative z-[1] flex max-h-[92vh] max-w-[min(96vw,920px)] flex-col items-end gap-2">
        <div className="flex items-center gap-2">          
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <img src={src} alt={alt} className="max-h-[calc(92vh-48px)] max-w-full rounded-lg object-contain shadow-2xl" />
      </div>
    </div>
  );
}

export function ImagePreviewThumb({
  src,
  alt = "",
  className = "",
  imgClassName = "h-24 w-24 object-cover sm:h-28 sm:w-28",
}: {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block cursor-zoom-in overflow-hidden rounded-lg ring-2 ring-brand-navy/10 transition hover:ring-brand-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${className}`}
      >
        <img src={src} alt={alt} className={imgClassName} />
      </button>
      <ImagePreviewModal src={open ? src : null} alt={alt || "Preview"} onClose={close} />
    </>
  );
}
