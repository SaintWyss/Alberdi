import { createServer, type Server } from "node:http";
import type { EngineStats } from "../domain/types.js";
import type { Metrics } from "./metrics.js";

export class StatusServer {
  private server?: Server;

  constructor(
    private readonly port: number,
    private readonly metrics: Metrics,
    private readonly stats: () => EngineStats,
  ) {}

  start(): void {
    this.server = createServer(async (req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, paused: this.stats().paused }));
        return;
      }
      if (req.url === "/status") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(this.stats(), null, 2));
        return;
      }
      if (req.url === "/metrics") {
        res.writeHead(200, { "content-type": this.metrics.registry.contentType });
        res.end(await this.metrics.registry.metrics());
        return;
      }
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    });
    this.server.listen(this.port, "127.0.0.1");
  }

  async close(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => this.server?.close((error) => error ? reject(error) : resolve()));
  }
}
