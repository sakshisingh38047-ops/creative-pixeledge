/** Browser-only image intelligence helpers.
 *  Everything here runs on canvas pixels — no server, no API key. */

import type { Adjustments } from "../types";

export type Source = HTMLImageElement | HTMLCanvasElement;

export function toCanvas(src: Source, scale = 1): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("render failed"));
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("render failed"));
      img.src = url;
    }, "image/png");
  });
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/* ------------------------------------------------------------------ blur */

export function boxBlur(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  if (radius < 1) return;
  const tmp = new Uint8ClampedArray(data.length);
  const pass = (
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    width: number,
    height: number,
    horizontal: boolean,
  ) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          n = 0;
        for (let k = -radius; k <= radius; k++) {
          const xx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
          const yy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
          const i = (yy * width + xx) * 4;
          r += src[i]!;
          g += src[i + 1]!;
          b += src[i + 2]!;
          a += src[i + 3]!;
          n++;
        }
        const o = (y * width + x) * 4;
        dst[o] = r / n;
        dst[o + 1] = g / n;
        dst[o + 2] = b / n;
        dst[o + 3] = a / n;
      }
    }
  };
  pass(data, tmp, w, h, true);
  pass(tmp, data, w, h, false);
}

export function sharpenData(data: Uint8ClampedArray, w: number, h: number, amount: number) {
  const src = new Uint8ClampedArray(data);
  const c = 1 + 4 * amount;
  const n = -amount;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const k = i + ch;
        data[k] = clamp(
          c * src[k]! + n * src[k - 4]! + n * src[k + 4]! + n * src[k - w * 4]! + n * src[k + w * 4]!,
        );
      }
    }
  }
}

/* ------------------------------------------------------- 5. AI auto adjust */

export function autoAdjust(src: Source): Partial<Adjustments> {
  const small = toCanvas(src, Math.min(1, 300 / Math.max(src.width, src.height)));
  const ctx = small.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, small.width, small.height);
  const hist = new Array(256).fill(0);
  let satSum = 0;
  let rSum = 0;
  let bSum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!,
      g = data[i + 1]!,
      b = data[i + 2]!;
    const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    hist[l]++;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    satSum += max === 0 ? 0 : (max - min) / max;
    rSum += r;
    bSum += b;
    count++;
  }
  const total = count || 1;
  const percentile = (p: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i]!;
      if (acc / total >= p) return i;
    }
    return 255;
  };
  const low = percentile(0.02);
  const high = percentile(0.98);
  const mid = percentile(0.5);
  const sat = satSum / total;
  const range = Math.max(1, high - low);

  const exposure = Math.max(-45, Math.min(55, ((128 - mid) / 128) * 60));
  const contrast = Math.max(-10, Math.min(45, ((235 - range) / 235) * 70));
  const shadows = low > 25 ? -Math.min(35, (low - 25) * 1.2) : Math.min(35, (25 - low) * 1.2);
  const highlights = high < 230 ? Math.min(30, (230 - high) * 0.5) : -Math.min(25, (high - 230) * 2);
  const saturation = Math.max(-15, Math.min(35, (0.35 - sat) * 90));
  const temperature = Math.max(-25, Math.min(25, ((bSum - rSum) / total) * 0.35));

  return {
    exposure: Math.round(exposure),
    contrast: Math.round(contrast),
    shadows: Math.round(shadows),
    highlights: Math.round(highlights),
    saturation: Math.round(saturation),
    temperature: Math.round(temperature),
    sharpen: 18,
  };
}

/* --------------------------------------------- 4. AI upscale / HD enhance */

export function upscaleEnhance(src: Source, factor: 2 | 4): HTMLCanvasElement {
  const maxSide = 6000;
  const f = Math.min(factor, maxSide / Math.max(src.width, src.height)) || 1;
  let current: HTMLCanvasElement = toCanvas(src);
  // Progressive upsampling keeps edges cleaner than a single big jump.
  let remaining = Math.max(1, f);
  while (remaining > 1.001) {
    const step = Math.min(2, remaining);
    current = toCanvas(current, step);
    remaining /= step;
  }
  const ctx = current.getContext("2d")!;
  const img = ctx.getImageData(0, 0, current.width, current.height);
  sharpenData(img.data, current.width, current.height, 0.55);
  // Gentle local contrast lift
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d[i + ch]!;
      d[i + ch] = clamp((v - 128) * 1.06 + 128 + 2);
    }
  }
  ctx.putImageData(img, 0, 0);
  return current;
}

