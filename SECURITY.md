# Security and financial controls

## Core controls

- Use a dedicated EOA with only the trading bankroll and minimal POL gas.
- Keep `.env` mode `0600`; never commit it, paste it into logs, prompts or tickets, or place it in Docker images.
- Run scanner and paper modes before adding a private key or live acknowledgement.
- Status HTTP binds to localhost only.
- OpenAI receives aggregate engine state, market names and errors; it never receives private keys or Polymarket API secrets.
- Logs redact common secret fields.
- A partial fill is not treated as a normal recoverable event: matched pairs are merged and the engine pauses.
- A model decision cannot increase configured hard maximums or approve a trade rejected by `RiskEngine`.
- Do not change the live acknowledgement to a default value.
- Do not run from a prohibited jurisdiction or attempt to bypass regional controls.
- Back up `DATA_DIR`, including `poly-arb.sqlite` and WAL files; this is required evidence for reconciliation.
- Do not run two Alberdi instances against the same wallet.

## Secret exposure

Treat the wallet as compromised if its private key may have appeared in shell history, logs, screenshots, support channels, backups without encryption or another process on the host.

Immediate response:

1. stop Alberdi;
2. cancel active orders through an independent interface;
3. move funds to a new safe wallet;
4. rotate CLOB, relayer and OpenAI credentials;
5. preserve SQLite and logs for investigation;
6. replace the EOA before returning to paper/live.

Deleting the local `.env` is not sufficient after disclosure.

## Reporting

This is a private repository. Report suspected vulnerabilities directly to the repository owner without including live secrets, private keys or complete production logs.

Include:

- affected commit/version;
- reproduction steps using synthetic data;
- expected and actual result;
- financial/security impact;
- suggested containment.

## Detailed references

- [Threat model](docs/THREAT_MODEL.md)
- [Wallet setup](docs/WALLET_SETUP.md)
- [Operations](docs/OPERATIONS.md)
- [Incident response](docs/INCIDENT_RESPONSE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Testing and acceptance](docs/TESTING.md)
