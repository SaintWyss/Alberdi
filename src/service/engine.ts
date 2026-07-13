import type { AppConfig } from "../config.js";
import type {
  ArbitrageCandidate,
  EngineStats,
  MarketRuntimeInfo,
  RiskSnapshot,
} from "../domain/types.js";
import type { Broker } from "../execution/broker.js";
import { AuditStore } from "../infrastructure/audit-store.js";
import type { Logger } from "../infrastructure/logger.js";
import { BookStore } from "../polymarket/book-store.js";
import { ClobPublicClient } from "../polymarket/clob-public.js";
import { GammaClient } from "../polymarket/gamma-client.js";
import { MarketWebSocket } from "../polymarket/market-websocket.js";
import { RiskEngine } from "../risk/risk-engine.js";
import { evaluateCompleteSet } from "../strategy/complete-set.js";
import { OpenAISupervisor } from "../agent/openai-supervisor.js";
import { Metrics } from "./metrics.js";
import { StatusServer } from "./status-server.js";

export class TradingEngine {
  private readonly gamma: GammaClient;
  private readonly clob: ClobPublicClient;
  private readonly books = new BookStore();
  private readonly websocket: MarketWebSocket;
  private readonly audit: AuditStore;
  private readonly risk: RiskEngine;
  private readonly supervisor: OpenAISupervisor;
  private readonly metrics = new Metrics();
  private readonly server: StatusServer;
  private runtimes: MarketRuntimeInfo[] = [];
  private evaluationTimer?: NodeJS.Timeout;
  private discoveryTimer?: NodeJS.Timeout;
  private supervisionTimer?: NodeJS.Timeout;
  private evaluating = false;
  private refreshing = false;
  private stopped = false;
  private supervisorRiskMultiplier = 1;
  private consecutiveFailures = 0;
  private readonly cooldown = new Map<string, number>();
  private readonly recentErrors: string[] = [];
  private readonly recentCandidates: ArbitrageCandidate[] = [];
  private stats: EngineStats;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly broker?: Broker,
  ) {
    this.gamma = new GammaClient(config, logger);
    this.clob = new ClobPublicClient(config, logger);
    this.websocket = new MarketWebSocket(config, this.books, logger);
    this.audit = new AuditStore(config.DATA_DIR);
    this.risk = new RiskEngine(config);
    this.supervisor = new OpenAISupervisor(config, logger);
    this.stats = {
      startedAt: new Date().toISOString(),
      mode: config.mode,
      marketsTracked: 0,
      candidatesSeen: 0,
      candidatesApproved: 0,
      executions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      realizedPnl: this.audit.totalRealizedPnl(),
      virtualCapital: config.STARTING_CAPITAL_USD + this.audit.totalRealizedPnl(),
      paused: false,
    };
    this.server = new StatusServer(config.HTTP_PORT, this.metrics, () => this.getStats());
  }

  getStats(): EngineStats {
    return { ...this.stats };
  }

  private pause(reason: string): void {
    this.stats.paused = true;
    this.stats.pauseReason = reason;
    this.audit.event("warn", "ENGINE_PAUSED", reason);
    this.logger.error({ reason }, "engine paused");
  }

  private async capital(): Promise<number> {
    if (this.broker) return this.broker.getAvailableCapital();
    return this.config.STARTING_CAPITAL_USD;
  }

  private async refreshMarkets(): Promise<void> {
    if (this.refreshing || this.stopped) return;
    this.refreshing = true;
    try {
      const markets = await this.gamma.discoverBinaryMarkets();
      const runtimes: MarketRuntimeInfo[] = [];
      for (const market of markets) {
        try {
          runtimes.push(await this.clob.runtimeInfo(market));
        } catch (error) {
          this.logger.debug({ err: error, conditionId: market.conditionId }, "market runtime metadata unavailable");
        }
      }
      const seeds = await this.clob.seedBooks(runtimes.map((r) => r.market));
      this.books.clear();
      for (const book of seeds) this.books.replace(book);
      this.websocket.stop();
      await this.websocket.start(runtimes.map((r) => r.market));
      this.runtimes = runtimes;
      this.stats.marketsTracked = runtimes.length;
      this.metrics.markets.set(runtimes.length);
      this.logger.info({ markets: runtimes.length, books: seeds.length }, "market universe refreshed");
    } finally {
      this.refreshing = false;
    }
  }

  private rememberCandidate(candidate: ArbitrageCandidate): void {
    this.recentCandidates.unshift(candidate);
    if (this.recentCandidates.length > 20) this.recentCandidates.length = 20;
  }

  private async snapshot(availableCapital: number): Promise<RiskSnapshot> {
    return {
      mode: this.config.mode,
      availableCapital,
      realizedPnlToday: this.audit.realizedPnlToday(),
      openExposureUsd: 0,
      consecutiveFailures: this.consecutiveFailures,
      paused: this.stats.paused,
      supervisorRiskMultiplier: this.supervisorRiskMultiplier,
    };
  }

  private async evaluate(): Promise<void> {
    if (this.evaluating || this.refreshing || this.stopped || this.stats.paused) return;
    this.evaluating = true;
    try {
      const availableCapital = await this.capital();
      this.stats.virtualCapital = availableCapital;
      this.metrics.capital.set(availableCapital);
      if (this.config.STOP_AT_TARGET && availableCapital >= this.config.TARGET_CAPITAL_USD) {
        this.pause(`target capital reached: $${availableCapital.toFixed(2)}`);
        return;
      }

      for (const runtime of this.runtimes) {
        const yesBook = this.books.get(runtime.market.yesTokenId);
        const noBook = this.books.get(runtime.market.noTokenId);
        if (!yesBook || !noBook) continue;
        const candidate = evaluateCompleteSet(
          runtime,
          yesBook,
          noBook,
          this.config,
          Math.min(availableCapital, this.config.MAX_CAPITAL_PER_TRADE_USD * this.supervisorRiskMultiplier),
        );
        if (!candidate) continue;
        const last = this.cooldown.get(candidate.market.conditionId) ?? 0;
        if (Date.now() - last < this.config.OPPORTUNITY_COOLDOWN_MS) continue;
        this.cooldown.set(candidate.market.conditionId, Date.now());
        this.stats.candidatesSeen += 1;
        this.stats.lastCandidateAt = candidate.detectedAt;
        this.metrics.candidates.inc();
        this.metrics.edge.observe(candidate.netEdgeBps);
        this.audit.saveCandidate(candidate);
        this.rememberCandidate(candidate);
        this.logger.info({
          question: candidate.market.question,
          shares: candidate.shares,
          capital: candidate.capitalRequired,
          expectedProfit: candidate.expectedProfit,
          edgeBps: candidate.netEdgeBps,
        }, "fee-aware complete-set opportunity");

        if (this.config.mode === "scanner" || !this.broker) continue;
        const decision = this.risk.decide(candidate, await this.snapshot(availableCapital));
        if (!decision.approved) {
          this.logger.debug({ reason: decision.reason }, "candidate rejected by risk engine");
          continue;
        }
        this.stats.candidatesApproved += 1;
        this.metrics.approvals.inc();
        const result = await this.broker.execute(candidate);
        this.audit.saveExecution(result);
        this.stats.executions += 1;
        this.stats.lastExecutionAt = result.completedAt;
        this.stats.realizedPnl += result.realizedPnl;
        this.metrics.executions.inc({ status: result.status, mode: result.mode });
        this.metrics.pnl.set(this.stats.realizedPnl);

        if (result.status === "COMPLETED" || result.status === "SIMULATED") {
          this.stats.successfulExecutions += 1;
          this.consecutiveFailures = 0;
          this.logger.info({ pnl: result.realizedPnl, status: result.status }, "arbitrage cycle completed");
        } else {
          this.stats.failedExecutions += 1;
          this.consecutiveFailures += 1;
          const error = result.error ?? `${result.status} execution`;
          this.recentErrors.unshift(error);
          if (this.recentErrors.length > 20) this.recentErrors.length = 20;
          if (result.status === "PARTIAL") this.pause(`partial fill detected: ${error}`);
          else if (this.consecutiveFailures >= this.config.MAX_CONSECUTIVE_FAILURES) this.pause("execution failure limit reached");
        }
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recentErrors.unshift(message);
      if (this.recentErrors.length > 20) this.recentErrors.length = 20;
      this.audit.event("error", "EVALUATION_ERROR", message);
      this.logger.error({ err: error }, "evaluation loop failed");
    } finally {
      this.evaluating = false;
    }
  }

  private async supervise(): Promise<void> {
    if (!this.supervisor.enabled || this.stopped) return;
    const availableCapital = await this.capital();
    const decision = await this.supervisor.review({
      stats: this.getStats(),
      risk: await this.snapshot(availableCapital),
      recentErrors: [...this.recentErrors],
      recentCandidates: this.recentCandidates.map((candidate) => ({
        market: candidate.market.question,
        expectedProfit: candidate.expectedProfit,
        edgeBps: candidate.netEdgeBps,
        capitalRequired: candidate.capitalRequired,
      })),
    });
    this.audit.saveSupervisorDecision(decision);
    this.supervisorRiskMultiplier = decision.action === "PAUSE" ? 0 : decision.riskMultiplier;
    if (decision.action === "PAUSE") this.pause(`OpenAI supervisor: ${decision.reason}`);
    else this.logger.info({ decision }, "OpenAI supervision completed");
  }

  async start(): Promise<void> {
    await this.clob.health();
    await this.refreshMarkets();
    this.server.start();
    this.evaluationTimer = setInterval(() => void this.evaluate(), this.config.EVALUATION_INTERVAL_MS);
    this.discoveryTimer = setInterval(() => void this.refreshMarkets().catch((error) => this.logger.error({ err: error }, "market refresh failed")), this.config.DISCOVERY_REFRESH_MS);
    if (this.supervisor.enabled) {
      await this.supervise();
      this.supervisionTimer = setInterval(() => void this.supervise().catch((error) => this.logger.error({ err: error }, "supervision loop failed")), this.config.OPENAI_SUPERVISION_INTERVAL_MS);
    }
    this.logger.info({ mode: this.config.mode, statusPort: this.config.HTTP_PORT }, "engine started");
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.evaluationTimer) clearInterval(this.evaluationTimer);
    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
    if (this.supervisionTimer) clearInterval(this.supervisionTimer);
    this.websocket.stop();
    await this.broker?.close();
    await this.server.close();
    this.audit.close();
  }
}