/* ------------------------------------------- 6. Face retouch / beauty pass */

export type RetouchSettings = { smooth: number; teeth: number; eyes: number };

function isSkin(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    max - min > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    g > b
  );
}

export function retouch(src: Source, s: RetouchSettings): HTMLCanvasElement {
  const canvas = toCanvas(src);
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  if (s.smooth > 0) {
    const blurred = new Uint8ClampedArray(d);
    boxBlur(blurred, w, h, Math.max(1, Math.round(Math.min(w, h) / 260)));
    const k = s.smooth;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]!,
        g = d[i + 1]!,
        b = d[i + 2]!;
      if (!isSkin(r, g, b)) continue;
      // Keep detail where the difference is big (edges), smooth flat skin.
      const diff = Math.abs(r - blurred[i]!) + Math.abs(g - blurred[i + 1]!) + Math.abs(b - blurred[i + 2]!);
      const weight = k * Math.max(0, 1 - diff / 110);
      d[i] = clamp(r + (blurred[i]! - r) * weight);
      d[i + 1] = clamp(g + (blurred[i + 1]! - g) * weight);
      d[i + 2] = clamp(b + (blurred[i + 2]! - b) * weight);
    }
  }

  if (s.teeth > 0 || s.eyes > 0) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]!,
        g = d[i + 1]!,
        b = d[i + 2]!;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = max === 0 ? 0 : (max - min) / max;
      // Teeth: bright, low saturation, slightly yellow → whiten
      if (s.teeth > 0 && lum > 120 && sat < 0.4 && r >= b) {
        const k = s.teeth * Math.min(1, (lum - 120) / 90);
        const grey = (r + g + b) / 3;
        d[i] = clamp(r + (grey - r) * k * 0.6 + 12 * k);
        d[i + 1] = clamp(g + (grey - g) * k * 0.6 + 12 * k);
        d[i + 2] = clamp(b + (grey - b) * k * 0.9 + 18 * k);
      }
      // Eyes: lift sparkle in dark low-saturation areas and deepen the pupil
      if (s.eyes > 0 && sat < 0.35) {
        const k = s.eyes;
        if (lum < 70) {
          d[i] = clamp(r - 14 * k);
          d[i + 1] = clamp(g - 14 * k);
          d[i + 2] = clamp(b - 14 * k);
        } else if (lum > 165) {
          d[i] = clamp(r + 16 * k);
          d[i + 1] = clamp(g + 16 * k);
          d[i + 2] = clamp(b + 18 * k);
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* -------------------------------------------- 3. Magic object remover fill */

/** Content-aware fill: propagates surrounding colour into the masked area,
 *  computed on a reduced copy for speed then blended back at full size. */
export function inpaint(src: Source, mask: HTMLCanvasElement): HTMLCanvasElement {
  const out = toCanvas(src);
  const W = out.width;
  const H = out.height;
  const scale = Math.min(1, 420 / Math.max(W, H));
  const sw = Math.max(1, Math.round(W * scale));
  const sh = Math.max(1, Math.round(H * scale));

  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d")!;
  sctx.drawImage(out, 0, 0, sw, sh);
  const simg = sctx.getImageData(0, 0, sw, sh);

  const mCanvas = document.createElement("canvas");
  mCanvas.width = sw;
  mCanvas.height = sh;
  const mctx = mCanvas.getContext("2d")!;
  mctx.drawImage(mask, 0, 0, sw, sh);
  const mdata = mctx.getImageData(0, 0, sw, sh).data;

  const known = new Uint8Array(sw * sh);
  const d = simg.data;
  for (let p = 0; p < sw * sh; p++) known[p] = mdata[p * 4 + 3]! > 40 ? 0 : 1;

  // Seed masked pixels with the average of known pixels, then relax.
  let rs = 0,
    gs = 0,
    bs = 0,
    n = 0;
  for (let p = 0; p < sw * sh; p++) {
    if (!known[p]) continue;
    rs += d[p * 4]!;
    gs += d[p * 4 + 1]!;
    bs += d[p * 4 + 2]!;
    n++;
  }
  if (!n) return out;
  for (let p = 0; p < sw * sh; p++) {
    if (known[p]) continue;
    d[p * 4] = rs / n;
    d[p * 4 + 1] = gs / n;
    d[p * 4 + 2] = bs / n;
    d[p * 4 + 3] = 255;
  }
  const buf = new Float32Array(sw * sh * 3);
  for (let p = 0; p < sw * sh; p++) {
    buf[p * 3] = d[p * 4]!;
    buf[p * 3 + 1] = d[p * 4 + 1]!;
    buf[p * 3 + 2] = d[p * 4 + 2]!;
  }
  for (let it = 0; it < 260; it++) {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const p = y * sw + x;
        if (known[p]) continue;
        for (let ch = 0; ch < 3; ch++) {
          let sum = 0;
          let cnt = 0;
          if (x > 0) (sum += buf[(p - 1) * 3 + ch]!), cnt++;
          if (x < sw - 1) (sum += buf[(p + 1) * 3 + ch]!), cnt++;
          if (y > 0) (sum += buf[(p - sw) * 3 + ch]!), cnt++;
          if (y < sh - 1) (sum += buf[(p + sw) * 3 + ch]!), cnt++;
          buf[p * 3 + ch] = sum / Math.max(1, cnt);
        }
      }
    }
  }
  for (let p = 0; p < sw * sh; p++) {
    d[p * 4] = buf[p * 3]!;
    d[p * 4 + 1] = buf[p * 3 + 1]!;
    d[p * 4 + 2] = buf[p * 3 + 2]!;
  }
  sctx.putImageData(simg, 0, 0);

  // Compose: blurred fill only inside a feathered mask.
  const fill = document.createElement("canvas");
  fill.width = W;
  fill.height = H;
  const fctx = fill.getContext("2d")!;
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(small, 0, 0, W, H);
  fctx.globalCompositeOperation = "destination-in";
  fctx.filter = `blur(${Math.max(1, Math.round(Math.min(W, H) / 300))}px)`;
  fctx.drawImage(mask, 0, 0, W, H);
  fctx.filter = "none";
  fctx.globalCompositeOperation = "source-over";

  const octx = out.getContext("2d")!;
  octx.drawImage(fill, 0, 0);
  return out;
}

