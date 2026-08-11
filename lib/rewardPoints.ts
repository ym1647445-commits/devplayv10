export const POINTS_PER_USD = 100;

export function calculateRewardPoints(
  totalUsd: number,
): number {
  const safeTotal = Math.max(
    0,
    Number(totalUsd),
  );

  return Math.floor(
    safeTotal * POINTS_PER_USD,
  );
}