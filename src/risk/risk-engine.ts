import type { AppConfig } from "../config.js";
import type { ArbitrageCandidate, RiskDecision, RiskSnapshot } from "../domain/types.js";

export class RiskEngine {
  constructor(
    private readonly config: Pick<
      AppConfig,
      | "MAX_CAPITAL_PER_TRADE_USD"
      | "MAX_MARKET_EXPOSURE_USD"
      | "MAX_OPEN_EXPOSURE_USD"
      | "MAX_DAILY_LOSS_USD"
      | "MAX_CONSECUTIVE_FAILURES"
    >,
  ) {}

  decide(candidate: ArbitrageCandidate, snapshot: RiskSnapshot): RiskDecision {
    if (snapshot.paused) return { approved: false, reason: "engine paused", maxCapitalUsd: 0 };
    if (snapshot.availableCapital <= 0) return { approved: false, reason: "no available capital", maxCapitalUsd: 0 };
    if (snapshot.realizedPnlToday <= -this.config.MAX_DAILY_LOSS_USD) {
      return { approved: false, reason: "daily loss limit reached", maxCapitalUsd: 0 };
    }
    if (snapshot.consecutiveFailures >= this.config.MAX_CONSECUTIVE_FAILURES) {
      return { approved: false, reason: "consecutive failure limit reached", maxCapitalUsd: 0 };
    }
    if (snapshot.openExposureUsd >= this.config.MAX_OPEN_EXPOSURE_USD) {
      return { approved: false, reason: "open exposure limit reached", maxCapitalUsd: 0 };
    }

    const multiplier = Math.max(0, Math.min(1, snapshot.supervisorRiskMultiplier));
    const maxCapitalUsd = Math.min(
      snapshot.availableCapital,
      this.config.MAX_CAPITAL_PER_TRADE_USD * multiplier,
      this.config.MAX_MARKET_EXPOSURE_USD,
      this.config.MAX_OPEN_EXPOSURE_USD - snapshot.openExposureUsd,
    );
    if (candidate.capitalRequired > maxCapitalUsd + 1e-9) {
      return { approved: false, reason: "candidate exceeds risk-adjusted capital", maxCapitalUsd };
    }
    return { approved: true, reason: "approved", maxCapitalUsd };
  }
}
