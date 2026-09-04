import { useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { AdjustSlider } from "./AdjustSlider";
import { cn } from "@/lib/utils";

export type ExportOptions = {
  format: "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  maxDimension: number | null;
};

const FORMATS: { id: ExportOptions["format"]; label: string }[] = [
  { id: "image/jpeg", label: "JPG" },
  { id: "image/png", label: "PNG" },
  { id: "image/webp", label: "WebP" },
];

const SIZES: { label: string; value: number | null; note: string }[] = [
  { label: "Original", value: null, note: "full resolution" },
  { label: "4K", value: 3840, note: "3840 px" },
  { label: "Full HD", value: 1920, note: "1920 px" },
  { label: "HD", value: 1280, note: "1280 px" },
];

export function ExportDialog({
  open,
  onClose,
  onExport,
  onShare,
  dimensions,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (opts: ExportOptions) => void;
  onShare: (opts: ExportOptions) => void;
  dimensions: { w: number; h: number };
  busy: boolean;
}) {
  const [format, setFormat] = useState<ExportOptions["format"]>("image/jpeg");
  const [quality, setQuality] = useState(92);
  const [maxDimension, setMaxDimension] = useState<number | null>(null);

  if (!open) return null;
  const opts: ExportOptions = { format, quality, maxDimension };
  const scale = maxDimension
    ? Math.min(1, maxDimension / Math.max(dimensions.w, dimensions.h))
    : 1;
  const outW = Math.round(dimensions.w * scale);
  const outH = Math.round(dimensions.h * scale);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="panel w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Export photo</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">FORMAT</p>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                format === item.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">RESOLUTION</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {SIZES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setMaxDimension(item.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                maxDimension === item.value
                  ? "border-primary bg-primary/15"
                  : "border-border bg-secondary hover:bg-muted",
              )}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-[11px] text-muted-foreground">{item.note}</span>
            </button>
          ))}
        </div>

        {format !== "image/png" && (
          <AdjustSlider
            label="Quality"
            value={quality}
            min={1}
            max={100}
            onChange={setQuality}
            onReset={() => setQuality(92)}
          />
        )}

        <p className="mt-3 mb-4 text-xs text-muted-foreground">
          Output: {outW} × {outH} px
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onExport(opts)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Download className="size-4" />
            {busy ? "Preparing…" : "Save photo"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onShare(opts)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Share2 className="size-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
