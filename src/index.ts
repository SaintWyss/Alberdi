#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./config.js";
import { requiredDailyCompoundRate } from "./domain/math.js";
import { PaperBroker } from "./execution/paper-broker.js";
import { LiveBroker } from "./execution/live-broker.js";
import { createLogger } from "./infrastructure/logger.js";
import { ClobPublicClient } from "./polymarket/clob-public.js";
import { GammaClient } from "./polymarket/gamma-client.js";
import { fetchJson } from "./utils/http.js";

async function run(mode: "scanner" | "paper" | "live"): Promise<void> {
  const config = loadConfig({ MODE: mode });
  const logger = createLogger(config);
  const broker = mode === "paper"
    ? new PaperBroker(config.STARTING_CAPITAL_USD)
    : mode === "live"
      ? await LiveBroker.create(config, logger)
      : undefined;
  const { TradingEngine } = await import("./service/engine.js");
  const engine = new TradingEngine(config, logger, broker);
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    await engine.stop();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  await engine.start();
}

async function doctor(): Promise<void> {
  const config = loadConfig({ MODE: "scanner" });
  const logger = createLogger(config);
  const clob = new ClobPublicClient(config, logger);
  const gamma = new GammaClient(config, logger);
  const [geoResult, clobResult, marketsResult] = await Promise.allSettled([
    fetchJson<Record<string, unknown>>(config.POLYMARKET_GEO_URL),
    clob.health(),
    gamma.discoverBinaryMarkets(),
  ]);
  const rate = requiredDailyCompoundRate(
    config.STARTING_CAPITAL_USD,
    config.TARGET_CAPITAL_USD,
    config.TARGET_DEADLINE_HOURS / 24,
  );
  const errorText = (result: PromiseRejectedResult) =>
    result.reason instanceof Error ? result.reason.message : String(result.reason);
  const result = {
    node: process.version,
    connectivity: {
      clobHealthy: clobResult.status === "fulfilled" && clobResult.value,
      clobError: clobResult.status === "rejected" ? errorText(clobResult) : undefined,
      gammaHealthy: marketsResult.status === "fulfilled",
      gammaError: marketsResult.status === "rejected" ? errorText(marketsResult) : undefined,
      geoblockHealthy: geoResult.status === "fulfilled",
      geoblockError: geoResult.status === "rejected" ? errorText(geoResult) : undefined,
    },
    geoblock: geoResult.status === "fulfilled" ? geoResult.value : null,
    eligibleBinaryMarkets: marketsResult.status === "fulfilled" ? marketsResult.value.length : null,
    mode: config.mode,
    target: {
      start: config.STARTING_CAPITAL_USD,
      target: config.TARGET_CAPITAL_USD,
      deadlineHours: config.TARGET_DEADLINE_HOURS,
      requiredDailyCompoundPercent: rate * 100,
      guaranteed: false,
    },
    liveReady: Boolean(
      config.PRIVATE_KEY &&
      config.LIVE_TRADING_ACK === "I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST"
    ),
    openAISupervisor: config.OPENAI_ENABLED,
  };
  console.log(JSON.stringify(result, null, 2));
  if (clobResult.status === "rejected" || marketsResult.status === "rejected" || geoResult.status === "rejected") {
    process.exitCode = 2;
  }
}

async function report(): Promise<void> {
  const config = loadConfig({ MODE: "scanner" });
  const { AuditStore } = await import("./infrastructure/audit-store.js");
  const store = new AuditStore(config.DATA_DIR);
  console.log(JSON.stringify(store.summary(), null, 2));
  store.close();
}

const program = new Command();
program.name("alberdi").description("Fee-aware Polymarket complete-set arbitrage engine");
program.command("scan").description("scan only; never submit orders").action(() => run("scanner"));
program.command("paper").description("paper trade against live order books").action(() => run("paper"));
program.command("live").description("trade with real pUSD using a dedicated EOA wallet").action(() => run("live"));
program.command("doctor").description("verify endpoints, jurisdiction and configuration").action(doctor);
program.command("report").description("print SQLite performance summary").action(report);
program.command("run").description("run MODE from .env").action(() => run(loadConfig().mode));
program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
