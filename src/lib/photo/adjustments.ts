import type { Adjustments } from "./types";

export type AdjustmentMeta = {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "Light" | "Color" | "Detail" | "Effects";
};

export const adjustmentMeta: AdjustmentMeta[] = [
  { key: "exposure", label: "Exposure", min: -100, max: 100, step: 1, group: "Light" },
  { key: "brightness", label: "Brightness", min: -100, max: 100, step: 1, group: "Light" },
  { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1, group: "Light" },
  { key: "highlights", label: "Highlights", min: -100, max: 100, step: 1, group: "Light" },
  { key: "shadows", label: "Shadows", min: -100, max: 100, step: 1, group: "Light" },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, group: "Color" },
  { key: "temperature", label: "Temperature", min: -100, max: 100, step: 1, group: "Color" },
  { key: "tint", label: "Tint", min: -100, max: 100, step: 1, group: "Color" },
  { key: "hue", label: "Hue", min: -180, max: 180, step: 1, group: "Color" },
  { key: "fade", label: "Fade", min: 0, max: 100, step: 1, group: "Color" },
  { key: "sharpen", label: "Sharpen", min: 0, max: 100, step: 1, group: "Detail" },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.1, group: "Detail" },
  { key: "grain", label: "Grain", min: 0, max: 100, step: 1, group: "Effects" },
  { key: "vignette", label: "Vignette", min: -100, max: 100, step: 1, group: "Effects" },
];
