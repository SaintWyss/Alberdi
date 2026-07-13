import { Chain, ClobClient } from "@polymarket/clob-client-v2";
import type { AppConfig } from "../config.js";
import type { BinaryMarket, MarketRuntimeInfo, OrderBook } from "../domain/types.js";
import type { Logger } from "../infrastructure/logger.js";
import { mapLimit } from "../utils/concurrency.js";

export class ClobPublicClient {
  readonly client: ClobClient;

  constructor(
    private readonly config: Pick<
      AppConfig,
      "POLYMARKET_CLOB_URL" | "REST_SEED_CONCURRENCY"
    >,
    private readonly logger: Logger,
  ) {
    this.client = new ClobClient({
      host: config.POLYMARKET_CLOB_URL,
      chain: Chain.POLYGON,
      retryOnError: true,
      throwOnError: true,
    });
  }

  async health(): Promise<boolean> {
    await this.client.getOk();
    return true;
  }

  async runtimeInfo(market: BinaryMarket): Promise<MarketRuntimeInfo> {
    const info = await this.client.getClobMarketInfo(market.conditionId);
    return {
      market,
      fee: {
        rate: Number(info.fd?.r ?? 0),
        exponent: Number(info.fd?.e ?? 1),
        takerOnly: Boolean(info.fd?.to ?? true),
      },
      minOrderSize: Number(info.mos ?? 0),
      tickSize: Number(info.mts ?? 0.01),
      takerDelay: Boolean(info.itode ?? false),
    };
  }

  async seedBooks(markets: readonly BinaryMarket[]): Promise<OrderBook[]> {
    const tokenMarkets = markets.flatMap((market) => [
      { tokenId: market.yesTokenId, market },
      { tokenId: market.noTokenId, market },
    ]);

    const results = await mapLimit(
      tokenMarkets,
      this.config.REST_SEED_CONCURRENCY,
      async ({ tokenId, market }): Promise<OrderBook | null> => {
        try {
          const book = await this.client.getOrderBook(tokenId);
          return {
            tokenId,
            marketId: market.conditionId,
            timestampMs: Number(book.timestamp || Date.now()),
            bids: book.bids.map((level) => ({ price: Number(level.price), size: Number(level.size) })),
            asks: book.asks.map((level) => ({ price: Number(level.price), size: Number(level.size) })),
            minOrderSize: Number(book.min_order_size ?? 0),
            tickSize: Number(book.tick_size ?? 0.01),
            ...(book.hash ? { hash: book.hash } : {}),
          };
        } catch (error) {
          this.logger.debug({ err: error, tokenId }, "failed to seed order book");
          return null;
        }
      },
    );

    return results.filter((book): book is OrderBook => book !== null);
  }
}
