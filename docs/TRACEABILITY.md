# Matriz de trazabilidad

## 1. Objetivo

Esta matriz separa software implementado, aceptación externa y gaps. Evita interpretar una clase, un plan o un README como evidencia de operación real.

## 2. Capacidades

| ID | Capacidad | Implementación principal | Verificación actual | Estado |
|---|---|---|---|---|
| MKT-01 | Descubrir mercados binarios estándar | `GammaClient` | `doctor`/scanner | Implementado |
| MKT-02 | Obtener metadata CLOB dinámica | `ClobPublicClient.runtimeInfo` | scanner/inspección | Implementado |
| MKT-03 | REST seed + WebSocket books | `BookStore`, `MarketWebSocket` | aceptación runtime | Implementado; tests faltantes |
| STR-01 | Caminar profundidad completa | `costForShares`, `evaluateCompleteSet` | `math.test.ts`, `strategy.test.ts` | Implementado |
| STR-02 | Fees y safety reserve | math + complete-set evaluator | tests unitarios parciales | Implementado |
| STR-03 | Rechazar libros stale | complete-set evaluator | `strategy.test.ts` | Implementado |
| RSK-01 | Capital por ciclo | `RiskEngine` + sizing | `risk.test.ts` parcial | Implementado |
| RSK-02 | Exposición y pérdida diaria | `RiskEngine` | pruebas parciales | Implementado; ampliar tests |
| RSK-03 | Pausa por fallos/partial | `TradingEngine.pause` | inspección | Implementado; test faltante |
| RSK-04 | IA solo reduce riesgo | engine + supervisor multiplier | `risk.test.ts` parcial | Implementado |
| MOD-01 | Scanner sin trading | CLI sin broker | inspección/soak | Implementado |
| MOD-02 | Paper sobre candidatos reales | `PaperBroker` | paper gate | Implementado; aceptación pendiente |
| EXE-01 | Autenticación EOA | `LiveBroker.create` | entorno real | Implementado; aceptación externa pendiente |
| EXE-02 | Batch de dos FOK | `LiveBroker.execute` | entorno real | Implementado; no atómico entre piernas |
| EXE-03 | Reconciliar balances | `waitForBalanceChange` + deltas | entorno real | Implementado; tests faltantes |
| SET-01 | Merge de inventario emparejado | `InventoryClient.merge` | Polygon real | Implementado; aceptación externa pendiente |
| SET-02 | Preservar residual y pausar | status `PARTIAL` + engine pause | inspección | Implementado; test faltante |
| AUD-01 | Auditoría SQLite WAL | `AuditStore` | `report`/restart | Implementado; tests faltantes |
| OBS-01 | Health/status/metrics | `StatusServer`, `Metrics` | curl/manual | Implementado; tests faltantes |
| AI-01 | Supervisor estructurado | `OpenAISupervisor` | API real/mock pendiente | Implementado; cobertura faltante |
| OPS-01 | Docker Compose localhost | `docker-compose.yml` | config/manual | Implementado |
| OPS-02 | Unidad systemd endurecida | `systemd/alberdi.service` | host Linux | Implementado; aceptación pendiente |
| OPS-03 | Backup/restore documentado | `docs/OPERATIONS.md` | drill no registrado | Documentado; ejecución pendiente |
| SEC-01 | Geoblock fail-closed | `doctor`, `LiveBroker.create` | endpoint real | Implementado |
| SEC-02 | Gestión de secretos | config/docs/redacción | revisión | Parcial; depende del operador/host |
| SEC-03 | Lock de una instancia por wallet | no existe | no disponible | Pendiente |
| SUP-01 | SBOM y scanning continuo | no evidenciado | no disponible | Pendiente |
| REL-01 | Artefacto firmado/reproducible | build TS/Docker | firma/provenance faltantes | Parcial |

## 3. Gates bloqueantes antes de aumentar capital

- pruebas de `LiveBroker`, reconciliación, partial y merge;
- scanner/paper soak documentado;
- backup/restore drill;
- aceptación de un ciclo real mínimo;
- monitoreo externo de pausa/proceso;
- lock de instancia por wallet;
- auditoría de dependencias, secretos y SBOM;
- artefactos de release con checksum/provenance.

## 4. Regla de estado

Una fila solo puede pasar a **Implementado** cuando el flujo existe y sus invariantes se verifican. Cuando depende de dinero, wallet, jurisdicción o contratos externos debe conservar la marca **aceptación externa pendiente** hasta que exista evidencia fechada.
