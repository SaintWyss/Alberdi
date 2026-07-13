import type { AppConfig } from "../config.js";
import type { BinaryMarket } from "../domain/types.js";
import type { Logger } from "../infrastructure/logger.js";
import { fetchJson } from "../utils/http.js";

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value !== 0;
  return fallback;
}

export class GammaClient {
  constructor(
    private readonly config: Pick<AppConfig, "POLYMARKET_GAMMA_URL" | "MAX_MARKETS">,
    private readonly logger: Logger,
  ) {}

  async discoverBinaryMarkets(): Promise<BinaryMarket[]> {
    const events: unknown[] = [];
    const pageSize = 100;

    for (let offset = 0; offset < 500 && events.length < this.config.MAX_MARKETS * 4; offset += pageSize) {
      const url = new URL("/events", this.config.POLYMARKET_GAMMA_URL);
      url.searchParams.set("active", "true");
      url.searchParams.set("closed", "false");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("order", "liquidity");
      url.searchParams.set("ascending", "false");

      const page = await fetchJson<unknown[]>(url.toString());
      events.push(...page);
      if (page.length < pageSize) break;
    }

    const markets: BinaryMarket[] = [];

    for (const rawEvent of events) {
      if (!rawEvent || typeof rawEvent !== "object") continue;
      const event = rawEvent as Record<string, unknown>;
      const rawMarkets = Array.isArray(event.markets) ? event.markets : [];

      for (const rawMarket of rawMarkets) {
        if (!rawMarket || typeof rawMarket !== "object") continue;
        const market = rawMarket as Record<string, unknown>;

        const conditionId = String(pick(market, "conditionId", "condition_id") ?? "");
        const tokenIds = parseStringArray(pick(market, "clobTokenIds", "clob_token_ids", "tokenIds"));
        const outcomes = parseStringArray(pick(market, "outcomes", "outcomeNames"));
        const active = asBoolean(pick(market, "active"), true);
        const closed = asBoolean(pick(market, "closed"), false);
        const enableOrderBook = asBoolean(pick(market, "enableOrderBook", "enable_order_book"), true);
        const negRisk = asBoolean(pick(market, "negRisk", "neg_risk"), false);

        if (!conditionId || tokenIds.length !== 2 || outcomes.length !== 2) continue;
        if (!active || closed || !enableOrderBook || negRisk) continue;

        const normalized = outcomes.map((outcome) => outcome.trim().toLowerCase());
        const yesIndex = normalized.findIndex((outcome) => outcome === "yes");
        const noIndex = normalized.findIndex((outcome) => outcome === "no");
        if (yesIndex < 0 || noIndex < 0) continue;

        const yesTokenId = tokenIds[yesIndex];
        const noTokenId = tokenIds[noIndex];
        if (!yesTokenId || !noTokenId) continue;

        markets.push({
          conditionId,
          question: String(pick(market, "question", "title") ?? pick(event, "title") ?? conditionId),
          slug: String(pick(market, "slug") ?? pick(event, "slug") ?? conditionId),
          yesTokenId,
          noTokenId,
          yesLabel: outcomes[yesIndex] ?? "Yes",
          noLabel: outcomes[noIndex] ?? "No",
          active,
          closed,
          negRisk,
          feesEnabled: asBoolean(pick(market, "feesEnabled", "fees_enabled"), false),
          category: String(pick(event, "category") ?? pick(market, "category") ?? "unknown"),
          ...(asNumber(pick(market, "liquidityNum", "liquidity")) !== undefined
            ? { liquidity: asNumber(pick(market, "liquidityNum", "liquidity")) as number }
            : {}),
          ...(asNumber(pick(market, "volume24hr", "volume_24hr")) !== undefined
            ? { volume24h: asNumber(pick(market, "volume24hr", "volume_24hr")) as number }
            : {}),
          ...(String(pick(market, "endDate", "end_date") ?? "")
            ? { endDate: String(pick(market, "endDate", "end_date")) }
            : {}),
        });
      }
    }

    const deduped = new Map<string, BinaryMarket>();
    for (const market of markets) deduped.set(market.conditionId, market);

    const selected = [...deduped.values()]
      .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))
      .slice(0, this.config.MAX_MARKETS);

    this.logger.info({ markets: selected.length }, "discovered binary markets");
    return selected;
  }
}
