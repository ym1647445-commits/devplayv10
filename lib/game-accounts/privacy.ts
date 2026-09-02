export function maskGameIdentifier(value: string): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= 4) return "•".repeat(clean.length);
  return `${"•".repeat(Math.min(7, clean.length - 4))}${clean.slice(-4)}`;
}
