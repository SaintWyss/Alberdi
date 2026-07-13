import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  parseUnits,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getContractConfig, Chain } from "@polymarket/clob-client-v2";
import type { AppConfig } from "../config.js";

const ADAPTER: Address = "0xADa100874d00e3331D00F2007a9c336a65009718";
const adapterAbi = parseAbi([
  "function mergePositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)",
]);
const ctfAbi = parseAbi([
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
]);

export class InventoryClient {
  private readonly account;
  private readonly publicClient;
  private readonly walletClient;
  private readonly contracts = getContractConfig(Chain.POLYGON);

  constructor(config: Pick<AppConfig, "PRIVATE_KEY" | "POLYGON_RPC_URL">) {
    if (!config.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");
    this.account = privateKeyToAccount(config.PRIVATE_KEY as Hex);
    this.publicClient = createPublicClient({ chain: polygon, transport: http(config.POLYGON_RPC_URL) });
    this.walletClient = createWalletClient({
      account: this.account,
      chain: polygon,
      transport: http(config.POLYGON_RPC_URL),
    });
  }

  get address(): Address {
    return this.account.address;
  }

  async ensureMergeApproval(): Promise<void> {
    const approved = await this.publicClient.readContract({
      address: this.contracts.conditionalTokens as Address,
      abi: ctfAbi,
      functionName: "isApprovedForAll",
      args: [this.account.address, ADAPTER],
    });
    if (approved) return;
    const hash = await this.walletClient.writeContract({
      address: this.contracts.conditionalTokens as Address,
      abi: ctfAbi,
      functionName: "setApprovalForAll",
      args: [ADAPTER, true],
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  async merge(conditionId: string, shares: number): Promise<string> {
    if (shares <= 0) throw new Error("merge shares must be positive");
    await this.ensureMergeApproval();
    const data = encodeFunctionData({
      abi: adapterAbi,
      functionName: "mergePositions",
      args: [
        this.contracts.collateral as Address,
        zeroHash,
        conditionId as Hex,
        [1n, 2n],
        parseUnits(shares.toFixed(6), 6),
      ],
    });
    const hash = await this.walletClient.sendTransaction({ to: ADAPTER, data, value: 0n });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`merge transaction reverted: ${hash}`);
    return hash;
  }
}
