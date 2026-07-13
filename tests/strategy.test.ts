import { describe, expect, it } from "vitest";
import type { MarketRuntimeInfo, OrderBook } from "../src/domain/types.js";
import { evaluateCompleteSet } from "../src/strategy/complete-set.js";

const runtime: MarketRuntimeInfo = {
  market: {
    conditionId: `0x${"11".repeat(32)}`,
    question: "Test market?",
    slug: "test-market",
    yesTokenId: "yes",
    noTokenId: "no",
    yesLabel: "Yes",
    noLabel: "No",
    active: true,
    closed: false,
    negRisk: false,
  },
  fee: { rate: 0, exponent: 1, takerOnly: true },
  minOrderSize: 5,
  tickSize: 0.01,
  takerDelay: false,
};

function book(tokenId: string, price: number): OrderBook {
  return {
    tokenId,
    marketId: runtime.market.conditionId,
    timestampMs: Date.now(),
    bids: [],
    asks: [{ price, size: 20 }],
    minOrderSize: 5,
    tickSize: 0.01,
  };
}

const cfg = {
  BOOK_STALE_MS: 10_000,
  MIN_NET_EDGE_BPS: 50,
  MIN_EXPECTED_PROFIT_USD: 0.01,
  SAFETY_RESERVE_BPS: 0,
};

describe("complete-set strategy", () => {
  it("accepts a truly profitable full set", () => {
    const candidate = evaluateCompleteSet(runtime, book("yes", 0.45), book("no", 0.45), cfg, 6);
    expect(candidate).not.toBeNull();
    expect(candidate?.shares).toBeGreaterThanOrEqual(5);
    expect(candidate?.expectedProfit).toBeGreaterThan(0);
  });

  it("rejects a non-profitable pair", () => {
    const candidate = evaluateCompleteSet(runtime, book("yes", 0.50), book("no", 0.50), cfg, 6);
    expect(candidate).toBeNull();
  });

  it("rejects stale books", () => {
    const stale = book("yes", 0.4);
    stale.timestampMs -= 20_000;
    expect(evaluateCompleteSet(runtime, stale, book("no", 0.4), cfg, 6)).toBeNull();
  });

  it("handles markets reporting zero min order size without exploding", () => {
    const zeroMinRuntime: MarketRuntimeInfo = { ...runtime, minOrderSize: 0 };
    const yes = { ...book("yes", 0.45), minOrderSize: 0 };
    const no = { ...book("no", 0.45), minOrderSize: 0 };
    expect(() => evaluateCompleteSet(zeroMinRuntime, yes, no, cfg, 6)).not.toThrow();
    const candidate = evaluateCompleteSet(zeroMinRuntime, yes, no, cfg, 200);
    expect(candidate).not.toBeNull();
  });
});
