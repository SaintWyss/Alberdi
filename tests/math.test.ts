import { describe, expect, it } from "vitest";
import { costForShares, requiredDailyCompoundRate, takerFee } from "../src/domain/math.js";

const fee = { rate: 0.07, exponent: 1, takerOnly: true };

describe("fee-aware math", () => {
  it("shows why 0.48 + 0.49 is not profitable after current crypto taker fees", () => {
    const total = 0.48 + 0.49 + takerFee(1, 0.48, fee) + takerFee(1, 0.49, fee);
    expect(total).toBeGreaterThan(1);
  });

  it("walks depth instead of trusting best ask", () => {
    const result = costForShares([
      { price: 0.45, size: 2 },
      { price: 0.48, size: 3 },
    ], 5, { rate: 0, exponent: 1, takerOnly: true });
    expect(result?.grossCost).toBeCloseTo(2.34, 10);
    expect(result?.averagePrice).toBeCloseTo(0.468, 10);
    expect(result?.worstPrice).toBe(0.48);
  });

  it("computes the 10x-in-seven-days hurdle", () => {
    expect(requiredDailyCompoundRate(10, 100, 7)).toBeCloseTo(0.389495, 5);
  });
});
