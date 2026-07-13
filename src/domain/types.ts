export type RunMode = "scanner" | "paper" | "live";

export interface PriceLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  tokenId: string;
  marketId: string;
  timestampMs: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  minOrderSize: number;
  tickSize: number;
  hash?: string;
}

export interface BinaryMarket {
  conditionId: string;
  question: string;
  slug: string;
  yesTokenId: string;
  noTokenId: string;
  yesLabel: string;
  noLabel: string;
  active: boolean;
  closed: boolean;
  negRisk: boolean;
  feesEnabled?: boolean;
  category?: string;
  liquidity?: number;
  volume24h?: number;
  endDate?: string;
}

export interface FeeSchedule {
  rate: number;
  exponent: number;
  takerOnly: boolean;
}

export interface MarketRuntimeInfo {
  market: BinaryMarket;
  fee: FeeSchedule;
  minOrderSize: number;
  tickSize: number;
  takerDelay: boolean;
}

export interface LegQuote {
  tokenId: string;
  label: string;
  shares: number;
  grossCost: number;
  fee: number;
  averagePrice: number;
  worstPrice: number;
}

export interface ArbitrageCandidate {
  id: string;
  detectedAt: string;
  strategy: "BUY_COMPLETE_SET";
  market: BinaryMarket;
  shares: number;
  yes: LegQuote;
  no: LegQuote;
  grossCost: number;
  fees: number;
  safetyReserve: number;
  expectedPayout: number;
  expectedProfit: number;
  netEdgeBps: number;
  capitalRequired: number;
  fingerprint: string;
}

export interface RiskSnapshot {
  mode: RunMode;
  availableCapital: number;
  realizedPnlToday: number;
  openExposureUsd: number;
  consecutiveFailures: number;
  paused: boolean;
  supervisorRiskMultiplier: number;
}

export interface RiskDecision {
  approved: boolean;
  reason: string;
  maxCapitalUsd: number;
}

export interface ExecutionLegResult {
  tokenId: string;
  requestedSpend: number;
  requestedShares: number;
  filledShares: number;
  actualSpend: number;
  feePaid: number;
  orderId?: string;
  status: string;
  raw?: unknown;
}

export interface ExecutionResult {
  executionId: string;
  candidateId: string;
  mode: RunMode;
  status: "SIMULATED" | "COMPLETED" | "PARTIAL" | "FAILED";
  startedAt: string;
  completedAt: string;
  yes: ExecutionLegResult;
  no: ExecutionLegResult;
  mergedShares: number;
  realizedPnl: number;
  error?: string;
}

export interface EngineStats {
  startedAt: string;
  mode: RunMode;
  marketsTracked: number;
  candidatesSeen: number;
  candidatesApproved: number;
  executions: number;
  successfulExecutions: number;
  failedExecutions: number;
  realizedPnl: number;
  virtualCapital: number;
  lastCandidateAt?: string;
  lastExecutionAt?: string;
  paused: boolean;
  pauseReason?: string;
}

export interface SupervisorInput {
  stats: EngineStats;
  risk: RiskSnapshot;
  recentErrors: string[];
  recentCandidates: Array<{
    market: string;
    expectedProfit: number;
    edgeBps: number;
    capitalRequired: number;
  }>;
}

export interface SupervisorDecision {
  action: "CONTINUE" | "REDUCE_RISK" | "PAUSE";
  riskMultiplier: number;
  reason: string;
  expiresInMinutes: number;
}
