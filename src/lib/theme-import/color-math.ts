export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  green: "#008000",
  lime: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  aqua: "#00ffff",
  magenta: "#ff00ff",
  fuchsia: "#ff00ff",
  grey: "#808080",
  gray: "#808080",
  silver: "#c0c0c0",
  maroon: "#800000",
  olive: "#808000",
  navy: "#000080",
  teal: "#008080",
  purple: "#800080",
  orange: "#ffa500",
  pink: "#ffc0cb",
  gold: "#ffd700",
  transparent: "#00000000",
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clamp255 = (n: number) => clamp(Math.round(n), 0, 255);
const hex2 = (n: number) => clamp255(n).toString(16).padStart(2, "0");

export function parseColor(input: string): Rgba | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (s in NAMED) s = NAMED[s];

  const fn = s.match(/^(?:rgba?|hsla?)\(([^)]+)\)$/);
  if (fn) {
    const parts = fn[1].split(/[,/\s]+/).filter(Boolean);
    if (s.startsWith("hsl")) {
      const h = parseFloat(parts[0]);
      const sat = parseFloat(parts[1]) / 100;
      const li = parseFloat(parts[2]) / 100;
      const a = parts[3] != null ? parseAlphaToken(parts[3]) : 1;
      if (![h, sat, li].every(Number.isFinite)) return null;
      return { ...hslToRgb(h, sat, li), a };
    }
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    const a = parts[3] != null ? parseAlphaToken(parts[3]) : 1;
    if (![r, g, b].every(Number.isFinite)) return null;
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a };
  }

  const dec = s.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?$/);
  if (dec) {
    return {
      r: clamp255(+dec[1]),
      g: clamp255(+dec[2]),
      b: clamp255(+dec[3]),
      a: dec[4] != null ? parseAlphaToken(dec[4]) : 1,
    };
  }

  const hex = s.replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return { r: h2(hex[0]), g: h2(hex[1]), b: h2(hex[2]), a: 1 };
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return { r: h2(hex.slice(0, 2)), g: h2(hex.slice(2, 4)), b: h2(hex.slice(4, 6)), a: 1 };
  }
  if (/^[0-9a-f]{8}$/.test(hex)) {
    return {
      r: h2(hex.slice(0, 2)),
      g: h2(hex.slice(2, 4)),
      b: h2(hex.slice(4, 6)),
      a: h2(hex.slice(6, 8)) / 255,
    };
  }
  return null;
}

function h2(s: string): number {
  return parseInt(s.length === 1 ? s + s : s, 16);
}

function parseAlphaToken(t: string): number {
  const raw = t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t);
  return Number.isFinite(raw) ? clamp(raw, 0, 1) : 1;
}

export function toHex6(c: Rgb): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
}

export function toHex8(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${hex2(c.a * 255)}`;
}

export function relLum(c: Rgb): number {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function isLight(c: Rgb): boolean {
  return relLum(c) > 0.5;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const u = clamp(t, 0, 1);
  return {
    r: a.r + (b.r - a.r) * u,
    g: a.g + (b.g - a.g) * u,
    b: a.b + (b.b - a.b) * u,
  };
}

export function flattenAlpha(src: Rgba, over: Rgb): Rgb {
  return mix(over, src, src.a);
}

export function withAlpha(hex6: string, a01: number): string {
  return `${hex6}${hex2(clamp(a01, 0, 1) * 255)}`;
}

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return clamp255(c * 255);
}

type Oklab = { L: number; a: number; b: number };

function rgbToOklab(c: Rgb): Oklab {
  const r = srgbToLinear(c.r);
  const g = srgbToLinear(c.g);
  const b = srgbToLinear(c.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb(o: Oklab): Rgb {
  const l_ = o.L + 0.3963377774 * o.a + 0.2158037573 * o.b;
  const m_ = o.L - 0.1055613458 * o.a - 0.0638541728 * o.b;
  const s_ = o.L - 0.0894841775 * o.a - 1.291485548 * o.b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function lighten(c: Rgb, dL: number): Rgb {
  const o = rgbToOklab(c);
  o.L = clamp(o.L + dL, 0, 1);
  return oklabToRgb(o);
}

export function darken(c: Rgb, dL: number): Rgb {
  return lighten(c, -dL);
}

export function chroma(c: Rgb): number {
  const o = rgbToOklab(c);
  return Math.sqrt(o.a * o.a + o.b * o.b);
}

export function hue(c: Rgb): number {
  const o = rgbToOklab(c);
  const h = (Math.atan2(o.b, o.a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

export function isRedHue(c: Rgb): boolean {
  if (chroma(c) < 0.03) return false;
  const h = hue(c);
  return h <= 45 || h >= 345;
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
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
  return { r: clamp255((r + m) * 255), g: clamp255((g + m) * 255), b: clamp255((b + m) * 255) };
}
