import { Bold, Italic, Plus, Trash2 } from "lucide-react";
import { AdjustSlider } from "./AdjustSlider";
import { fontOptions, fontStack, type TextItem } from "@/lib/photo/overlays";
import { cn } from "@/lib/utils";

export const TEXT_COLORS = [
  "#ffffff","#000000","#ff3b30","#ff9500","#ffcc00","#34c759","#00c7be","#30b0c7",
  "#007aff","#5856d6","#af52de","#ff2d55","#f7c59f","#8e8e93","#e0b34a","#1d1d1f",
];

export function TextPanel({
  item,
  onAdd,
  onPatch,
  onDelete,
  onBegin,
}: {
  item: TextItem | null;
  onAdd: () => void;
  onPatch: (patch: Partial<TextItem>) => void;
  onDelete: () => void;
  onBegin: () => void;
}) {
  if (!item) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" /> Add text
        </button>
        <p className="text-[11px] text-muted-foreground">
          Tap a text layer on the photo to edit, drag to move, use the corner handle to resize
          and rotate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          value={item.text}
          onChange={(e) => onPatch({ text: e.target.value })}
          onFocus={onBegin}
          rows={2}
          className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Your text"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onPatch({ bold: !item.bold })}
            className={cn(
              "grid size-8 place-items-center rounded-lg border border-border",
              item.bold ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
            )}
            aria-label="Bold"
          >
            <Bold className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPatch({ italic: !item.italic })}
            className={cn(
              "grid size-8 place-items-center rounded-lg border border-border",
              item.italic ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
            )}
            aria-label="Italic"
          >
            <Italic className="size-3.5" />
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">
          FONT
        </p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {fontOptions.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => onPatch({ font: f.name })}
              style={{ fontFamily: f.stack }}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-2 text-sm whitespace-nowrap transition-colors",
                item.font === f.name
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ColorRow
        label="COLOR"
        value={item.color}
        onChange={(color) => onPatch({ color })}
        onBegin={onBegin}
      />
      <ColorRow
        label="STROKE COLOR"
        value={item.strokeColor}
        onChange={(strokeColor) => onPatch({ strokeColor })}
        onBegin={onBegin}
      />

      <div className="grid gap-x-8 sm:grid-cols-2">
        <AdjustSlider
          label="Size"
          value={Math.round(item.size * 100)}
          min={2}
          max={60}
          onChange={(v) => onPatch({ size: v / 100 })}
          onReset={() => onPatch({ size: 0.12 })}
        />
        <AdjustSlider
          label="Stroke"
          value={Math.round(item.strokeWidth * 100)}
          min={0}
          max={20}
          onChange={(v) => onPatch({ strokeWidth: v / 100 })}
          onReset={() => onPatch({ strokeWidth: 0 })}
        />
        <AdjustSlider
          label="Shadow"
          value={Math.round(item.shadow * 100)}
          min={0}
          max={100}
          onChange={(v) => onPatch({ shadow: v / 100 })}
          onReset={() => onPatch({ shadow: 0.4 })}
        />
        <AdjustSlider
          label="Opacity"
          value={Math.round(item.opacity * 100)}
          min={10}
          max={100}
          onChange={(v) => onPatch({ opacity: v / 100 })}
          onReset={() => onPatch({ opacity: 1 })}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Plus className="size-3.5" /> New text
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-destructive hover:bg-muted"
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
  onBegin,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBegin: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        <label className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border">
          <span
            className="block size-full"
            style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}
          />
          <input
            type="color"
            value={value}
            onFocus={onBegin}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label.toLowerCase()}
          />
        </label>
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              onBegin();
              onChange(c);
            }}
            style={{ background: c }}
            className={cn(
              "size-8 shrink-0 rounded-full border-2 transition-transform",
              value.toLowerCase() === c ? "scale-110 border-primary" : "border-border",
            )}
            aria-label={`Colour ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
