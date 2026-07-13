import { describe, expect, it } from "vitest";
import { RiskEngine } from "../src/risk/risk-engine.js";
import type { ArbitrageCandidate, RiskSnapshot } from "../src/domain/types.js";

const engine = new RiskEngine({
  MAX_CAPITAL_PER_TRADE_USD: 6,
  MAX_MARKET_EXPOSURE_USD: 7,
  MAX_OPEN_EXPOSURE_USD: 7,
  MAX_DAILY_LOSS_USD: 1,
  MAX_CONSECUTIVE_FAILURES: 3,
});

const candidate = { capitalRequired: 5 } as ArbitrageCandidate;
const snapshot: RiskSnapshot = {
  mode: "paper",
  availableCapital: 10,
  realizedPnlToday: 0,
  openExposureUsd: 0,
  consecutiveFailures: 0,
  paused: false,
  supervisorRiskMultiplier: 1,
};

describe("risk engine", () => {
  it("approves inside hard limits", () => expect(engine.decide(candidate, snapshot).approved).toBe(true));
  it("fails closed at daily loss limit", () => {
    expect(engine.decide(candidate, { ...snapshot, realizedPnlToday: -1 }).approved).toBe(false);
  });
  it("applies supervisor multiplier without allowing an override", () => {
    expect(engine.decide(candidate, { ...snapshot, supervisorRiskMultiplier: 0.5 }).approved).toBe(false);
  });
});
