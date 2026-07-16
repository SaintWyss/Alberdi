# Configuración

## 1. Preparación

```bash
cp .env.example .env
chmod 0600 .env
```

No reutilizar una wallet que contenga otros activos. No guardar `.env` en backups sin cifrar, logs, imágenes Docker, tickets ni prompts.

`src/config.ts` valida todas las variables con Zod. Una variable inválida detiene el proceso antes de conectarse o crear órdenes.

## 2. Modos

| Variable | Valores | Comportamiento |
|---|---|---|
| `MODE` | `scanner`, `paper`, `live` | Selecciona el modo usado por `npm start`/`run` |
| `NODE_ENV` | `development`, `test`, `production` | Entorno lógico |
| `LOG_LEVEL` | `fatal`…`silent` | Nivel de Pino |

Los comandos `npm run scan`, `paper` y `live` fuerzan el modo correspondiente aunque `.env` contenga otro valor.

## 3. Objetivo de capital

| Variable | Default | Uso |
|---|---:|---|
| `STARTING_CAPITAL_USD` | `10` | Capital virtual inicial y referencia del doctor |
| `TARGET_CAPITAL_USD` | `100` | Objetivo observacional y stop opcional |
| `TARGET_DEADLINE_HOURS` | `168` | Cálculo informativo de tasa requerida |
| `STOP_AT_TARGET` | `true` | Pausa al alcanzar el objetivo |

El deadline nunca altera sizing ni límites de seguridad.

## 4. Mercado y libros

| Variable | Default | Restricción |
|---|---:|---|
| `MAX_MARKETS` | `80` | 1–500 |
| `DISCOVERY_REFRESH_MS` | `300000` | mínimo 30 s |
| `EVALUATION_INTERVAL_MS` | `750` | mínimo 100 ms |
| `BOOK_STALE_MS` | `10000` | mínimo 500 ms |
| `REST_SEED_CONCURRENCY` | `5` | 1–20 |
| `OPPORTUNITY_COOLDOWN_MS` | `15000` | no negativo |

Reducir intervalos aumenta carga, rate-limit risk y ruido; no garantiza más oportunidades ejecutables.

## 5. Estrategia y límites duros

| Variable | Default | Significado |
|---|---:|---|
| `MIN_NET_EDGE_BPS` | `80` | Edge neto mínimo en basis points |
| `MIN_EXPECTED_PROFIT_USD` | `0.01` | Beneficio neto absoluto mínimo |
| `SAFETY_RESERVE_BPS` | `25` | Reserva adicional sobre costos modelados |
| `MAX_CAPITAL_PER_TRADE_USD` | `6` | Capital máximo por ciclo |
| `MAX_MARKET_EXPOSURE_USD` | `7` | Exposición máxima por mercado |
| `MAX_OPEN_EXPOSURE_USD` | `7` | Exposición abierta total máxima |
| `MAX_UNHEDGED_USD` | `0.50` | Residual no emparejado tolerado por política |
| `MAX_DAILY_LOSS_USD` | `1` | Stop diario realizado |
| `MAX_CONSECUTIVE_FAILURES` | `3` | Pausa por fallos repetidos |

Cambiar estos valores exige repetir tests y paper gate. Nunca se deben elevar para perseguir el objetivo temporal.

## 6. Persistencia y estado

| Variable | Default | Uso |
|---|---|---|
| `DATA_DIR` | `./data` | SQLite y evidencia persistente |
| `HTTP_PORT` | `8787` | Health, status y métricas locales |

`DATA_DIR` debe vivir en almacenamiento persistente, con backup y permisos restringidos.

## 7. Endpoints externos

| Variable | Default |
|---|---|
| `POLYMARKET_CLOB_URL` | `https://clob.polymarket.com` |
| `POLYMARKET_GAMMA_URL` | `https://gamma-api.polymarket.com` |
| `POLYMARKET_WS_URL` | `wss://ws-subscriptions-clob.polymarket.com/ws/market` |
| `POLYMARKET_GEO_URL` | `https://polymarket.com/api/geoblock` |
| `POLYGON_RPC_URL` | `https://polygon-rpc.com` |
| `RELAYER_URL` | `https://relayer-v2.polymarket.com` |

Sobrescribir endpoints solo por una migración deliberada. Ejecutar `npm run doctor` después de cualquier cambio.

## 8. Credenciales live

| Variable | Requerida | Nota |
|---|---|---|
| `PRIVATE_KEY` | Sí en live | EOA dedicada, formato `0x…` |
| `POLYMARKET_API_KEY` | Recomendado | Si faltan las tres credenciales, se derivan en memoria |
| `POLYMARKET_API_SECRET` | Recomendado | Tratar como secreto |
| `POLYMARKET_API_PASSPHRASE` | Recomendado | Tratar como secreto |
| `POLYMARKET_FUNDER_ADDRESS` | Opcional | Default: dirección de la EOA |
| `POLYMARKET_SIGNATURE_TYPE` | Sí | Esta versión solo admite `0` |
| `POLYMARKET_BUILDER_CODE` | Opcional | Código builder, si aplica |
| `LIVE_TRADING_ACK` | Sí en live | Debe ser exactamente `I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST` |

Las variables `RELAYER_API_*` están soportadas por configuración, pero su uso efectivo debe confirmarse antes de depender de ellas operacionalmente.

## 9. Supervisor OpenAI

| Variable | Default | Uso |
|---|---|---|
| `OPENAI_ENABLED` | `false` | Habilita revisión periódica |
| `OPENAI_API_KEY` | vacío | Obligatoria al habilitar |
| `OPENAI_MODEL` | `gpt-5.6-luna` | Modelo de supervisión |
| `OPENAI_SUPERVISION_INTERVAL_MS` | `1800000` | mínimo 60 s |

El sistema funciona sin OpenAI. Una falla del supervisor no habilita más riesgo.

## 10. Validación

```bash
npm run typecheck
npm test
npm run doctor
```

Antes de live, revisar que `doctor` reporte conectividad, jurisdicción no bloqueada y `liveReady: true`. La salida no sustituye el paper gate ni la revisión manual de fondos, allowances y gas.
