import { randomUUID } from "node:crypto";
import type { ArbitrageCandidate, ExecutionResult } from "../domain/types.js";
import type { Broker } from "./broker.js";

export class PaperBroker implements Broker {
  readonly mode = "paper" as const;
  private capital: number;

  constructor(startingCapital: number) {
    this.capital = startingCapital;
  }

  async getAvailableCapital(): Promise<number> {
    return this.capital;
  }

  async execute(candidate: ArbitrageCandidate): Promise<ExecutionResult> {
    const startedAt = new Date().toISOString();
    if (candidate.capitalRequired > this.capital) throw new Error("insufficient paper capital");
    this.capital += candidate.expectedProfit;
    const completedAt = new Date().toISOString();
    return {
      executionId: randomUUID(),
      candidateId: candidate.id,
      mode: "paper",
      status: "SIMULATED",
      startedAt,
      completedAt,
      yes: {
        tokenId: candidate.yes.tokenId,
        requestedSpend: candidate.yes.grossCost + candidate.yes.fee,
        requestedShares: candidate.shares,
        filledShares: candidate.shares,
        actualSpend: candidate.yes.grossCost,
        feePaid: candidate.yes.fee,
        status: "SIMULATED_FILLED",
      },
      no: {
        tokenId: candidate.no.tokenId,
        requestedSpend: candidate.no.grossCost + candidate.no.fee,
        requestedShares: candidate.shares,
        filledShares: candidate.shares,
        actualSpend: candidate.no.grossCost,
        feePaid: candidate.no.fee,
        status: "SIMULATED_FILLED",
      },
      mergedShares: candidate.shares,
      realizedPnl: candidate.expectedProfit,
    };
  }

  async close(): Promise<void> {}
}
