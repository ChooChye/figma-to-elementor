/// <reference types="@figma/plugin-typings" />

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function rgbaToString(r: number, g: number, b: number, a: number): string {
  if (a >= 1) return rgbToHex(r, g, b);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${parseFloat(a.toFixed(3))})`;
}

export interface FillResult {
  type: 'solid' | 'gradient' | 'image' | 'none';
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
}

export function extractFill(fills: ReadonlyArray<Paint> | typeof figma.mixed): FillResult {
  const none: FillResult = { type: 'none', color: '', gradientStart: '', gradientEnd: '', gradientAngle: 135 };
  if (fills === figma.mixed || !fills || fills.length === 0) return none;
  const fill = [...fills].reverse().find(f => f.visible !== false);
  if (!fill) return none;

  if (fill.type === 'SOLID') {
    const { r, g, b } = fill.color;
    const a = fill.opacity !== undefined ? fill.opacity : 1;
    return { type: 'solid', color: rgbaToString(r, g, b, a), gradientStart: '', gradientEnd: '', gradientAngle: 135 };
  }

  if (fill.type === 'IMAGE') {
    return { type: 'image', color: '', gradientStart: '', gradientEnd: '', gradientAngle: 135 };
  }

  if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
    const stops = fill.gradientStops;
    if (stops.length >= 2) {
      const s0 = stops[0].color;
      const s1 = stops[stops.length - 1].color;
      const start = rgbaToString(s0.r, s0.g, s0.b, s0.a);
      const end = rgbaToString(s1.r, s1.g, s1.b, s1.a);
      const m = fill.gradientTransform;
      const angle = Math.round(Math.atan2(m[1][0], m[0][0]) * (180 / Math.PI) + 90);
      return {
        type: 'gradient',
        color: start,
        gradientStart: start,
        gradientEnd: end,
        gradientAngle: ((angle % 360) + 360) % 360,
      };
    }
    return none;
  }

  return none;
}

export interface ShadowResult {
  hasShadow: boolean;
  h: number;
  v: number;
  blur: number;
  spread: number;
  color: string;
}

export function extractShadow(effects: ReadonlyArray<Effect>): ShadowResult {
  const shadow = effects.find(
    e => e.type === 'DROP_SHADOW' && e.visible !== false
  ) as DropShadowEffect | undefined;
  if (!shadow) {
    return { hasShadow: false, h: 0, v: 0, blur: 0, spread: 0, color: 'rgba(0,0,0,0.5)' };
  }
  const { r, g, b, a } = shadow.color;
  return {
    hasShadow: true,
    h: Math.round(shadow.offset.x),
    v: Math.round(shadow.offset.y),
    blur: Math.round(shadow.radius),
    spread: Math.round(shadow.spread ?? 0),
    color: rgbaToString(r, g, b, a),
  };
}
