import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  ArbitrageCandidate,
  ExecutionResult,
  SupervisorDecision,
} from "../domain/types.js";

export class AuditStore {
  private readonly db: DatabaseSync;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(join(dataDir, "poly-arb.sqlite"));
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        detected_at TEXT NOT NULL,
        condition_id TEXT NOT NULL,
        question TEXT NOT NULL,
        shares REAL NOT NULL,
        capital_required REAL NOT NULL,
        expected_profit REAL NOT NULL,
        edge_bps REAL NOT NULL,
        fingerprint TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_candidates_detected_at ON candidates(detected_at);
      CREATE INDEX IF NOT EXISTS idx_candidates_condition_id ON candidates(condition_id);

      CREATE TABLE IF NOT EXISTS executions (
        execution_id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        realized_pnl REAL NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_executions_completed_at ON executions(completed_at);

      CREATE TABLE IF NOT EXISTS supervisor_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        action TEXT NOT NULL,
        risk_multiplier REAL NOT NULL,
        reason TEXT NOT NULL,
        expires_in_minutes INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        level TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT
      );
    `);
  }

  saveCandidate(candidate: ArbitrageCandidate): void {
    this.db
      .prepare(`
        INSERT OR IGNORE INTO candidates (
          id, detected_at, condition_id, question, shares,
          capital_required, expected_profit, edge_bps, fingerprint, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        candidate.id,
        candidate.detectedAt,
        candidate.market.conditionId,
        candidate.market.question,
        candidate.shares,
        candidate.capitalRequired,
        candidate.expectedProfit,
        candidate.netEdgeBps,
        candidate.fingerprint,
        JSON.stringify(candidate),
      );
  }

  saveExecution(result: ExecutionResult): void {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO executions (
          execution_id, candidate_id, mode, status, started_at,
          completed_at, realized_pnl, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        result.executionId,
        result.candidateId,
        result.mode,
        result.status,
        result.startedAt,
        result.completedAt,
        result.realizedPnl,
        JSON.stringify(result),
      );
  }

  saveSupervisorDecision(decision: SupervisorDecision): void {
    this.db
      .prepare(`
        INSERT INTO supervisor_decisions (
          created_at, action, risk_multiplier, reason, expires_in_minutes, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        new Date().toISOString(),
        decision.action,
        decision.riskMultiplier,
        decision.reason,
        decision.expiresInMinutes,
        JSON.stringify(decision),
      );
  }

  event(level: "info" | "warn" | "error", type: string, message: string, payload?: unknown): void {
    this.db
      .prepare(`
        INSERT INTO events (created_at, level, type, message, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(new Date().toISOString(), level, type, message, payload ? JSON.stringify(payload) : null);
  }

  realizedPnlToday(): number {
    const row = this.db
      .prepare(`
        SELECT COALESCE(SUM(realized_pnl), 0) AS pnl
        FROM executions
        WHERE date(completed_at) = date('now')
          AND status IN ('COMPLETED', 'SIMULATED')
      `)
      .get() as { pnl: number } | undefined;
    return Number(row?.pnl ?? 0);
  }

  totalRealizedPnl(): number {
    const row = this.db
      .prepare(`
        SELECT COALESCE(SUM(realized_pnl), 0) AS pnl
        FROM executions
        WHERE status IN ('COMPLETED', 'SIMULATED')
      `)
      .get() as { pnl: number } | undefined;
    return Number(row?.pnl ?? 0);
  }

  summary(): Record<string, unknown> {
    const candidateRow = this.db.prepare("SELECT COUNT(*) AS count FROM candidates").get() as {
      count: number;
    };
    const executionRow = this.db
      .prepare(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(realized_pnl), 0) AS pnl,
               SUM(CASE WHEN status IN ('COMPLETED','SIMULATED') THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN status IN ('FAILED','PARTIAL') THEN 1 ELSE 0 END) AS failed
        FROM executions
      `)
      .get() as { count: number; pnl: number; successful: number; failed: number };

    const best = this.db
      .prepare(`
        SELECT question, expected_profit, edge_bps, detected_at
        FROM candidates ORDER BY expected_profit DESC LIMIT 10
      `)
      .all();

    return {
      candidates: Number(candidateRow.count),
      executions: Number(executionRow.count),
      successfulExecutions: Number(executionRow.successful ?? 0),
      failedExecutions: Number(executionRow.failed ?? 0),
      realizedPnl: Number(executionRow.pnl ?? 0),
      bestCandidates: best,
    };
  }

  close(): void {
    this.db.close();
  }
}
