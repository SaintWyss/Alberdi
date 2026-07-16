# 06 — Seguridad, pruebas y calidad

## Modelo mental

Yo protejo cuatro activos principales:

1. la clave privada y las credenciales;
2. el capital e inventario;
3. la integridad de la estrategia y los límites;
4. la evidencia necesaria para investigar.

La seguridad no se limita a ocultar una API key. Un error de profundidad, reconciliación o estado también puede causar una pérdida financiera.

## Amenazas principales

| Amenaza | Ejemplo | Control |
|---|---|---|
| robo de secretos | `.env` expuesto | permisos, redacción, wallet dedicada |
| manipulación de configuración | ampliar límites | validación fail-fast y revisión |
| datos viejos | ordenar con libro vencido | timestamp y `BOOK_STALE_MS` |
| fill residual | una pata se completa | FOK, reconciliación y pausa |
| doble instancia | dos procesos usan la wallet | regla operativa de exclusión |
| dependencia comprometida | paquete malicioso | lockfile, auditoría y CI |
| error del supervisor | recomienda más riesgo | supervisor solo puede reducir o pausar |
| pérdida de evidencia | base dañada | WAL, backup, checksums y restore drill |
| jurisdicción prohibida | operar bloqueado | consulta geo y prohibición de bypass |

## Defensa en profundidad

Yo aplico varias capas:

- wallet EOA dedicada con capital limitado;
- `.env` fuera de Git;
- secretos nunca enviados al modelo;
- límites duros en código/configuración;
- cálculo determinista;
- órdenes FOK por pata;
- reconciliación posterior;
- pausa ante incertidumbre;
- status en localhost;
- logs redactados;
- evidencia SQLite durable;
- scanner y paper antes de live.

Ninguna capa elimina por sí sola el riesgo de las dos patas no atómicas.

## Pruebas automatizadas

La suite actual cubre principalmente:

- matemáticas de complete-set;
- fees y reservas;
- profundidad;
- sizing;
- límites básicos de riesgo;
- comportamiento de estrategia;
- validación de configuración.

Yo no presento como cubierto lo que todavía requiere más pruebas:

- `LiveBroker` contra un entorno controlado;
- WebSocket y reconstrucción de libro;
- fallos entre las dos órdenes;
- reconciliación ambigua;
- SQLite/WAL bajo crash;
- merge y settlement;
- recuperación después de una pausa;
- integración completa con relayer.

## Pirámide de pruebas

```text
muchas pruebas unitarias
    ↓
pruebas de integración con adaptadores falsos
    ↓
pruebas de contrato contra respuestas grabadas
    ↓
smoke scanner/paper con servicios reales
    ↓
smoke live mínimo y supervisado
```

Yo mantengo pocas pruebas live porque cuestan dinero y dependen de servicios externos, pero documento su evidencia y no las reemplazo con mocks.

## Gates de calidad

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run doctor
```

Antes de una release también verifico:

- auditoría de dependencias;
- ausencia de secretos;
- enlaces internos de documentación;
- render de Mermaid;
- smoke scanner;
- paper trading representativo;
- backup y restauración;
- rollback de versión.

## Criterios de aceptación para live

Yo exijo evidencia de:

- configuración validada;
- wallet dedicada;
- capital mínimo;
- POL suficiente;
- allowances controladas;
- geoblocking permitido;
- CLOB y RPC sanos;
- paper estable;
- reportes comprensibles;
- estrategia y riesgo sin cambios no revisados;
- procedimiento de emergencia disponible.

## Calidad del código

Mis reglas son:

- tipos estrictos;
- funciones pequeñas y deterministas cuando es posible;
- adaptadores externos separados;
- errores explícitos;
- ninguna aritmética crítica delegada a texto o IA;
- no usar `any` para ocultar contratos externos sin validación;
- no mezclar logging con secretos;
- cambios de configuración acompañados por documentación.

## Revisión de cambios

Un pull request que modifica estrategia, ejecución o riesgo debe responder:

1. ¿qué invariante cambia?;
2. ¿cómo se prueba?;
3. ¿qué riesgo nuevo aparece?;
4. ¿qué métrica lo detecta?;
5. ¿cómo se revierte?;
6. ¿qué documentación queda afectada?

## Incidente de secretos

Si una clave puede haberse expuesto, yo:

1. detengo el proceso;
2. cancelo órdenes;
3. muevo fondos a una wallet nueva;
4. roto credenciales CLOB, relayer y OpenAI;
5. preservo logs y base;
6. retiro la wallet comprometida.

Borrar `.env` no revoca una clave ya expuesta.

## Definición de terminado

Yo no considero terminado un cambio crítico hasta que tenga:

- implementación conectada;
- pruebas adecuadas;
- evidencia operativa cuando corresponda;
- métricas/logs;
- documentación;
- rollback;
- revisión de seguridad.