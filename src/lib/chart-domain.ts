export type Domain = [number, number];
/** Wheel hardware has no standard mouse/trackpad flag; preserve small smooth vertical scroll. */
export function wheelIntent(dx:number, dy:number, mode:number, ctrl=false, shift=false): "pan" | "zoom" | "scroll" {
  if(Math.abs(dx)>Math.abs(dy))return "pan";
  const amount=Math.abs(dy);
  return ctrl||shift||mode!==0||amount>=400||(amount>=40&&(amount%40===0||amount%100===0))?"zoom":"scroll";
}
export function clampDomain(domain: Domain, max: number): Domain {
  const width = Math.min(max, Math.max(Math.min(5, max), domain[1] - domain[0]));
  const start = Math.max(0, Math.min(max - width, domain[0]));
  return [start, start + width];
}
export function panDomain(domain: Domain, shift: number, max: number): Domain {
  return clampDomain([domain[0] + shift, domain[1] + shift], max);
}
export function zoomDomain(domain: Domain, fraction: number, factor: number, max: number): Domain {
  const anchor = domain[0] + fraction * (domain[1] - domain[0]);
  const width = Math.min(max, Math.max(Math.min(5, max), (domain[1] - domain[0]) * factor));
  return clampDomain([anchor - width * fraction, anchor + width * (1 - fraction)], max);
}
