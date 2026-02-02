export const COL_LABELS = ["B", "I", "N", "G", "O"] as const;

export function numberToLabel(n: number): string {
  if (n >= 1 && n <= 15) return `B${n}`;
  if (n >= 16 && n <= 30) return `I${n}`;
  if (n >= 31 && n <= 45) return `N${n}`;
  if (n >= 46 && n <= 60) return `G${n}`;
  return `O${n}`;
}
