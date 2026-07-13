import { createHash, randomUUID } from "node:crypto";
import type { AppConfig } from "../config.js";
import { costForShares, cumulativeSizes, roundDown } from "../domain/math.js";
import type {
  ArbitrageCandidate,
  MarketRuntimeInfo,
  OrderBook,
} from "../domain/types.js";

function candidateQuantities(
  yes: OrderBook,
  no: OrderBook,
  minShares: number,
  capitalLimit: number,
): number[] {
  const yesTotal = yes.asks.reduce((sum, x) => sum + x.size, 0);
  const noTotal = no.asks.reduce((sum, x) => sum + x.size, 0);
  const upper = Math.min(yesTotal, noTotal, capitalLimit / 0.25);
  const points = new Set<number>([minShares, upper]);
  for (const q of cumulativeSizes(yes.asks)) if (q >= minShares && q <= upper) points.add(q);
  for (const q of cumulativeSizes(no.asks)) if (q >= minShares && q <= upper) points.add(q);
  // Bounded sampling: a tiny minShares (markets reporting minOrderSize 0) must not
  // explode into millions of grid points ("Set maximum size exceeded").
  const sampleUpper = Math.min(upper, minShares + 20);
  for (let i = 1; i <= 20; i += 1) {
    const q = minShares * i;
    if (q > sampleUpper) break;
    points.add(q);
  }
  return [...points].map((q) => roundDown(q, 6)).filter((q) => q >= minShares).sort((a, b) => a - b);
}

export function evaluateCompleteSet(
  runtime: MarketRuntimeInfo,
  yesBook: OrderBook,
  noBook: OrderBook,
  config: Pick<
    AppConfig,
    | "BOOK_STALE_MS"
    | "MIN_NET_EDGE_BPS"
    | "MIN_EXPECTED_PROFIT_USD"
    | "SAFETY_RESERVE_BPS"
  >,
  capitalLimit: number,
  nowMs = Date.now(),
): ArbitrageCandidate | null {
  if (runtime.market.negRisk || capitalLimit <= 0) return null;
  if (nowMs - yesBook.timestampMs > config.BOOK_STALE_MS) return null;
  if (nowMs - noBook.timestampMs > config.BOOK_STALE_MS) return null;
  if (yesBook.asks.length === 0 || noBook.asks.length === 0) return null;

  const minShares = Math.max(
    runtime.minOrderSize,
    yesBook.minOrderSize,
    noBook.minOrderSize,
    0.000001,
  );
  let best: ArbitrageCandidate | null = null;

  for (const shares of candidateQuantities(yesBook, noBook, minShares, capitalLimit)) {
    const yes = costForShares(yesBook.asks, shares, runtime.fee);
    const no = costForShares(noBook.asks, shares, runtime.fee);
    if (!yes || !no) continue;

    const grossCost = yes.grossCost + no.grossCost;
    const fees = yes.fee + no.fee;
    const safetyReserve = (grossCost + fees) * config.SAFETY_RESERVE_BPS / 10_000;
    const capitalRequired = grossCost + fees + safetyReserve;
    const expectedPayout = shares;
    const expectedProfit = expectedPayout - capitalRequired;
    const netEdgeBps = capitalRequired > 0 ? expectedProfit / capitalRequired * 10_000 : 0;

    if (capitalRequired > capitalLimit + 1e-9) continue;
    if (expectedProfit < config.MIN_EXPECTED_PROFIT_USD) continue;
    if (netEdgeBps < config.MIN_NET_EDGE_BPS) continue;

    const detectedAt = new Date(nowMs).toISOString();
    const rawFingerprint = [
      runtime.market.conditionId,
      shares.toFixed(6),
      yes.worstPrice.toFixed(6),
      no.worstPrice.toFixed(6),
      Math.floor(nowMs / 5000),
    ].join(":");
    const fingerprint = createHash("sha256").update(rawFingerprint).digest("hex");

    const candidate: ArbitrageCandidate = {
      id: randomUUID(),
      detectedAt,
      strategy: "BUY_COMPLETE_SET",
      market: runtime.market,
      shares,
      yes: {
        tokenId: runtime.market.yesTokenId,
        label: runtime.market.yesLabel,
        shares,
        grossCost: yes.grossCost,
        fee: yes.fee,
        averagePrice: yes.averagePrice,
        worstPrice: yes.worstPrice,
      },
      no: {
        tokenId: runtime.market.noTokenId,
        label: runtime.market.noLabel,
        shares,
        grossCost: no.grossCost,
        fee: no.fee,
        averagePrice: no.averagePrice,
        worstPrice: no.worstPrice,
      },
      grossCost,
      fees,
      safetyReserve,
      expectedPayout,
      expectedProfit,
      netEdgeBps,
      capitalRequired,
      fingerprint,
    };
    if (!best || candidate.expectedProfit > best.expectedProfit) best = candidate;
  }

  return best;
}
