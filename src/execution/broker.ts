import type { ArbitrageCandidate, ExecutionResult } from "../domain/types.js";

export interface Broker {
  readonly mode: "paper" | "live";
  getAvailableCapital(): Promise<number>;
  execute(candidate: ArbitrageCandidate): Promise<ExecutionResult>;
  close(): Promise<void>;
}
