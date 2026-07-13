import WebSocket from "ws";
import type { AppConfig } from "../config.js";
import type { BinaryMarket, OrderBook } from "../domain/types.js";
import type { Logger } from "../infrastructure/logger.js";
import { BookStore } from "./book-store.js";

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class MarketWebSocket {
  private socket: WebSocket | undefined;
  private stopped = false;
  private reconnectAttempts = 0;
  private heartbeat: NodeJS.Timeout | undefined;
  private readonly tokenToMarket = new Map<string, string>();

  constructor(
    private readonly config: Pick<AppConfig, "POLYMARKET_WS_URL">,
    private readonly store: BookStore,
    private readonly logger: Logger,
  ) {}

  async start(markets: readonly BinaryMarket[]): Promise<void> {
    this.stopped = false;
    this.tokenToMarket.clear();
    for (const market of markets) {
      this.tokenToMarket.set(market.yesTokenId, market.conditionId);
      this.tokenToMarket.set(market.noTokenId, market.conditionId);
    }
    await this.connect([...this.tokenToMarket.keys()]);
  }

  private async connect(tokenIds: string[]): Promise<void> {
    if (this.stopped || tokenIds.length === 0) return;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.config.POLYMARKET_WS_URL);
      this.socket = socket;
      let opened = false;

      const openingTimeout = setTimeout(() => {
        if (!opened) {
          socket.terminate();
          reject(new Error("WebSocket connection timeout"));
        }
      }, 15_000);

      socket.on("open", () => {
        opened = true;
        clearTimeout(openingTimeout);
        this.reconnectAttempts = 0;
        socket.send(
          JSON.stringify({
            assets_ids: tokenIds,
            type: "market",
            custom_feature_enabled: true,
          }),
        );
        this.heartbeat = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send("PING");
        }, 10_000);
        this.logger.info({ tokens: tokenIds.length }, "market websocket connected");
        resolve();
      });

      socket.on("message", (data) => this.handleMessage(data.toString()));
      socket.on("error", (error) => {
        this.logger.warn({ err: error }, "market websocket error");
        if (!opened) reject(error);
      });
      socket.on("close", () => {
        clearTimeout(openingTimeout);
        if (this.heartbeat) clearInterval(this.heartbeat);
        this.heartbeat = undefined;
        this.logger.warn("market websocket closed");
        if (!this.stopped) this.scheduleReconnect(tokenIds);
      });
    });
  }

  private scheduleReconnect(tokenIds: string[]): void {
    this.reconnectAttempts += 1;
    const delay = Math.min(30_000, 500 * 2 ** Math.min(this.reconnectAttempts, 6));
    setTimeout(() => {
      void this.connect(tokenIds).catch((error) => {
        this.logger.error({ err: error }, "websocket reconnect failed");
      });
    }, delay);
  }

  private handleMessage(raw: string): void {
    if (raw === "PONG" || raw === "PING") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      this.logger.debug({ raw: raw.slice(0, 200) }, "non-json websocket message");
      return;
    }

    const events = Array.isArray(parsed) ? parsed : [parsed];
    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const payload = event as Record<string, unknown>;
      const type = String(payload.event_type ?? payload.type ?? "");

      if (type === "book") {
        const tokenId = String(payload.asset_id ?? "");
        if (!tokenId) continue;
        const marketId = String(payload.market ?? this.tokenToMarket.get(tokenId) ?? "");
        const bids = Array.isArray(payload.bids) ? payload.bids : [];
        const asks = Array.isArray(payload.asks) ? payload.asks : [];
        const book: OrderBook = {
          tokenId,
          marketId,
          timestampMs: number(payload.timestamp, Date.now()),
          bids: bids
            .filter((level): level is Record<string, unknown> => Boolean(level && typeof level === "object"))
            .map((level) => ({ price: number(level.price), size: number(level.size) })),
          asks: asks
            .filter((level): level is Record<string, unknown> => Boolean(level && typeof level === "object"))
            .map((level) => ({ price: number(level.price), size: number(level.size) })),
          minOrderSize: number(payload.min_order_size),
          tickSize: number(payload.tick_size, 0.01),
          ...(typeof payload.hash === "string" ? { hash: payload.hash } : {}),
        };
        this.store.replace(book);
      } else if (type === "price_change") {
        const marketId = String(payload.market ?? "");
        const timestamp = number(payload.timestamp, Date.now());
        const changes = Array.isArray(payload.price_changes) ? payload.price_changes : [];
        for (const rawChange of changes) {
          if (!rawChange || typeof rawChange !== "object") continue;
          const change = rawChange as Record<string, unknown>;
          const tokenId = String(change.asset_id ?? "");
          const side = String(change.side ?? "") as "BUY" | "SELL";
          if (!tokenId || (side !== "BUY" && side !== "SELL")) continue;
          this.store.updateLevel(
            tokenId,
            marketId || this.tokenToMarket.get(tokenId) || "",
            side,
            number(change.price),
            number(change.size),
            timestamp,
          );
        }
      } else if (type === "tick_size_change") {
        const tokenId = String(payload.asset_id ?? "");
        if (tokenId) {
          this.store.updateTickSize(tokenId, number(payload.new_tick_size, 0.01), number(payload.timestamp, Date.now()));
        }
      }
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.socket?.close();
    this.socket = undefined;
  }
}
