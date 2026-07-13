import type { FeeSchedule, PriceLevel } from "./types.js";

export const EPSILON = 1e-9;

export function roundDown(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.floor((value + EPSILON) * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function takerFee(shares: number, price: number, schedule: FeeSchedule): number {
  if (shares <= 0 || price <= 0 || price >= 1 || schedule.rate <= 0) return 0;
  const exponent = schedule.exponent > 0 ? schedule.exponent : 1;
  const curve = Math.pow(price * (1 - price), exponent);
  return shares * schedule.rate * curve;
}

export interface DepthCost {
  filledShares: number;
  grossCost: number;
  fee: number;
  averagePrice: number;
  worstPrice: number;
}

export function costForShares(
  asks: PriceLevel[],
  sharesWanted: number,
  feeSchedule: FeeSchedule,
): DepthCost | null {
  if (sharesWanted <= 0) return null;

  const levels = [...asks]
    .filter((level) => level.price > 0 && level.price < 1 && level.size > 0)
    .sort((a, b) => a.price - b.price);

  let remaining = sharesWanted;
  let grossCost = 0;
  let fee = 0;
  let worstPrice = 0;

  for (const level of levels) {
    if (remaining <= EPSILON) break;
    const take = Math.min(remaining, level.size);
    grossCost += take * level.price;
    fee += takerFee(take, level.price, feeSchedule);
    worstPrice = level.price;
    remaining -= take;
  }

  if (remaining > 1e-6) return null;

  return {
    filledShares: sharesWanted,
    grossCost,
    fee,
    averagePrice: grossCost / sharesWanted,
    worstPrice,
  };
}

export function cumulativeSizes(levels: PriceLevel[]): number[] {
  const sorted = [...levels]
    .filter((level) => level.size > 0)
    .sort((a, b) => a.price - b.price);
  let total = 0;
  return sorted.map((level) => {
    total += level.size;
    return total;
  });
}

export function requiredDailyCompoundRate(start: number, target: number, days: number): number {
  if (start <= 0 || target <= 0 || days <= 0) return Number.NaN;
  return Math.pow(target / start, 1 / days) - 1;
}
