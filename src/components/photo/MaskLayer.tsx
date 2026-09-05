import { useEffect, useRef } from "react";

export type MaskStroke = { points: { x: number; y: number }[]; width: number };

export function paintMask(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  strokes: MaskStroke[],
  color = "rgba(255,64,96,0.55)",
) {
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const min = Math.min(canvas.width, canvas.height);
  for (const s of strokes) {
    const lw = Math.max(1, s.width * min);
    ctx.lineWidth = lw;
    const pts = s.points;
    if (!pts.length) continue;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0]!.x * canvas.width, pts[0]!.y * canvas.height, lw / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x * canvas.width, pts[0]!.y * canvas.height);
    for (const p of pts.slice(1)) ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
    ctx.stroke();
  }
  return canvas;
}

/** Full-opacity mask used as the inpainting stencil. */
export function buildMaskCanvas(w: number, h: number, strokes: MaskStroke[]) {
  return paintMask(document.createElement("canvas"), w, h, strokes, "rgba(255,255,255,1)");
}

export function MaskLayer({
  width,
  height,
  strokes,
  brushSize,
  onChange,
}: {
  width: number;
  height: number;
  strokes: MaskStroke[];
  brushSize: number;
  onChange: (next: MaskStroke[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const live = useRef<MaskStroke | null>(null);

  const paint = (extra?: MaskStroke | null) => {
    const c = canvasRef.current;
    if (!c) return;
    paintMask(c, width, height, extra ? [...strokes, extra] : strokes);
  };

  useEffect(paint, [width, height, strokes]);

  const toNorm = (e: React.PointerEvent) => {
    const rect = rootRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 cursor-crosshair"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        live.current = { points: [toNorm(e)], width: brushSize };
        paint(live.current);
      }}
      onPointerMove={(e) => {
        if (!live.current) return;
        live.current.points.push(toNorm(e));
        paint(live.current);
      }}
      onPointerUp={() => {
        if (!live.current) return;
        const s = live.current;
        live.current = null;
        onChange([...strokes, s]);
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
