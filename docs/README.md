# Documentación técnica de Alberdi

Esta carpeta es la entrada canónica para entender, configurar, operar y auditar Alberdi.

## Mapa documental

| Documento | Propósito | Audiencia |
|---|---|---|
| [Arquitectura](ARCHITECTURE.md) | Componentes, flujos, límites y decisiones implementadas | Ingeniería y revisión |
| [Configuración](CONFIGURATION.md) | Variables de entorno, secretos, modos y validaciones | Desarrollo y operaciones |
| [Preparación de wallet](WALLET_SETUP.md) | Wallet dedicada, fondos mínimos y preflight de live mode | Operador |
| [Operaciones](OPERATIONS.md) | Scanner, paper, live, observabilidad, backup, restore y rollback | Operador/SRE |
| [Respuesta a incidentes](INCIDENT_RESPONSE.md) | Partial fills, reconciliación, credenciales y parada de emergencia | Operador/SRE |
| [Modelo de amenazas](THREAT_MODEL.md) | Activos, trust boundaries, amenazas y controles | Seguridad |
| [Testing y validación](TESTING.md) | Gates de repositorio, paper gate y aceptación de entorno | QA/operaciones |
| [Trazabilidad](TRACEABILITY.md) | Capacidad → implementación → verificación → estado | Producto, QA e ingeniería |

## Precedencia de verdad

Cuando exista una diferencia entre narrativa y comportamiento, la precedencia es:

1. restricciones del runtime y validaciones de `src/config.ts`;
2. código de ejecución y riesgo;
3. tests automatizados;
4. `.env.example` y documentación canónica;
5. planes o notas históricas.

## Estados usados

- **Implementado**: flujo conectado y verificable en el repositorio.
- **Implementado, aceptación externa pendiente**: el código existe, pero requiere wallet, credenciales, jurisdicción habilitada o fondos reales.
- **Parcial**: existe una parte del flujo, pero falta una garantía operativa o integración.
- **Pendiente**: no debe asumirse disponible.

## Regla de mantenimiento

Todo cambio que modifique variables, riesgo, órdenes, reconciliación, settlement, persistencia, métricas o topología de despliegue debe actualizar la documentación afectada en el mismo PR.
