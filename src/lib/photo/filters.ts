import type { Adjustments } from "./types";

export type FilterPreset = {
  id: string;
  name: string;
  group: string;
  adj: Partial<Adjustments>;
};

const f = (
  id: string,
  name: string,
  group: string,
  adj: Partial<Adjustments>,
): FilterPreset => ({ id, name, group, adj });

export const filterPresets: FilterPreset[] = [
  f("original", "Original", "Basic", {}),

  // Classic / Instagram-like
  f("clarendon", "Clarendon", "Classic", { contrast: 22, saturation: 20, brightness: 6 }),
  f("gingham", "Gingham", "Classic", { fade: 25, contrast: -8, temperature: -10 }),
  f("juno", "Juno", "Classic", { saturation: 28, temperature: 12, contrast: 10 }),
  f("lark", "Lark", "Classic", { brightness: 10, saturation: -8, exposure: 8 }),
  f("ludwig", "Ludwig", "Classic", { contrast: 12, saturation: -14, brightness: 6 }),
  f("valencia", "Valencia", "Classic", { temperature: 18, fade: 14, saturation: 8 }),
  f("nashville", "Nashville", "Classic", { temperature: 26, fade: 22, contrast: -6 }),
  f("aden", "Aden", "Classic", { temperature: -8, saturation: -18, fade: 18 }),
  f("perpetua", "Perpetua", "Classic", { saturation: 14, tint: -10, contrast: 8 }),
  f("reyes", "Reyes", "Classic", { fade: 30, saturation: -20, brightness: 8 }),
  f("slumber", "Slumber", "Classic", { fade: 20, saturation: -12, temperature: 8 }),
  f("crema", "Crema", "Classic", { fade: 16, temperature: 6, contrast: 6 }),

  // Vintage
  f("vintage", "Vintage", "Vintage", { temperature: 22, fade: 26, saturation: -16, vignette: 30 }),
  f("retro70", "Retro 70s", "Vintage", { temperature: 30, saturation: 10, fade: 20, contrast: -8 }),
  f("polaroid", "Polaroid", "Vintage", { fade: 34, brightness: 8, saturation: -10 }),
  f("kodak", "Kodak", "Vintage", { temperature: 16, saturation: 18, contrast: 12 }),
  f("fuji", "Fuji", "Vintage", { temperature: -12, saturation: 12, contrast: 10 }),
  f("sepia", "Sepia", "Vintage", { temperature: 40, saturation: -55, contrast: 8 }),
  f("faded", "Faded", "Vintage", { fade: 42, contrast: -12, saturation: -8 }),
  f("dust", "Dust", "Vintage", { grain: 40, fade: 20, temperature: 10 }),
  f("super8", "Super 8", "Vintage", { grain: 55, temperature: 20, vignette: 34 }),
  f("expired", "Expired", "Vintage", { tint: 22, fade: 24, saturation: -14 }),

  // Cinematic
  f("cinema", "Cinematic", "Cinematic", { contrast: 20, temperature: -14, saturation: -6, vignette: 26 }),
  f("tealorange", "Teal & Orange", "Cinematic", { temperature: 20, tint: -18, contrast: 18 }),
  f("noir", "Noir", "Cinematic", { saturation: -100, contrast: 34, vignette: 40 }),
  f("moody", "Moody", "Cinematic", { brightness: -10, contrast: 22, saturation: -14, shadows: -18 }),
  f("blockbuster", "Blockbuster", "Cinematic", { contrast: 26, saturation: 12, temperature: -10 }),
  f("noirsoft", "Soft Noir", "Cinematic", { saturation: -100, contrast: 14, fade: 20 }),
  f("thriller", "Thriller", "Cinematic", { temperature: -22, contrast: 24, shadows: -20 }),
  f("desert", "Desert", "Cinematic", { temperature: 28, saturation: -8, highlights: 12 }),
  f("nordic", "Nordic", "Cinematic", { temperature: -26, saturation: -10, brightness: 6 }),
  f("goldhour", "Golden Hour", "Cinematic", { temperature: 30, exposure: 10, saturation: 14 }),

  // Portrait
  f("softskin", "Soft Skin", "Portrait", { brightness: 8, contrast: -6, saturation: -6, blur: 1 }),
  f("glow", "Glow", "Portrait", { exposure: 14, highlights: 12, fade: 12 }),
  f("porcelain", "Porcelain", "Portrait", { brightness: 12, saturation: -18, contrast: -4 }),
  f("warmportrait", "Warm Portrait", "Portrait", { temperature: 14, brightness: 6, saturation: 8 }),
  f("beauty", "Beauty", "Portrait", { brightness: 10, blur: 0.6, saturation: 6 }),
  f("bronze", "Bronze", "Portrait", { temperature: 22, contrast: 10, saturation: 10 }),

  // Vivid
  f("vivid", "Vivid", "Vivid", { saturation: 40, contrast: 18 }),
  f("punch", "Punch", "Vivid", { saturation: 30, contrast: 28, exposure: 6 }),
  f("tropic", "Tropic", "Vivid", { saturation: 34, temperature: 10, tint: -8 }),
  f("neon", "Neon", "Vivid", { saturation: 55, hue: 12, contrast: 20 }),
  f("candy", "Candy", "Vivid", { saturation: 38, hue: -14, brightness: 8 }),
  f("pop", "Pop Art", "Vivid", { saturation: 60, contrast: 34 }),
  f("sunburst", "Sunburst", "Vivid", { exposure: 16, temperature: 24, saturation: 22 }),

  // Mono
  f("mono", "Mono", "Mono", { saturation: -100 }),
  f("monohigh", "High Key BW", "Mono", { saturation: -100, brightness: 14, contrast: 10 }),
  f("monolow", "Low Key BW", "Mono", { saturation: -100, brightness: -14, contrast: 26 }),
  f("silver", "Silver", "Mono", { saturation: -100, fade: 18, contrast: 8 }),
  f("inkwell", "Inkwell", "Mono", { saturation: -100, contrast: 20, grain: 20 }),
  f("platinum", "Platinum", "Mono", { saturation: -90, temperature: 8, fade: 14 }),

  // Creative
  f("glitchpop", "Glitch Pop", "Creative", { hue: 40, saturation: 30, contrast: 18 }),
  f("infrared", "Infrared", "Creative", { hue: 150, saturation: 40 }),
  f("cyberpunk", "Cyberpunk", "Creative", { hue: -30, saturation: 45, contrast: 24, vignette: 24 }),
  f("dreamy", "Dreamy", "Creative", { blur: 1.4, fade: 22, brightness: 8 }),
  f("frost", "Frost", "Creative", { temperature: -30, saturation: -6, brightness: 8 }),
  f("ember", "Ember", "Creative", { temperature: 34, shadows: -14, vignette: 30 }),
  f("smoke", "Smoke", "Creative", { saturation: -34, fade: 26, contrast: 10 }),
  f("grainy", "Heavy Grain", "Creative", { grain: 70, contrast: 12 }),
];

export const filterGroups = Array.from(new Set(filterPresets.map((p) => p.group)));

export function applyFilterToAdjustments(
  base: Adjustments,
  preset: FilterPreset | undefined,
  strength: number,
): Adjustments {
  if (!preset) return base;
  const k = strength / 100;
  const out = { ...base };
  (Object.keys(preset.adj) as (keyof Adjustments)[]).forEach((key) => {
    const v = preset.adj[key];
    if (typeof v === "number") out[key] = out[key] + v * k;
  });
  return out;
}
