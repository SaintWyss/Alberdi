import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export class Metrics {
  readonly registry = new Registry();
  readonly candidates = new Counter({
    name: "poly_arb_candidates_total",
    help: "Total arbitrage candidates detected",
    registers: [this.registry],
  });
  readonly approvals = new Counter({
    name: "poly_arb_approvals_total",
    help: "Total risk-approved candidates",
    registers: [this.registry],
  });
  readonly executions = new Counter({
    name: "poly_arb_executions_total",
    help: "Executions by status",
    labelNames: ["status", "mode"] as const,
    registers: [this.registry],
  });
  readonly pnl = new Gauge({
    name: "poly_arb_realized_pnl_usd",
    help: "Cumulative realized PnL",
    registers: [this.registry],
  });
  readonly capital = new Gauge({
    name: "poly_arb_capital_usd",
    help: "Current virtual or live capital",
    registers: [this.registry],
  });
  readonly markets = new Gauge({
    name: "poly_arb_markets_tracked",
    help: "Markets currently tracked",
    registers: [this.registry],
  });
  readonly edge = new Histogram({
    name: "poly_arb_candidate_edge_bps",
    help: "Candidate net edge in basis points",
    buckets: [10, 25, 50, 75, 100, 150, 250, 500, 1000],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: "poly_arb_node_" });
  }
}
