# Security and financial controls

- Use a dedicated EOA with only the trading bankroll and minimal POL gas.
- Keep `.env` mode `0600`; never commit it, paste it into logs, or place it in Docker images.
- Run scanner and paper modes before adding a private key.
- Status HTTP binds to localhost only.
- The OpenAI request contains aggregate engine state, market names and errors; it never contains private keys or Polymarket API secrets.
- Logs use redaction for common secret fields.
- A partial fill is not treated as a recoverable normal event: matched pairs are merged and the engine pauses.
- A model decision cannot increase the configured hard maximums.
- Do not change the live acknowledgement to a default value.
- Do not run this from a prohibited jurisdiction or attempt to bypass regional controls.
- Back up `data/poly-arb.sqlite`; it is the evidence needed to reconcile behavior.
