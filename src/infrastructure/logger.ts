import pino from "pino";
import type { AppConfig } from "../config.js";

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL" | "NODE_ENV">) {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: "alberdi", env: config.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "PRIVATE_KEY",
        "privateKey",
        "apiKey",
        "secret",
        "passphrase",
        "req.headers.authorization",
      ],
      censor: "[REDACTED]",
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
