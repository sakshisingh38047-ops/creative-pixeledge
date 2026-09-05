import { useRef } from "react";
import {
  Eraser,
  Image as ImageIcon,
  Loader2,
  Scissors,
  Sparkles,
  Wand2,
  Smile,
  Zap,
} from "lucide-react";
import { AdjustSlider } from "./AdjustSlider";
import { artStyles, type BackgroundChoice, type RetouchSettings } from "@/lib/photo/ai/ops";
import { cn } from "@/lib/utils";

export type AiTool = "bg" | "object" | "enhance" | "auto" | "retouch" | "art";

export const AI_TOOLS: { id: AiTool; label: string; icon: typeof Wand2 }[] = [
  { id: "bg", label: "Remove BG", icon: Scissors },
  { id: "object", label: "Object Eraser", icon: Eraser },
  { id: "enhance", label: "HD Enhance", icon: Zap },
  { id: "auto", label: "Auto Adjust", icon: Wand2 },
  { id: "retouch", label: "Face Retouch", icon: Smile },
  { id: "art", label: "AI Styles", icon: Sparkles },
];

const BG_COLORS = ["#ffffff", "#000000", "#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#111827"];
const BG_GRADIENTS: { from: string; to: string }[] = [
  { from: "#ff9a9e", to: "#fad0c4" },
  { from: "#a18cd1", to: "#fbc2eb" },
  { from: "#f6d365", to: "#fda085" },
  { from: "#84fab0", to: "#8fd3f4" },
  { from: "#30cfd0", to: "#330867" },
  { from: "#0f172a", to: "#334155" },
];

export function AiPanel({
  tool,
  onToolChange,
  busyTool,
  progress,
  hasCutout,
  onRemoveBg,
  onBackground,
  bgBlur,
  onBgBlurChange,
  maskStrokes,
  brushSize,
  onBrushSize,
  onClearMask,
  onEraseObject,
  onEnhance,
  onAutoAdjust,
  retouch,
  onRetouchChange,
  onApplyRetouch,
  artStrength,
  onArtStrength,
  onApplyArt,
}: {
  tool: AiTool;
  onToolChange: (t: AiTool) => void;
  busyTool: AiTool | null;
  progress: number;
  hasCutout: boolean;
  onRemoveBg: () => void;
  onBackground: (choice: BackgroundChoice) => void;
  bgBlur: number;
  onBgBlurChange: (v: number) => void;
  maskStrokes: number;
  brushSize: number;
  onBrushSize: (v: number) => void;
  onClearMask: () => void;
  onEraseObject: () => void;
  onEnhance: (factor: 2 | 4) => void;
  onAutoAdjust: () => void;
  retouch: RetouchSettings;
  onRetouchChange: (patch: Partial<RetouchSettings>) => void;
  onApplyRetouch: () => void;
  artStrength: number;
  onArtStrength: (v: number) => void;
  onApplyArt: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = busyTool !== null;

  const pickBackgroundImage = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => onBackground({ kind: "image", source: img });
    img.src = url;
  };

  return (
    <div className="space-y-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {AI_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onToolChange(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
              tool === t.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary hover:bg-muted",
            )}
          >
            {busyTool === t.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <t.icon className="size-4" />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {busy && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Working on your photo… {Math.round(progress * 100)}%
          </p>
        </div>
      )}

      {tool === "bg" && (
        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={onRemoveBg}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Scissors className="size-4" /> Remove background
          </button>
          <p className="text-[11px] text-muted-foreground">
            {hasCutout
              ? "Background removed — now pick a new one below."
              : "One tap cut-out. The first run downloads the model, so give it a moment."}
          </p>

          {hasCutout && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  COLOUR
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onBackground({ kind: "transparent" })}
                    className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Transparent
                  </button>
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Background ${c}`}
                      onClick={() => onBackground({ kind: "color", color: c })}
                      className="size-8 rounded-lg border border-border"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  GRADIENT
                </p>
                <div className="flex flex-wrap gap-2">
                  {BG_GRADIENTS.map((g) => (
                    <button
                      key={g.from + g.to}
                      type="button"
                      aria-label="Gradient background"
                      onClick={() => onBackground({ kind: "gradient", ...g })}
                      className="size-8 rounded-lg border border-border"
                      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    />
                  ))}
                </div>
              </div>
              <AdjustSlider
                label="Blurred original background"
                value={bgBlur}
                min={0}
                max={100}
                suffix="%"
                onChange={onBgBlurChange}
                onReset={() => onBgBlurChange(0)}
              />
              <button
                type="button"
                onClick={() => onBackground({ kind: "blur", amount: bgBlur })}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                Apply blurred background
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                <ImageIcon className="size-4" /> Upload background photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickBackgroundImage(e.target.files?.[0])}
              />
            </div>
          )}
        </div>
      )}

      {tool === "object" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Paint over anything you want gone, then tap erase — the space is filled in with the
            surrounding scene.
          </p>
          <AdjustSlider
            label="Brush size"
            value={Math.round(brushSize * 1000)}
            min={5}
            max={150}
            onChange={(v) => onBrushSize(v / 1000)}
            onReset={() => onBrushSize(0.05)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !maskStrokes}
              onClick={onEraseObject}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Eraser className="size-4" /> Erase object
            </button>
            <button
              type="button"
              disabled={!maskStrokes}
              onClick={onClearMask}
              className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {tool === "enhance" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Rebuilds detail and sharpness at a bigger size. 4× on a large photo takes longer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onEnhance(2)}
              className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              HD Enhance 2×
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onEnhance(4)}
              className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
            >
              Upscale 4×
            </button>
          </div>
        </div>
      )}

      {tool === "auto" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Reads the photo and balances light, colour, contrast and sharpness in one tap.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onAutoAdjust}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Wand2 className="size-4" /> Auto fix photo
          </button>
        </div>
      )}

      {tool === "retouch" && (
        <div className="space-y-2">
          <div className="grid gap-x-8 sm:grid-cols-3">
            <AdjustSlider
              label="Smooth skin"
              value={Math.round(retouch.smooth * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(v) => onRetouchChange({ smooth: v / 100 })}
              onReset={() => onRetouchChange({ smooth: 0 })}
            />
            <AdjustSlider
              label="Whiten teeth"
              value={Math.round(retouch.teeth * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(v) => onRetouchChange({ teeth: v / 100 })}
              onReset={() => onRetouchChange({ teeth: 0 })}
            />
            <AdjustSlider
              label="Brighten eyes"
              value={Math.round(retouch.eyes * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(v) => onRetouchChange({ eyes: v / 100 })}
              onReset={() => onRetouchChange({ eyes: 0 })}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onApplyRetouch}
            className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            Apply retouch
          </button>
        </div>
      )}

      {tool === "art" && (
        <div className="space-y-3">
          <AdjustSlider
            label="Style strength"
            value={Math.round(artStrength * 100)}
            min={10}
            max={100}
            suffix="%"
            onChange={(v) => onArtStrength(v / 100)}
            onReset={() => onArtStrength(1)}
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {artStyles.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => onApplyArt(s.id)}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-secondary px-2 py-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                <span className="text-base leading-none">{s.emoji}</span>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
