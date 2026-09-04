export type Adjustments = {
  brightness: number;
  contrast: number;
  exposure: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  blur: number;
  sharpen: number;
  vignette: number;
  grain: number;
  fade: number;
  hue: number;
};

export const defaultAdjustments: Adjustments = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  blur: 0,
  sharpen: 0,
  vignette: 0,
  grain: 0,
  fade: 0,
  hue: 0,
};

export type Geometry = {
  rotation: number; // degrees, multiples of 90
  flipH: boolean;
  flipV: boolean;
  cropAspect: number | null; // width / height, null = original
};

export const defaultGeometry: Geometry = {
  rotation: 0,
  flipH: false,
  flipV: false,
  cropAspect: null,
};

export type EditState = {
  adjustments: Adjustments;
  geometry: Geometry;
  filterId: string;
  filterStrength: number;
};

export const defaultEditState: EditState = {
  adjustments: { ...defaultAdjustments },
  geometry: { ...defaultGeometry },
  filterId: "original",
  filterStrength: 100,
};