/* ----------------------------------------------- 2. Background composition */

export type BackgroundChoice =
  | { kind: "transparent" }
  | { kind: "color"; color: string }
  | { kind: "gradient"; from: string; to: string }
  | { kind: "blur"; amount: number }
  | { kind: "image"; source: Source };

export function composeBackground(
  cutout: HTMLCanvasElement,
  original: Source,
  choice: BackgroundChoice,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = cutout.width;
  out.height = cutout.height;
  const ctx = out.getContext("2d")!;
  const w = out.width;
  const h = out.height;

  if (choice.kind === "color") {
    ctx.fillStyle = choice.color;
    ctx.fillRect(0, 0, w, h);
  } else if (choice.kind === "gradient") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, choice.from);
    g.addColorStop(1, choice.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (choice.kind === "blur") {
    ctx.filter = `blur(${Math.max(1, (choice.amount / 100) * (Math.min(w, h) / 18))}px)`;
    ctx.drawImage(original, 0, 0, w, h);
    ctx.filter = "none";
  } else if (choice.kind === "image") {
    const src = choice.source;
    const scale = Math.max(w / src.width, h / src.height);
    const dw = src.width * scale;
    const dh = src.height * scale;
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  ctx.drawImage(cutout, 0, 0);
  return out;
}

/* ------------------------------------------------------- 7. AI art filters */

export type ArtStyle = {
  id: string;
  name: string;
  emoji: string;
};

export const artStyles: ArtStyle[] = [
  { id: "cartoon", name: "Cartoon", emoji: "🧒" },
  { id: "sketch", name: "Pencil Sketch", emoji: "✏️" },
  { id: "colorpencil", name: "Colour Pencil", emoji: "🖍️" },
  { id: "comic", name: "Comic", emoji: "💥" },
  { id: "oil", name: "Oil Paint", emoji: "🎨" },
  { id: "watercolor", name: "Watercolour", emoji: "💧" },
  { id: "neon", name: "Neon Edge", emoji: "🌈" },
  { id: "popart", name: "Pop Art", emoji: "🟡" },
  { id: "duotone", name: "Duotone", emoji: "🟣" },
  { id: "thermal", name: "Thermal", emoji: "🔥" },
  { id: "glitch", name: "Glitch", emoji: "📺" },
  { id: "halftone", name: "Halftone", emoji: "⚫" },
  { id: "anime", name: "Anime Glow", emoji: "🌸" },
];

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function edgeMap(data: Uint8ClampedArray, w: number, h: number) {
  const e = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const l = luminance(data[i]!, data[i + 1]!, data[i + 2]!);
      const lx = luminance(data[i + 4]!, data[i + 5]!, data[i + 6]!);
      const ly = luminance(data[i + w * 4]!, data[i + w * 4 + 1]!, data[i + w * 4 + 2]!);
      e[y * w + x] = Math.min(255, Math.abs(l - lx) + Math.abs(l - ly));
    }
  }
  return e;
}

