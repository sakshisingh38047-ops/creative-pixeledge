import { useEffect, useRef } from "react";
import { Move, RotateCw, Trash2 } from "lucide-react";
import {
  drawStrokes,
  fontStack,
  uid,
  type Overlays,
  type Stroke,
} from "@/lib/photo/overlays";
import { cn } from "@/lib/utils";

export type BrushSettings = {
  color: string;
  size: number; // fraction of the smaller side
  opacity: number;
  erase: boolean;
};

export function OverlayLayer({
  overlays,
  width,
  height,
  selectedId,
  onSelect,
  onBegin,
  onChange,
  onDelete,
  drawMode,
  brush,
}: {
  overlays: Overlays;
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBegin: () => void;
  onChange: (next: Overlays) => void;
  onDelete: (id: string) => void;
  drawMode: boolean;
  brush: BrushSettings;
}) {
  const drawCanvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Paint strokes (committed + in-progress) onto the preview canvas.
  const paint = (extra?: Stroke | null) => {
    const c = drawCanvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawStrokes(ctx, c.width, c.height, extra ? [...overlays.strokes, extra] : overlays.strokes);
  };

  useEffect(() => {
    const c = drawCanvas.current;
    if (!c) return;
    c.width = Math.max(1, Math.round(width));
    c.height = Math.max(1, Math.round(height));
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, overlays.strokes]);

  const toNorm = (e: React.PointerEvent | PointerEvent) => {
    const rect = rootRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  /* ------------------------------------------------------------- drawing */
  const startDraw = (e: React.PointerEvent) => {
    if (!drawMode) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onBegin();
    live.current = {
      id: uid(),
      color: brush.color,
      width: brush.size,
      opacity: brush.opacity,
      erase: brush.erase,
      points: [toNorm(e)],
    };
    paint(live.current);
  };
  const moveDraw = (e: React.PointerEvent) => {
    if (!live.current) return;
    live.current.points.push(toNorm(e));
    paint(live.current);
  };
  const endDraw = () => {
    if (!live.current) return;
    const stroke = live.current;
    live.current = null;
    onChange({ ...overlays, strokes: [...overlays.strokes, stroke] });
  };

  /* -------------------------------------------------------- item gesture */
  const dragItem = (e: React.PointerEvent, id: string, mode: "move" | "scale") => {
    e.stopPropagation();
    e.preventDefault();
    const item = overlays.items.find((i) => i.id === id);
    if (!item) return;
    onSelect(id);
    onBegin();
    const rect = rootRef.current!.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    const base = { ...item };
    const cx = rect.left + base.x * rect.width;
    const cy = rect.top + base.y * rect.height;
    const startDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);

    const onMove = (ev: PointerEvent) => {
      const patch: Record<string, number> = {};
      if (mode === "move") {
        patch.x = Math.min(1.2, Math.max(-0.2, base.x + (ev.clientX - start.x) / rect.width));
        patch.y = Math.min(1.2, Math.max(-0.2, base.y + (ev.clientY - start.y) / rect.height));
      } else {
        const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
        patch.size = Math.min(2, Math.max(0.02, base.size * (dist / startDist)));
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        patch.rotation = base.rotation + ((angle - startAngle) * 180) / Math.PI;
      }
      onChange({
        ...overlays,
        items: overlays.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (drawMode) startDraw(e);
        else if (e.target === rootRef.current) onSelect(null);
      }}
      onPointerMove={moveDraw}
      onPointerUp={endDraw}
      onPointerCancel={endDraw}
    >
      <canvas
        ref={drawCanvas}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {overlays.items.map((item) => {
        const selected = item.id === selectedId;
        const px = item.size * height;
        return (
          <div
            key={item.id}
            onPointerDown={(e) => !drawMode && dragItem(e, item.id, "move")}
            className={cn(
              "absolute origin-center select-none",
              drawMode ? "pointer-events-none" : "cursor-move",
            )}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              opacity: item.opacity,
            }}
          >
            <div
              className={cn(
                "relative whitespace-pre px-1 py-0.5 text-center leading-[1.15]",
                selected && !drawMode && "outline-2 outline-dashed outline-primary/80",
              )}
              style={
                item.kind === "text"
                  ? {
                      fontFamily: fontStack(item.font),
                      fontSize: `${px}px`,
                      fontWeight: item.bold ? 700 : 400,
                      fontStyle: item.italic ? "italic" : "normal",
                      color: item.color,
                      WebkitTextStrokeWidth: `${px * item.strokeWidth}px`,
                      WebkitTextStrokeColor: item.strokeColor,
                      textShadow:
                        item.shadow > 0
                          ? `0 ${px * 0.06}px ${px * 0.28 * item.shadow}px rgba(0,0,0,${0.75 * item.shadow})`
                          : "none",
                    }
                  : {
                      fontSize: `${px}px`,
                      lineHeight: 1,
                      fontFamily:
                        '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                    }
              }
            >
              {item.kind === "text" ? item.text : item.char}

              {selected && !drawMode && (
                <>
                  <button
                    type="button"
                    aria-label="Resize and rotate"
                    onPointerDown={(e) => dragItem(e, item.id, "scale")}
                    className="absolute -right-3.5 -bottom-3.5 grid size-7 place-items-center rounded-full border border-border bg-surface-2 text-foreground shadow-lg"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete layer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onDelete(item.id)}
                    className="absolute -top-3.5 -right-3.5 grid size-7 place-items-center rounded-full border border-border bg-surface-2 text-destructive shadow-lg"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <span className="absolute -top-3.5 -left-3.5 grid size-7 place-items-center rounded-full border border-border bg-surface-2 text-muted-foreground shadow-lg">
                    <Move className="size-3.5" />
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
