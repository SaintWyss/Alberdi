# 05 — Configuración, datos y APIs

## Idea general

Yo separo configuración, secretos y datos de ejecución porque tienen ciclos de vida y riesgos distintos.

- `configuración`: límites y comportamiento;
- `secretos`: credenciales y clave privada;
- `datos`: evidencia generada por Alberdi;
- `APIs`: servicios externos consumidos.

## Archivo `.env`

Yo creo `.env` desde `.env.example` y lo protejo con permisos `0600`.

```bash
cp .env.example .env
chmod 600 .env
```

Nunca versiono el archivo real.

## Grupos de configuración

### Modo y objetivo

| Variable | Propósito |
|---|---|
| `MODE` | `scanner`, `paper` o `live` |
| `STARTING_CAPITAL_USD` | capital de referencia |
| `TARGET_CAPITAL_USD` | objetivo informativo |
| `TARGET_DEADLINE_HOURS` | horizonte del objetivo |
| `STOP_AT_TARGET` | detener al alcanzar el objetivo |

Yo no permito que el objetivo reduzca límites de seguridad.

### Descubrimiento y frescura

| Variable | Propósito |
|---|---|
| `MAX_MARKETS` | límite de mercados cargados |
| `DISCOVERY_REFRESH_MS` | frecuencia de redescubrimiento |
| `EVALUATION_INTERVAL_MS` | intervalo de evaluación |
| `BOOK_STALE_MS` | edad máxima del libro |
| `REST_SEED_CONCURRENCY` | concurrencia al sembrar libros |

### Estrategia

| Variable | Propósito |
|---|---|
| `MIN_NET_EDGE_BPS` | edge neto mínimo |
| `MIN_EXPECTED_PROFIT_USD` | ganancia mínima esperada |
| `MAX_CAPITAL_PER_TRADE_USD` | capital máximo por operación |
| `SAFETY_RESERVE_BPS` | reserva adicional por incertidumbre |

### Riesgo

La configuración incluye límites de exposición, drawdown, fallos consecutivos, cooldown y otros topes. Yo trato esos valores como máximos duros, no como sugerencias.

### Servicios

- `POLYMARKET_CLOB_URL`;
- `POLYMARKET_GAMMA_URL`;
- `POLYMARKET_WS_URL`;
- `POLYMARKET_GEO_URL`;
- `POLYGON_RPC_URL`;
- `RELAYER_URL` opcional;
- `HTTP_PORT`;
- `DATA_DIR`.

### Live y secretos

- `PRIVATE_KEY`;
- credenciales CLOB;
- credenciales de relayer opcionales;
- `POLYMARKET_SIGNATURE_TYPE=0`;
- `LIVE_TRADING_ACK`.

### Supervisor IA

- `OPENAI_ENABLED`;
- `OPENAI_API_KEY`;
- modelo, frecuencia y presupuesto configurados.

## Validación

Yo valido la configuración al iniciar. Un typo, valor fuera de rango o combinación insegura debe abortar antes de abrir conexiones de trading.

## Datos persistidos

El directorio `DATA_DIR` contiene la base SQLite y archivos asociados. En modo WAL pueden existir:

```text
poly-arb.sqlite
poly-arb.sqlite-wal
poly-arb.sqlite-shm
```

Los tres pueden ser necesarios para un backup consistente si el proceso está activo.

## Modelo lógico de datos

Yo persisto conceptos equivalentes a:

- mercados y tokens;
- oportunidades evaluadas;
- razones de rechazo;
- operaciones paper/live;
- órdenes y respuestas;
- snapshots de balance;
- merge/settlement;
- eventos del motor;
- decisiones del supervisor;
- métricas agregadas.

Los nombres físicos exactos se consultan en el esquema y migraciones vigentes.

## Contratos externos

### Gamma API

Yo la uso para descubrir mercados y obtener metadata de negocio. No la considero autoridad suficiente para el libro ejecutable.

### CLOB REST

Yo lo uso para metadata de mercado, fees, mínimos, tick size, credenciales, órdenes y consultas de estado.

### CLOB WebSocket

Yo lo uso para mantener libros actualizados. Cada snapshot conserva timestamp para rechazar datos viejos.

### Geoblocking

Yo consulto el endpoint antes de live. No implemento bypass ni ocultamiento de ubicación.

### Polygon RPC

Yo lo uso para balances, allowances y merge de posiciones emparejadas.

### OpenAI

Yo envío únicamente estado operativo minimizado. No envío claves, secretos CLOB ni `.env`.

## Contrato interno de broker

La estrategia no conoce detalles de Polymarket. Produce una oportunidad tipada y la entrega a un puerto de broker.

```text
Opportunity → Broker.execute() → ExecutionResult
```

`PaperBroker` y `LiveBroker` implementan el mismo concepto, lo que permite comparar comportamiento sin duplicar estrategia.

## Errores

Yo clasifico errores en categorías operativas:

- configuración;
- red/timeout;
- metadata;
- libro viejo;
- riesgo;
- orden rechazada;
- reconciliación;
- cadena/merge;
- persistencia;
- supervisor.

No expongo secretos en mensajes. Los errores externos se traducen a datos auditables sin copiar credenciales ni payloads sensibles completos.

## Métricas y health

El endpoint local permite observar salud y métricas. Yo lo vinculo a localhost porque no incorpora por sí solo un modelo completo de autenticación pública.

Las métricas útiles incluyen:

- mercados observados;
- libros frescos/viejos;
- oportunidades y rechazos;
- latencia;
- operaciones;
- beneficio neto;
- errores;
- pausas;
- inventario residual.

## Compatibilidad y cambios

Cuando un proveedor cambia un campo, fee, endpoint o contrato, yo actualizo:

1. adaptador;
2. tipos y validación;
3. pruebas de contrato;
4. este capítulo;
5. runbook de rollout/rollback.