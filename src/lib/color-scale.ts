/**
 * Turning one brand colour into a usable 50–900 ramp.
 *
 * RGB blending (the previous `lighten`/`darken`) washes the hue out: adding
 * white always mutes it and adding black always muddies it. Here the colour is
 * converted to HSL, the hue is kept, and each step moves a fixed fraction of
 * the remaining headroom towards white (lighter steps) or black (darker steps).
 *
 * The 500 step is the input itself, so a tenant's chosen brand colour keeps its
 * exact value. Saturation is capped and damped on the outer steps so a vivid
 * input does not become neon at the light end or a flat grey at the dark end.
 */

export const COLOR_SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export type ColorScaleStep = (typeof COLOR_SCALE_STEPS)[number];

export type ColorScale = Record<ColorScaleStep, string>;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Fraction of the remaining light headroom each light step takes. */
const LIGHT_STEPS: Record<Exclude<ColorScaleStep, 500 | 600 | 700 | 800 | 900>, number> = {
  50: 0.9,
  100: 0.72,
  200: 0.54,
  300: 0.36,
  400: 0.16,
};

/** Fraction of the remaining dark headroom each dark step takes. */
const DARK_STEPS: Record<Exclude<ColorScaleStep, 50 | 100 | 200 | 300 | 400 | 500>, number> = {
  600: 0.18,
  700: 0.36,
  800: 0.55,
  900: 0.75,
};

type Hsl = { h: number; s: number; l: number };

function parseHex(hex: string): [number, number, number] {
  const value = hex.trim();
  if (!HEX.test(value)) throw new Error(`Invalid hex colour: ${hex}`);
  const raw = value.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((part) => part + part)
          .join("")
      : raw;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** A step's saturation: capped below neon and gently reduced away from 500. */
function stepSaturation(s: number, intensity: number): number {
  // An achromatic input stays achromatic; raising it would invent a hue.
  if (s < 0.01) return 0;
  return Math.min(s, 0.92) * (1 - 0.15 * intensity);
}

function stepColor(base: Hsl, lightness: number, intensity: number): string {
  return toHex(hslToRgb({ h: base.h, s: stepSaturation(base.s, intensity), l: lightness }));
}

export function colorScale(hex: string): ColorScale {
  const [r, g, b] = parseHex(hex);
  const base = rgbToHsl(r, g, b);
  const exact = toHex([r, g, b]);

  const scale = { 500: exact } as ColorScale;

  for (const step of [50, 100, 200, 300, 400] as const) {
    const fraction = LIGHT_STEPS[step];
    scale[step] = stepColor(base, base.l + (1 - base.l) * fraction, fraction);
  }
  for (const step of [600, 700, 800, 900] as const) {
    const fraction = DARK_STEPS[step];
    scale[step] = stepColor(base, base.l * (1 - fraction), fraction);
  }

  return scale;
}

/** WCAG 2.x relative luminance for an sRGB colour. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(parseHex(a));
  const second = relativeLuminance(parseHex(b));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** White or the app's ink, whichever reads better on the supplied colour. */
export function readableTextOn(hex: string): "#FFFFFF" | "#201A16" {
  const white = contrastRatio("#FFFFFF", hex);
  const ink = contrastRatio("#201A16", hex);
  return white >= ink ? "#FFFFFF" : "#201A16";
}
