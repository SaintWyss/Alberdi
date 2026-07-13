import { randomUUID } from "node:crypto";
import {
  AssetType,
  Chain,
  ClobClient,
  OrderType,
  Side,
  SignatureTypeV2,
  type ApiKeyCreds,
} from "@polymarket/clob-client-v2";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AppConfig } from "../config.js";
import type {
  ArbitrageCandidate,
  ExecutionLegResult,
  ExecutionResult,
} from "../domain/types.js";
import type { Logger } from "../infrastructure/logger.js";
import { fetchJson } from "../utils/http.js";
import { InventoryClient } from "../polymarket/inventory-client.js";
import type { Broker } from "./broker.js";

function units(value: string | number | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n / 1_000_000 : 0;
}

function asResponses(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"));
  if (raw && typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
}

export class LiveBroker implements Broker {
  readonly mode = "live" as const;
  private readonly client: ClobClient;
  private readonly inventory: InventoryClient;

  private constructor(
    client: ClobClient,
    inventory: InventoryClient,
    private readonly logger: Logger,
  ) {
    this.client = client;
    this.inventory = inventory;
  }

  static async create(config: AppConfig, logger: Logger): Promise<LiveBroker> {
    if (!config.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");
    if (config.POLYMARKET_SIGNATURE_TYPE !== 0) {
      throw new Error("This release intentionally supports live EOA wallets only (signature type 0)");
    }
    const geo = await fetchJson<Record<string, unknown>>(config.POLYMARKET_GEO_URL);
    if (geo.blocked === true || geo.restricted === true) {
      throw new Error(`Polymarket trading is blocked for this runtime location: ${JSON.stringify(geo)}`);
    }
    const account = privateKeyToAccount(config.PRIVATE_KEY as Hex);
    const signer = createWalletClient({ account, transport: http(config.POLYGON_RPC_URL) });
    const inventory = new InventoryClient(config);

    let creds: ApiKeyCreds;
    if (config.POLYMARKET_API_KEY && config.POLYMARKET_API_SECRET && config.POLYMARKET_API_PASSPHRASE) {
      creds = {
        key: config.POLYMARKET_API_KEY,
        secret: config.POLYMARKET_API_SECRET,
        passphrase: config.POLYMARKET_API_PASSPHRASE,
      };
    } else {
      const bootstrap = new ClobClient({
        host: config.POLYMARKET_CLOB_URL,
        chain: Chain.POLYGON,
        signer,
        retryOnError: true,
        throwOnError: true,
      });
      creds = await bootstrap.createOrDeriveApiKey();
      logger.warn("derived Polymarket API credentials in memory; persist them in .env for stable operation");
    }

    const client = new ClobClient({
      host: config.POLYMARKET_CLOB_URL,
      chain: Chain.POLYGON,
      signer,
      creds,
      signatureType: SignatureTypeV2.EOA,
      funderAddress: config.POLYMARKET_FUNDER_ADDRESS ?? account.address,
      ...(config.POLYMARKET_BUILDER_CODE
        ? { builderConfig: { builderCode: config.POLYMARKET_BUILDER_CODE } }
        : {}),
      retryOnError: true,
      throwOnError: true,
      feeSlippage: 0.01,
    });
    await client.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    return new LiveBroker(client, inventory, logger);
  }

  private async balance(assetType: AssetType, tokenId?: string): Promise<number> {
    const response = await this.client.getBalanceAllowance({
      asset_type: assetType,
      ...(tokenId ? { token_id: tokenId } : {}),
    });
    return units(response.balance);
  }

  async getAvailableCapital(): Promise<number> {
    return this.balance(AssetType.COLLATERAL);
  }

  private legResult(
    tokenId: string,
    candidate: ArbitrageCandidate,
    response: Record<string, unknown> | undefined,
    requestedSpend: number,
    filledShares: number,
  ): ExecutionLegResult {
    return {
      tokenId,
      requestedSpend,
      requestedShares: candidate.shares,
      filledShares,
      actualSpend: units(response?.makingAmount as string | undefined),
      feePaid: 0,
      ...(typeof response?.orderID === "string" ? { orderId: response.orderID } : {}),
      status: String(response?.status ?? (response?.success ? "MATCHED" : "FAILED")),
      raw: response,
    };
  }

  private async waitForBalanceChange(
    assetType: AssetType,
    tokenId: string | undefined,
    baseline: number,
    timeoutMs = 8_000,
  ): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    let current = baseline;
    while (Date.now() < deadline) {
      current = await this.balance(assetType, tokenId);
      if (Math.abs(current - baseline) > 0.000001) return current;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return current;
  }

  async execute(candidate: ArbitrageCandidate): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const startedAt = new Date().toISOString();
    const collateralBefore = await this.getAvailableCapital();
    const yesBefore = await this.balance(AssetType.CONDITIONAL, candidate.yes.tokenId);
    const noBefore = await this.balance(AssetType.CONDITIONAL, candidate.no.tokenId);

    try {
      const [yesOrder, noOrder] = await Promise.all([
        this.client.createOrder(
          {
            tokenID: candidate.yes.tokenId,
            price: candidate.yes.worstPrice,
            size: candidate.shares,
            side: Side.BUY,
            userUSDCBalance: collateralBefore,
          },
          { negRisk: false, version: 2 },
        ),
        this.client.createOrder(
          {
            tokenID: candidate.no.tokenId,
            price: candidate.no.worstPrice,
            size: candidate.shares,
            side: Side.BUY,
            userUSDCBalance: collateralBefore,
          },
          { negRisk: false, version: 2 },
        ),
      ]);

      const raw = await this.client.postOrders([
        { order: yesOrder, orderType: OrderType.FOK },
        { order: noOrder, orderType: OrderType.FOK },
      ]);
      const responses = asResponses(raw);

      const [yesAfter, noAfter] = await Promise.all([
        this.waitForBalanceChange(AssetType.CONDITIONAL, candidate.yes.tokenId, yesBefore),
        this.waitForBalanceChange(AssetType.CONDITIONAL, candidate.no.tokenId, noBefore),
      ]);
      const yesDelta = Math.max(0, yesAfter - yesBefore);
      const noDelta = Math.max(0, noAfter - noBefore);
      const mergeable = Math.floor(Math.min(yesDelta, noDelta) * 1_000_000) / 1_000_000;

      if (mergeable > 0) {
        const hash = await this.inventory.merge(candidate.market.conditionId, mergeable);
        this.logger.info({ hash, mergeable, conditionId: candidate.market.conditionId }, "complete set merged");
      }

      const collateralAfter = mergeable > 0
        ? await this.waitForBalanceChange(AssetType.COLLATERAL, undefined, collateralBefore)
        : await this.getAvailableCapital();
      const success = mergeable >= candidate.shares - 0.000001;
      const partial = mergeable > 0 || yesDelta > 0 || noDelta > 0;
      const status = success ? "COMPLETED" : partial ? "PARTIAL" : "FAILED";
      return {
        executionId,
        candidateId: candidate.id,
        mode: "live",
        status,
        startedAt,
        completedAt: new Date().toISOString(),
        yes: this.legResult(candidate.yes.tokenId, candidate, responses[0], candidate.yes.grossCost + candidate.yes.fee, yesDelta),
        no: this.legResult(candidate.no.tokenId, candidate, responses[1], candidate.no.grossCost + candidate.no.fee, noDelta),
        mergedShares: mergeable,
        realizedPnl: collateralAfter - collateralBefore,
        ...(success ? {} : { error: "one or both FOK legs did not fully settle; engine must pause" }),
      };
    } catch (error) {
      return {
        executionId,
        candidateId: candidate.id,
        mode: "live",
        status: "FAILED",
        startedAt,
        completedAt: new Date().toISOString(),
        yes: this.legResult(candidate.yes.tokenId, candidate, undefined, candidate.yes.grossCost + candidate.yes.fee, 0),
        no: this.legResult(candidate.no.tokenId, candidate, undefined, candidate.no.grossCost + candidate.no.fee, 0),
        mergedShares: 0,
        realizedPnl: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async close(): Promise<void> {
    try { await this.client.cancelAll(); } catch (error) { this.logger.warn({ err: error }, "cancelAll on shutdown failed"); }
  }
}
