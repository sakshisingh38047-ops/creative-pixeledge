import type { Adjustments, EditState } from "./types";
import { applyFilterToAdjustments, filterPresets } from "./filters";

export function cssFilterString(a: Adjustments): string {
  const brightness = 1 + a.brightness / 100 + a.exposure / 140;
  const contrast = 1 + a.contrast / 100;
  const saturate = Math.max(0, 1 + a.saturation / 100);
  const parts = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturate.toFixed(3)})`,
  ];
  if (a.hue) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.blur > 0) parts.push(`blur(${a.blur.toFixed(2)}px)`);
  return parts.join(" ");
}

function drawnSize(
  img: { width: number; height: number },
  rotation: number,
  cropAspect: number | null,
) {
  const swap = rotation % 180 !== 0;
  let w = swap ? img.height : img.width;
  let h = swap ? img.width : img.height;
  if (cropAspect) {
    const current = w / h;
    if (current > cropAspect) w = Math.round(h * cropAspect);
    else h = Math.round(w / cropAspect);
  }
  return { w, h };
}

export function outputSize(
  img: { width: number; height: number },
  state: EditState,
) {
  return drawnSize(img, ((state.geometry.rotation % 360) + 360) % 360, state.geometry.cropAspect);
}

/** Renders the edited image onto the given canvas at `scale` of the output size. */
export function renderToCanvas(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
  state: EditState,
  maxDimension?: number,
) {
  const preset = filterPresets.find((p) => p.id === state.filterId);
  const a = applyFilterToAdjustments(state.adjustments, preset, state.filterStrength);
  const rotation = ((state.geometry.rotation % 360) + 360) % 360;
  const full = drawnSize(image, rotation, state.geometry.cropAspect);

  let scale = 1;
  if (maxDimension) scale = Math.min(1, maxDimension / Math.max(full.w, full.h));
  const w = Math.max(1, Math.round(full.w * scale));
  const h = Math.max(1, Math.round(full.h * scale));

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.filter = cssFilterString(a);
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(state.geometry.flipH ? -1 : 1, state.geometry.flipV ? -1 : 1);
  const swap = rotation % 180 !== 0;
  const drawW = (swap ? h : w) * (image.width / (swap ? full.h : full.w));
  const drawH = (swap ? w : h) * (image.height / (swap ? full.w : full.h));
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Temperature / tint color grading
  if (a.temperature !== 0 || a.tint !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    const t = a.temperature / 100;
    const ti = a.tint / 100;
    const r = t > 0 ? 255 : 90;
    const b = t > 0 ? 90 : 255;
    ctx.globalAlpha = Math.min(0.55, Math.abs(t) * 0.55);
    ctx.fillStyle = `rgb(${r},128,${b})`;
    if (ctx.globalAlpha > 0) ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(0.55, Math.abs(ti) * 0.55);
    ctx.fillStyle = ti > 0 ? "rgb(220,90,220)" : "rgb(90,220,120)";
    if (ctx.globalAlpha > 0) ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Highlights / shadows
  if (a.highlights !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = a.highlights > 0 ? "lighten" : "multiply";
    const v = Math.min(0.5, Math.abs(a.highlights) / 200);
    ctx.globalAlpha = v;
    ctx.fillStyle = a.highlights > 0 ? "#ffffff" : "#b9b9b9";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (a.shadows !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = a.shadows > 0 ? "screen" : "multiply";
    ctx.globalAlpha = Math.min(0.5, Math.abs(a.shadows) / 200);
    ctx.fillStyle = a.shadows > 0 ? "#4a4a4a" : "#1b1b1b";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Fade (matte)
  if (a.fade > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, a.fade / 140);
    ctx.fillStyle = "#e8e2d8";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Sharpen (unsharp mask via convolution)
  if (a.sharpen > 0) sharpen(ctx, w, h, a.sharpen / 100);

  // Grain
  if (a.grain > 0) grain(ctx, w, h, a.grain / 100);

  // Vignette
  if (a.vignette !== 0) {
    ctx.save();
    const amount = a.vignette / 100;
    const grd = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.25,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75,
    );
    if (amount > 0) {
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, amount)})`);
    } else {
      grd.addColorStop(0, "rgba(255,255,255,0)");
      grd.addColorStop(1, `rgba(255,255,255,${Math.min(0.9, -amount)})`);
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data;
  const d = out.data;
  const c = 1 + 4 * amount;
  const n = -amount;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const idx = i + ch;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          d[idx] = s[idx]!;
          continue;
        }
        const v =
          c * s[idx]! +
          n * s[idx - 4]! +
          n * s[idx + 4]! +
          n * s[idx - w * 4]! +
          n * s[idx + w * 4]!;
        d[idx] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      d[i + 3] = s[i + 3]!;
    }
  }
  ctx.putImageData(out, 0, 0);
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const strength = amount * 60;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * strength;
    d[i] = clamp(d[i]! + noise);
    d[i + 1] = clamp(d[i + 1]! + noise);
    d[i + 2] = clamp(d[i + 2]! + noise);
  }
  ctx.putImageData(img, 0, 0);
}

function clamp(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = url;
  });
}
