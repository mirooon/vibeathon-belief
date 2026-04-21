export function round4(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
