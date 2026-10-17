export function nameHue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function nameColor(name: string, lightness = 0.78, chroma = 0.13): string {
  return `oklch(${lightness} ${chroma} ${nameHue(name)})`;
}
