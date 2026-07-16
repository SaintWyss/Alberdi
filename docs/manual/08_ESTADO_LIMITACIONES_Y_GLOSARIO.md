# 08 — Estado, limitaciones, roadmap y glosario

## Estado actual

Yo separo el estado por capacidad:

| Capacidad | Estado |
|---|---|
| descubrimiento Gamma | implementado |
| metadata CLOB | implementado |
| libros REST + WebSocket | implementado; requiere más pruebas de integración |
| evaluación full-depth | implementado y probado en núcleo |
| fees y reserva | implementado |
| motor de riesgo | implementado y probado en reglas básicas |
| scanner | implementado |
| paper | implementado |
| live EOA | implementado; aceptación real depende del entorno |
| reconciliación | implementada; faltan más escenarios automatizados |
| merge Polygon | implementado; requiere evidencia operativa controlada |
| SQLite/reportes | implementado; faltan pruebas de crash/restore más amplias |
| supervisor OpenAI | implementado como asesor no crítico |
| rentabilidad objetivo | no garantizada ni verificable por documentación |

## Limitaciones conocidas

### No existe atomicidad entre las dos patas

Polymarket procesa órdenes individuales. FOK limita el comportamiento de cada orden, pero no convierte YES y NO en una única transacción indivisible.

### Paper no reproduce todo

No modela perfectamente latencia, competencia, cambios durante firma, rechazos externos, congestión ni fallos de cadena.

### Una única instancia

Yo diseño la base y coordinación para un solo proceso por wallet. Ejecutar dos instancias puede duplicar decisiones y romper límites.

### Dependencia de proveedores

Gamma, CLOB, WebSocket, Polygon RPC y OpenAI pueden cambiar o fallar.

### Aceptación jurisdiccional

El software no reemplaza la obligación del operador de verificar leyes, términos y geoblocking.

### Capital pequeño

Con USD 10, fees, mínimos y profundidad pueden volver inviables muchas oportunidades. Aumentar riesgo para compensarlo contradice el diseño.

## Roadmap recomendado

### Prioridad 1 — Evidencia de ejecución

- pruebas de contrato CLOB;
- escenarios de una pata completada;
- reconciliación repetible;
- merge en red real con tamaño mínimo;
- restore drill documentado.

### Prioridad 2 — Robustez

- reproducción de WebSocket grabado;
- inyección de fallos;
- pruebas de crash SQLite/WAL;
- lock de instancia por wallet;
- alertas operativas.

### Prioridad 3 — Seguridad y supply chain

- secret scanning;
- SBOM;
- auditoría de dependencias;
- imágenes firmadas si se distribuye;
- hardening de host.

### Prioridad 4 — Evolución

Solo después de validar el núcleo yo evaluaría:

- más mercados;
- múltiples wallets aisladas;
- base remota;
- ejecución distribuida;
- contratos propios;
- reconciliación automatizada adicional.

## Glosario

**Arbitraje de conjunto completo:** compra de resultados complementarios cuyo valor conjunto puede canjearse por un monto conocido.

**YES/NO:** tokens que representan los dos resultados de un mercado binario.

**pUSD:** collateral utilizado por el flujo actual de Polymarket configurado en el proyecto.

**CLOB:** libro central de órdenes con límites de precio y cantidad.

**Gamma API:** servicio usado para descubrir y describir mercados.

**Order book / libro:** conjunto de órdenes de compra y venta por niveles de precio.

**Top-of-book:** mejor precio visible; no representa toda la profundidad.

**Profundidad:** cantidad disponible en varios niveles de precio.

**Edge:** diferencia favorable estimada entre costo y valor recuperable.

**BPS:** puntos básicos. 100 bps equivalen a 1 %.

**Taker fee:** comisión por ejecutar contra liquidez existente.

**Safety reserve:** margen adicional que yo descuento para cubrir incertidumbre.

**FOK:** Fill-Or-Kill; una orden se completa totalmente o se cancela.

**EOA:** cuenta de Ethereum/Polygon controlada por una clave privada.

**Allowance:** permiso on-chain para que un contrato use un token.

**Merge:** unión de cantidades iguales de YES y NO para recuperar collateral.

**Reconciliación:** comparación de órdenes, fills, balances e inventario hasta obtener un estado inequívoco.

**Inventario residual:** tokens que quedan sin pareja después de una ejecución.

**WAL:** Write-Ahead Log de SQLite, usado para durabilidad y concurrencia local.

**Drawdown:** caída desde un máximo de capital hasta un valor posterior.

**Cooldown:** período durante el cual no se repite una oportunidad.

**Fail-closed:** ante duda o falta de datos, el sistema rechaza o pausa.

**Smoke test:** prueba breve que confirma que un flujo básico funciona en el entorno real.

**RPO:** cantidad máxima de datos que se acepta perder ante recuperación.

**RTO:** tiempo objetivo para recuperar el servicio.

## Cierre

Yo considero Alberdi un motor de software completo en su alcance técnico, pero no lo presento como una máquina de ganancias. Su calidad se mide por corrección, control del riesgo, trazabilidad y capacidad de detenerse cuando la realidad no coincide con el modelo.