import { useEffect, useRef } from "react";
import type { FilterPreset } from "@/lib/photo/filters";
import { applyFilterToAdjustments } from "@/lib/photo/filters";
import { cssFilterString } from "@/lib/photo/render";
import { defaultAdjustments } from "@/lib/photo/types";
import { cn } from "@/lib/utils";

type Props = {
  preset: FilterPreset;
  source: HTMLImageElement | HTMLCanvasElement | null;
  active: boolean;
  onSelect: () => void;
};

export function FilterThumb({ preset, source, active, onSelect }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !source) return;
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const adj = applyFilterToAdjustments(defaultAdjustments, preset, 100);
    ctx.clearRect(0, 0, size, size);
    ctx.filter = cssFilterString(adj);
    const sw = source.width;
    const sh = source.height;
    const s = Math.min(sw, sh);
    ctx.drawImage(source, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, size, size);
    ctx.filter = "none";
    if (adj.temperature) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = Math.min(0.5, Math.abs(adj.temperature) / 180);
      ctx.fillStyle = adj.temperature > 0 ? "rgb(255,128,90)" : "rgb(90,128,255)";
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    if (adj.fade > 0) {
      ctx.globalAlpha = Math.min(0.5, adj.fade / 140);
      ctx.fillStyle = "#e8e2d8";
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
    }
  }, [preset, source]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "block overflow-hidden rounded-xl border-2 transition-all",
          active
            ? "border-primary shadow-pop"
            : "border-transparent opacity-80 hover:opacity-100",
        )}
      >
        <canvas ref={ref} className="block h-16 w-16 bg-muted object-cover" />
      </span>
      <span
        className={cn(
          "max-w-16 truncate text-[10px] tracking-wide",
          active ? "font-semibold text-primary" : "text-muted-foreground",
        )}
      >
        {preset.name}
      </span>
    </button>
  );
}
