<h1 align="center">Alberdi</h1>

<p align="center"><strong>Investigación y ejecución supervisada de estrategias en mercados predictivos.</strong><br/>Python · datos · gestión de riesgo</p>

> Proyecto en desarrollo. El alcance y la validación de cada funcionalidad se detallan a continuación.


Production-oriented, fee-aware complete-set arbitrage engine for Polymarket CLOB V2. It scans standard binary markets, buys equal YES and NO quantities only when the full executable depth remains profitable after taker fees and a safety reserve, then merges the pair back into pUSD.

This repository is the complete software project, not a profit promise. Turning $10 into $100 in seven days requires roughly 38.95% compounded every day. Alberdi stops rather than inventing leverage, directional bets, martingales or hidden risk to chase that target.

## Current status

- Repository release: `v1.0.0`.
- Deterministic scanner, paper and live flows are implemented.
- Live operation still requires operator-side acceptance with a dedicated wallet, credentials, permitted jurisdiction, pUSD/POL and a supervised minimum-size cycle.
- Current automated tests cover core math, strategy and basic risk. Live execution, reconciliation, WebSocket, SQLite and settlement need additional automated coverage before capital is increased.

See [Testing and validation](docs/TESTING.md) and [Traceability](docs/TRACEABILITY.md) for the exact distinction between implemented, externally accepted and pending work.

## What is implemented

- Active-market discovery through Gamma API, standard binary markets only.
- CLOB V2 market metadata, dynamic fee curves, minimum size, tick size and taker-delay metadata.
- WebSocket order books with REST seeding and stale-book rejection.
- Full-depth complete-set evaluation; it never relies only on the displayed best ask.
- Net edge after gross price, taker fees, depth and configurable safety reserve.
- Scanner, paper-trading and real-money live modes.
- Two signed BUY orders submitted together as FOK orders.
- Balance reconciliation after submission.
- Atomic on-chain merge of matched YES/NO inventory into pUSD through the current CTF collateral adapter.
- Automatic pause on partial fills or repeated failures.
- Daily-loss, trade-capital, market-exposure and failure limits.
- SQLite WAL audit trail, JSON logs, Prometheus metrics, health/status endpoints.
- OpenAI Responses API supervisor with strict structured output. It may reduce risk or pause; it cannot approve an otherwise forbidden trade.
- Docker, Compose and systemd deployment.

## Why OpenAI is not in the execution loop

The agent role is fulfilled by OpenAI supervision: it reviews state, errors, performance and risk periodically. The actual order decision remains deterministic because model latency and nondeterminism are unacceptable in a seconds-or-milliseconds execution path.

- deterministic engine: data, arithmetic, risk gates, orders, reconciliation and merge;
- OpenAI agent: operational supervision, anomaly judgment, reduce-risk or pause decision.

## Requirements

- Node.js 22+.
- A dedicated Polygon EOA wallet for live mode.
- pUSD in that wallet.
- A small amount of POL for merge gas and one-time approvals.
- Polymarket API credentials, or permission for the app to derive them at startup.
- OpenAI API key only when agent supervision is enabled.

Do not use a wallet that stores unrelated assets. Live mode intentionally rejects Proxy, Safe and deposit-wallet signature modes in this release because recovery and merge authority must remain unambiguous.

## Quick start

```bash
cp .env.example .env
chmod 0600 .env
npm ci
npm run typecheck
npm test
npm run build
npm run doctor
```

## Operating sequence

```bash
# 1. Verify APIs, geoblock response and target mathematics
npm run doctor

# 2. Observe opportunities without authentication or orders
npm run scan

# 3. Paper trade against live books
npm run paper

# 4. Inspect durable evidence
npm run report

# 5. Only after the graduation gates
npm run live
```

Status endpoints bind to localhost:

```text
GET http://127.0.0.1:8787/health
GET http://127.0.0.1:8787/status
GET http://127.0.0.1:8787/metrics
```

## Live safeguards

Live mode requires all of the following:

```dotenv
MODE=live
PRIVATE_KEY=0x...
POLYMARKET_SIGNATURE_TYPE=0
LIVE_TRADING_ACK=I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST
```

The first live merge may require a Polygon approval transaction. If only one FOK leg settles, the engine merges whatever matched inventory can be paired and then pauses. It does not chase the missing side at arbitrary prices.

## Known external limitation

Polymarket does not document a two-leg batch as an atomic cross-order transaction. FOK protects each order separately, not the pair as one indivisible operation. Alberdi treats that residual leg risk as a first-class failure mode and pauses on it.

## Documentation

- [Technical documentation index](docs/README.md)
- [Implemented architecture](docs/ARCHITECTURE.md)
- [Configuration reference](docs/CONFIGURATION.md)
- [Dedicated wallet setup](docs/WALLET_SETUP.md)
- [Operations, backup and rollback](docs/OPERATIONS.md)
- [Incident response and reconciliation](docs/INCIDENT_RESPONSE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Testing and environment acceptance](docs/TESTING.md)
- [Capability traceability](docs/TRACEABILITY.md)
- [0 → 100 completeness plan](PLAN_0_100.md)
- [Security controls](SECURITY.md)
- [Release notes](RELEASE_NOTES.md)

## Safety rule

A profitable-looking quote is not enough. Live operation is justified only by executable depth, current fee metadata, fresh books, hard risk gates, durable evidence and successful environment acceptance.
