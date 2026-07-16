# Manual normalizado de Alberdi

Yo diseñé este manual como una ruta de aprendizaje progresiva. No hace falta conocer Polymarket, blockchain ni arbitraje antes de empezar.

## Receta común

Todos mis repositorios usan la misma estructura documental:

| Capítulo | Pregunta que responde |
|---|---|
| 01 | ¿Qué es el sistema y cómo lo pruebo sin riesgo? |
| 02 | ¿Cómo uso cada función? |
| 03 | ¿Cómo está construido y por qué elegí esa arquitectura? |
| 04 | ¿Cómo se representa con UML? |
| 05 | ¿Cómo se configura y qué datos intercambia? |
| 06 | ¿Cómo protejo y verifico el sistema? |
| 07 | ¿Cómo lo opero, despliego y recupero? |
| 08 | ¿Qué está terminado, qué falta y qué términos debo conocer? |

## Convenciones de estado

- **Implementado:** existe código conectado al flujo real.
- **Probado:** existe evidencia automatizada o un smoke reproducible.
- **Validado externamente:** fue comprobado con servicios, wallet o hardware reales.
- **Parcial:** existe una parte funcional, pero faltan controles o aceptación.
- **Pendiente:** está diseñado o planificado, pero no debo presentarlo como terminado.

## Documentación avanzada existente

Este manual no elimina los documentos técnicos previos. Para profundizar, yo mantengo:

- `docs/ARCHITECTURE.md`;
- `docs/CONFIGURATION.md`;
- `docs/WALLET_SETUP.md`;
- `docs/OPERATIONS.md`;
- `docs/INCIDENT_RESPONSE.md`;
- `docs/THREAT_MODEL.md`;
- `docs/TESTING.md`;
- `docs/TRACEABILITY.md`;
- `PLAN_0_100.md`;
- `SECURITY.md`.

## Regla editorial

Cuando cambio una variable, flujo, integración, riesgo, estado o decisión arquitectónica, yo actualizo en el mismo pull request el capítulo correspondiente y la evidencia relacionada.