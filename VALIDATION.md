# Release validation

Validation date: 2026-07-11

## Passed in the build environment

- `npm run typecheck`: passed with strict TypeScript, unchecked-index protection and exact optional properties.
- `npm test`: 3 test files, 9 tests, all passed.
- `npm run build`: passed; production entrypoint generated at `dist/index.js`.
- `node dist/index.js report`: passed; SQLite schema initialized and report generated.
- `npm audit --omit=dev`: 0 moderate, 0 high, 0 critical; 12 low transitive advisories remain in the official SDK dependency tree.
- Secret files, runtime data, build output and dependencies are excluded from Git.

## External checks attempted

`npm run doctor` executed correctly and calculated the target hurdle, but this build sandbox could not resolve external DNS (`EAI_AGAIN`) for Polymarket hosts. The command reported each failed endpoint independently and exited with code 2 as designed.

This means the following environment acceptance checks remain intentionally unclaimed:

- production CLOB/Gamma/WebSocket connectivity from the deployment host;
- geoblock result from the deployment IP;
- wallet/API authentication;
- live order submission;
- on-chain approval and merge transaction;
- real pUSD reconciliation.

Those checks require the owner’s deployment network, dedicated wallet, credentials, pUSD and POL gas. No keys or real money were available in the build environment, so no claim of a successful live trade is made.
