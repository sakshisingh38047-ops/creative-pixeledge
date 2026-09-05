import { Brush, Eraser, Trash2, Undo2 } from "lucide-react";
import { AdjustSlider } from "./AdjustSlider";
import { ColorRow } from "./TextPanel";
import type { BrushSettings } from "./OverlayLayer";
import { cn } from "@/lib/utils";

export function DrawPanel({
  brush,
  onChange,
  onUndoStroke,
  onClear,
  strokeCount,
}: {
  brush: BrushSettings;
  onChange: (patch: Partial<BrushSettings>) => void;
  onUndoStroke: () => void;
  onClear: () => void;
  strokeCount: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ erase: false })}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            !brush.erase
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-secondary hover:bg-muted",
          )}
        >
          <Brush className="size-4" /> Brush
        </button>
        <button
          type="button"
          onClick={() => onChange({ erase: true })}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            brush.erase
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-secondary hover:bg-muted",
          )}
        >
          <Eraser className="size-4" /> Eraser
        </button>
        <button
          type="button"
          onClick={onUndoStroke}
          disabled={!strokeCount}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-40"
        >
          <Undo2 className="size-4" /> Undo
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!strokeCount}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-destructive hover:bg-muted disabled:opacity-40"
        >
          <Trash2 className="size-4" /> Clear
        </button>
      </div>

      <ColorRow
        label="BRUSH COLOUR"
        value={brush.color}
        onChange={(color) => onChange({ color })}
        onBegin={() => {}}
      />

      <div className="grid gap-x-8 sm:grid-cols-2">
        <AdjustSlider
          label="Brush size"
          value={Math.round(brush.size * 1000)}
          min={2}
          max={120}
          onChange={(v) => onChange({ size: v / 1000 })}
          onReset={() => onChange({ size: 0.012 })}
        />
        <AdjustSlider
          label="Opacity"
          value={Math.round(brush.opacity * 100)}
          min={5}
          max={100}
          onChange={(v) => onChange({ opacity: v / 100 })}
          onReset={() => onChange({ opacity: 1 })}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Draw directly on the photo with your finger or mouse. Strokes are saved with the photo when
        you export.
      </p>
    </div>
  );
}
