import "dotenv/config";
import { z } from "zod";
import type { RunMode } from "./domain/types.js";

const boolFromString = (defaultValue: "true" | "false" = "false") => z
  .enum(["true", "false"])
  .default(defaultValue)
  .transform((value) => value === "true");

const optionalString = z.string().trim().optional().transform((value) => value || undefined);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MODE: z.enum(["scanner", "paper", "live"]).default("scanner"),

  STARTING_CAPITAL_USD: z.coerce.number().positive().default(10),
  TARGET_CAPITAL_USD: z.coerce.number().positive().default(100),
  TARGET_DEADLINE_HOURS: z.coerce.number().positive().default(168),

  MAX_MARKETS: z.coerce.number().int().min(1).max(500).default(80),
  DISCOVERY_REFRESH_MS: z.coerce.number().int().min(30_000).default(300_000),
  EVALUATION_INTERVAL_MS: z.coerce.number().int().min(100).default(750),
  BOOK_STALE_MS: z.coerce.number().int().min(500).default(10_000),
  REST_SEED_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(5),

  MIN_NET_EDGE_BPS: z.coerce.number().min(1).default(80),
  MIN_EXPECTED_PROFIT_USD: z.coerce.number().min(0).default(0.01),
  MAX_CAPITAL_PER_TRADE_USD: z.coerce.number().positive().default(6),
  MAX_MARKET_EXPOSURE_USD: z.coerce.number().positive().default(7),
  MAX_OPEN_EXPOSURE_USD: z.coerce.number().positive().default(7),
  MAX_UNHEDGED_USD: z.coerce.number().positive().default(0.5),
  MAX_DAILY_LOSS_USD: z.coerce.number().positive().default(1),
  MAX_CONSECUTIVE_FAILURES: z.coerce.number().int().min(1).default(3),
  SAFETY_RESERVE_BPS: z.coerce.number().min(0).default(25),
  OPPORTUNITY_COOLDOWN_MS: z.coerce.number().int().min(0).default(15_000),
  STOP_AT_TARGET: boolFromString("true"),

  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  DATA_DIR: z.string().default("./data"),

  POLYMARKET_CLOB_URL: z.string().url().default("https://clob.polymarket.com"),
  POLYMARKET_GAMMA_URL: z.string().url().default("https://gamma-api.polymarket.com"),
  POLYMARKET_WS_URL: z.string().url().default("wss://ws-subscriptions-clob.polymarket.com/ws/market"),
  POLYMARKET_GEO_URL: z.string().url().default("https://polymarket.com/api/geoblock"),
  POLYGON_RPC_URL: z.string().url().default("https://polygon-rpc.com"),

  PRIVATE_KEY: optionalString,
  POLYMARKET_API_KEY: optionalString,
  POLYMARKET_API_SECRET: optionalString,
  POLYMARKET_API_PASSPHRASE: optionalString,
  POLYMARKET_FUNDER_ADDRESS: optionalString,
  POLYMARKET_SIGNATURE_TYPE: z.coerce.number().int().min(0).max(3).default(0),
  POLYMARKET_BUILDER_CODE: optionalString,
  LIVE_TRADING_ACK: optionalString,

  RELAYER_URL: z.string().url().default("https://relayer-v2.polymarket.com"),
  RELAYER_API_KEY: optionalString,
  RELAYER_API_SECRET: optionalString,
  RELAYER_API_PASSPHRASE: optionalString,

  OPENAI_ENABLED: boolFromString(),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_SUPERVISION_INTERVAL_MS: z.coerce.number().int().min(60_000).default(1_800_000),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(overrides: Partial<Record<keyof z.input<typeof EnvSchema>, unknown>> = {}) {
  const parsed = EnvSchema.parse({ ...process.env, ...overrides });

  const mode = parsed.MODE as RunMode;
  if (mode === "live") {
    if (!parsed.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required in live mode");
    if (parsed.LIVE_TRADING_ACK !== "I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST") {
      throw new Error(
        "Live mode requires LIVE_TRADING_ACK=I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST",
      );
    }
  }

  if (parsed.OPENAI_ENABLED && (!parsed.OPENAI_API_KEY || !parsed.OPENAI_MODEL)) {
    throw new Error("OPENAI_ENABLED=true requires OPENAI_API_KEY and OPENAI_MODEL");
  }

  return {
    ...parsed,
    mode,
    targetDeadlineMs: parsed.TARGET_DEADLINE_HOURS * 60 * 60 * 1000,
  };
}
