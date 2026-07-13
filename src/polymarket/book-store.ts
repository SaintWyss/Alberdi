import type { OrderBook, PriceLevel } from "../domain/types.js";

interface MutableBook {
  tokenId: string;
  marketId: string;
  timestampMs: number;
  bids: Map<number, number>;
  asks: Map<number, number>;
  minOrderSize: number;
  tickSize: number;
  hash?: string;
}

export class BookStore {
  private readonly books = new Map<string, MutableBook>();

  replace(book: OrderBook): void {
    this.books.set(book.tokenId, {
      tokenId: book.tokenId,
      marketId: book.marketId,
      timestampMs: book.timestampMs,
      bids: new Map(book.bids.map((level) => [level.price, level.size])),
      asks: new Map(book.asks.map((level) => [level.price, level.size])),
      minOrderSize: book.minOrderSize,
      tickSize: book.tickSize,
      ...(book.hash ? { hash: book.hash } : {}),
    });
  }

  updateLevel(
    tokenId: string,
    marketId: string,
    side: "BUY" | "SELL",
    price: number,
    size: number,
    timestampMs: number,
  ): void {
    let book = this.books.get(tokenId);
    if (!book) {
      book = {
        tokenId,
        marketId,
        timestampMs,
        bids: new Map(),
        asks: new Map(),
        minOrderSize: 0,
        tickSize: 0.01,
      };
      this.books.set(tokenId, book);
    }

    const levels = side === "BUY" ? book.bids : book.asks;
    if (size <= 0) levels.delete(price);
    else levels.set(price, size);
    book.timestampMs = Math.max(book.timestampMs, timestampMs);
  }

  updateTickSize(tokenId: string, tickSize: number, timestampMs: number): void {
    const book = this.books.get(tokenId);
    if (!book) return;
    book.tickSize = tickSize;
    book.timestampMs = Math.max(book.timestampMs, timestampMs);
  }

  get(tokenId: string): OrderBook | undefined {
    const book = this.books.get(tokenId);
    if (!book) return undefined;

    const bids: PriceLevel[] = [...book.bids.entries()]
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => b.price - a.price);
    const asks: PriceLevel[] = [...book.asks.entries()]
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => a.price - b.price);

    return {
      tokenId: book.tokenId,
      marketId: book.marketId,
      timestampMs: book.timestampMs,
      bids,
      asks,
      minOrderSize: book.minOrderSize,
      tickSize: book.tickSize,
      ...(book.hash ? { hash: book.hash } : {}),
    };
  }

  size(): number {
    return this.books.size;
  }

  clear(): void {
    this.books.clear();
  }
}
