import OpenAI from "openai";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import type { SupervisorDecision, SupervisorInput } from "../domain/types.js";
import type { Logger } from "../infrastructure/logger.js";

const DecisionSchema = z.object({
  action: z.enum(["CONTINUE", "REDUCE_RISK", "PAUSE"]),
  riskMultiplier: z.number().min(0).max(1),
  reason: z.string().min(1).max(500),
  expiresInMinutes: z.number().int().min(1).max(1440),
});

export class OpenAISupervisor {
  private readonly client?: OpenAI;

  constructor(
    private readonly config: Pick<AppConfig, "OPENAI_ENABLED" | "OPENAI_API_KEY" | "OPENAI_MODEL">,
    private readonly logger: Logger,
  ) {
    if (config.OPENAI_ENABLED && config.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    }
  }

  get enabled(): boolean {
    return Boolean(this.client);
  }

  async review(input: SupervisorInput): Promise<SupervisorDecision> {
    if (!this.client) {
      return { action: "CONTINUE", riskMultiplier: 1, reason: "OpenAI supervision disabled", expiresInMinutes: 30 };
    }

    try {
      const response = await this.client.responses.create({
        model: this.config.OPENAI_MODEL,
        store: false,
        instructions: [
          "You are the conservative supervisory agent for a real-money, fee-aware Polymarket complete-set arbitrage engine.",
          "You do not select trades and cannot override hard risk limits.",
          "Pause on evidence of partial fills, repeated execution failures, stale data, accounting inconsistency, or unexplained losses.",
          "Reduce risk when performance degrades or error frequency rises. Continue only when operation is internally consistent.",
          "The user's aspirational profit target is never a reason to increase risk.",
        ].join(" "),
        input: JSON.stringify(input),
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "supervisor_decision",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["action", "riskMultiplier", "reason", "expiresInMinutes"],
              properties: {
                action: { type: "string", enum: ["CONTINUE", "REDUCE_RISK", "PAUSE"] },
                riskMultiplier: { type: "number", minimum: 0, maximum: 1 },
                reason: { type: "string" },
                expiresInMinutes: { type: "integer", minimum: 1, maximum: 1440 },
              },
            },
          },
        },
      });
      return DecisionSchema.parse(JSON.parse(response.output_text));
    } catch (error) {
      this.logger.error({ err: error }, "OpenAI supervisor failed; failing closed with reduced risk");
      return {
        action: "REDUCE_RISK",
        riskMultiplier: 0.25,
        reason: "Supervisor unavailable; fail-closed risk reduction",
        expiresInMinutes: 30,
      };
    }
  }
}