export function applyArtStyle(src: Source, style: string, strength = 1): HTMLCanvasElement {
  const canvas = toCanvas(src);
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const original = new Uint8ClampedArray(d);
  const radius = Math.max(1, Math.round(Math.min(w, h) / 320));

  const posterize = (levels: number) => {
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(Math.round(d[i]! / step) * step);
      d[i + 1] = clamp(Math.round(d[i + 1]! / step) * step);
      d[i + 2] = clamp(Math.round(d[i + 2]! / step) * step);
    }
  };
  const darkenEdges = (threshold: number, softness = 1) => {
    const e = edgeMap(original, w, h);
    for (let p = 0; p < w * h; p++) {
      const strengthEdge = Math.min(1, Math.max(0, (e[p]! - threshold) / (threshold * softness)));
      if (strengthEdge <= 0) continue;
      const i = p * 4;
      d[i] = clamp(d[i]! * (1 - strengthEdge));
      d[i + 1] = clamp(d[i + 1]! * (1 - strengthEdge));
      d[i + 2] = clamp(d[i + 2]! * (1 - strengthEdge));
    }
  };

  switch (style) {
    case "cartoon": {
      boxBlur(d, w, h, radius * 2);
      posterize(6);
      darkenEdges(18);
      break;
    }
    case "anime": {
      boxBlur(d, w, h, radius * 2);
      posterize(5);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp(d[i]! * 1.08 + 8);
        d[i + 1] = clamp(d[i + 1]! * 1.02 + 6);
        d[i + 2] = clamp(d[i + 2]! * 1.1 + 12);
      }
      darkenEdges(24);
      break;
    }
    case "sketch":
    case "colorpencil": {
      const inverted = new Uint8ClampedArray(original);
      for (let i = 0; i < inverted.length; i += 4) {
        const l = 255 - luminance(inverted[i]!, inverted[i + 1]!, inverted[i + 2]!);
        inverted[i] = inverted[i + 1] = inverted[i + 2] = l;
      }
      boxBlur(inverted, w, h, radius * 4);
      for (let i = 0; i < d.length; i += 4) {
        const base = luminance(original[i]!, original[i + 1]!, original[i + 2]!);
        const top = inverted[i]!;
        const dodge = top === 255 ? 255 : Math.min(255, (base * 255) / (255 - top));
        if (style === "sketch") {
          d[i] = d[i + 1] = d[i + 2] = clamp(dodge);
        } else {
          d[i] = clamp((dodge * original[i]!) / 255 + dodge * 0.35);
          d[i + 1] = clamp((dodge * original[i + 1]!) / 255 + dodge * 0.35);
          d[i + 2] = clamp((dodge * original[i + 2]!) / 255 + dodge * 0.35);
        }
      }
      break;
    }
    case "comic": {
      boxBlur(d, w, h, radius);
      posterize(4);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp((d[i]! - 128) * 1.35 + 128);
        d[i + 1] = clamp((d[i + 1]! - 128) * 1.35 + 128);
        d[i + 2] = clamp((d[i + 2]! - 128) * 1.35 + 128);
      }
      darkenEdges(14);
      break;
    }
    case "oil": {
      boxBlur(d, w, h, radius * 3);
      posterize(8);
      sharpenData(d, w, h, 0.5);
      break;
    }
    case "watercolor": {
      boxBlur(d, w, h, radius * 4);
      posterize(7);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp(d[i]! * 0.92 + 22);
        d[i + 1] = clamp(d[i + 1]! * 0.92 + 22);
        d[i + 2] = clamp(d[i + 2]! * 0.92 + 24);
      }
      darkenEdges(30, 2);
      break;
    }
    case "neon": {
      const e = edgeMap(original, w, h);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        const v = Math.min(255, e[p]! * 3.2);
        const hue = (original[i]! + original[i + 2]!) / 2;
        d[i] = clamp(v * (0.4 + hue / 380));
        d[i + 1] = clamp(v * 0.55);
        d[i + 2] = clamp(v * (0.9 + (255 - hue) / 500));
      }
      break;
    }
    case "popart": {
      posterize(3);
      for (let i = 0; i < d.length; i += 4) {
        const l = luminance(d[i]!, d[i + 1]!, d[i + 2]!);
        if (l > 190) {
          d[i] = 250;
          d[i + 1] = 226;
          d[i + 2] = 60;
        } else if (l > 120) {
          d[i] = 236;
          d[i + 1] = 60;
          d[i + 2] = 120;
        } else if (l > 60) {
          d[i] = 40;
          d[i + 1] = 130;
          d[i + 2] = 220;
        } else {
          d[i] = 24;
          d[i + 1] = 22;
          d[i + 2] = 32;
        }
      }
      break;
    }
    case "duotone": {
      for (let i = 0; i < d.length; i += 4) {
        const t = luminance(d[i]!, d[i + 1]!, d[i + 2]!) / 255;
        d[i] = clamp(30 + t * 225);
        d[i + 1] = clamp(12 + t * 120);
        d[i + 2] = clamp(90 + t * 150);
      }
      break;
    }
    case "thermal": {
      for (let i = 0; i < d.length; i += 4) {
        const t = luminance(d[i]!, d[i + 1]!, d[i + 2]!) / 255;
        d[i] = clamp(t < 0.5 ? t * 2 * 60 : 60 + (t - 0.5) * 2 * 195);
        d[i + 1] = clamp(t < 0.6 ? t * 90 : (t - 0.6) * 2.5 * 255);
        d[i + 2] = clamp(t < 0.4 ? 140 + t * 250 : Math.max(0, 240 - t * 300));
      }
      break;
    }
    case "glitch": {
      const shift = Math.max(2, Math.round(w / 90));
      for (let y = 0; y < h; y++) {
        const band = Math.sin(y / 9) > 0.86 ? shift * 4 : 0;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const xr = Math.min(w - 1, x + shift + band);
          const xb = Math.max(0, x - shift - band);
          d[i] = original[(y * w + xr) * 4]!;
          d[i + 2] = original[(y * w + xb) * 4 + 2]!;
          if (y % 3 === 0) {
            d[i] = clamp(d[i]! * 0.85);
            d[i + 1] = clamp(d[i + 1]! * 0.85);
            d[i + 2] = clamp(d[i + 2]! * 0.9);
          }
        }
      }
      break;
    }
    case "halftone": {
      const cell = Math.max(3, Math.round(Math.min(w, h) / 150));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const cx = Math.floor(x / cell) * cell + cell / 2;
          const cy = Math.floor(y / cell) * cell + cell / 2;
          const ci = (Math.min(h - 1, Math.round(cy)) * w + Math.min(w - 1, Math.round(cx))) * 4;
          const l = luminance(original[ci]!, original[ci + 1]!, original[ci + 2]!) / 255;
          const dist = Math.hypot(x - cx, y - cy);
          const r = (1 - l) * (cell / 1.7);
          const on = dist < r;
          const v = on ? 20 : 240;
          d[i] = d[i + 1] = d[i + 2] = v;
        }
      }
      break;
    }
    default:
      break;
  }

  if (strength < 1) {
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(original[i]! + (d[i]! - original[i]!) * strength);
      d[i + 1] = clamp(original[i + 1]! + (d[i + 1]! - original[i + 1]!) * strength);
      d[i + 2] = clamp(original[i + 2]! + (d[i + 2]! - original[i + 2]!) * strength);
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}
