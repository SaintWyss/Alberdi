# Testing y validación

## 1. Gates del repositorio

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run doctor
```

Un cambio no está listo si alguno falla. `doctor` requiere red y valida conectividad externa, geoblock y disponibilidad del universo de mercados.

## 2. Cobertura automatizada actual

| Suite | Cobertura |
|---|---|
| `tests/math.test.ts` | fee-aware math, recorrido de profundidad y tasa compuesta objetivo |
| `tests/strategy.test.ts` | candidato rentable, rechazo no rentable, libros stale y min order size cero |
| `tests/risk.test.ts` | aprobación dentro de límites, stop diario y multiplicador supervisor reductor |

Estas pruebas demuestran la lógica central, pero no constituyen aceptación completa del sistema live.

## 3. Cobertura faltante prioritaria

Antes de aumentar capital deben agregarse:

- tests de fee curves y redondeo en límites de tick/minimum size;
- múltiples niveles de profundidad y cantidades cercanas a boundaries;
- BookStore/WebSocket: snapshot, delta, reconexión y staleness;
- descubrimiento Gamma y metadata CLOB con fixtures;
- `LiveBroker` con respuestas completas, parciales, vacías y ambiguas;
- reconciliación de balances y timeouts;
- merge exitoso, revertido y receipt demorado;
- `cancelAll` durante shutdown;
- persistencia SQLite, WAL, restart y report;
- status/health/metrics;
- supervisor con output inválido o API caída;
- configuración de live y protección de secretos;
- geoblock bloqueado;
- doble instancia/wallet lock cuando se implemente.

## 4. Scanner soak test

Objetivo: verificar estabilidad sin autenticación.

Gate recomendado:

- 24 horas continuas;
- cero crashes;
- reconexiones explicadas y recuperadas;
- cero libros stale evaluados;
- refresh de universo estable;
- status y métricas disponibles;
- SQLite consistente después de reinicio.

Registrar commit, configuración no secreta, timestamps, cantidad de mercados, candidatos y errores.

## 5. Paper graduation gate

Antes de live:

- al menos 24 horas continuas;
- al menos 100 candidatos detectados, o evidencia documentada de mercado insuficiente;
- PnL virtual positivo después de fees y safety reserve;
- cero inconsistencias contables;
- cero ejecuciones sobre libros stale;
- ningún límite duro evadido;
- backup y restore drill exitosos;
- `npm run report` coherente después de reiniciar.

Si el gate no se cumple, el resultado correcto es permanecer en paper. No bajar thresholds para fabricar aprobación.

## 6. Aceptación live con capital mínimo

La aceptación de entorno no puede completarse en CI porque requiere wallet, jurisdicción y contratos reales.

Procedimiento:

1. wallet EOA dedicada con bankroll mínimo y POL;
2. `npm run doctor` exitoso;
3. scanner y paper gates aprobados en la misma máquina;
4. límites reducidos para un solo ciclo;
5. live en primer plano y supervisado;
6. observar ambas órdenes, balances y merge;
7. detener después del primer ciclo;
8. comparar SQLite, CLOB, Polygon y balances;
9. registrar resultado y evidencia sin secretos.

Cualquier partial, estado desconocido o delta negativo no explicado devuelve el sistema a paper.

## 7. Ladder de capital

- Comenzar con USD 10 o el mínimo aprobado.
- Mantener un ciclo simultáneo y cap por trade reducido.
- No aumentar hasta completar 25 ciclos reconciliados sin partials.
- Aumentos manuales, graduales y documentados.
- Un partial, pérdida inexplicable o ambigüedad de API reinicia el gate.

El objetivo temporal no autoriza saltar escalones.

## 8. Evidencia de release

Cada release debería registrar:

- commit SHA;
- Node/npm y dependencias principales;
- resultados de typecheck/tests/build;
- resultado de doctor;
- duración scanner/paper;
- backup/restore drill;
- gaps conocidos;
- aceptación live, si ocurrió, sin direcciones o secretos innecesarios.

## 9. Definición de terminado

Una capacidad financiera solo se considera terminada cuando:

1. tiene implementación conectada;
2. maneja éxito, rechazo, timeout y estado ambiguo;
3. deja evidencia persistente;
4. aplica límites de riesgo;
5. posee pruebas automatizadas razonables;
6. tiene runbook de recuperación;
7. fue validada en el entorno correspondiente.
