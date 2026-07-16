# 03 — Arquitectura y decisiones de ingeniería

## Visión simple

Yo dividí Alberdi en componentes con responsabilidades pequeñas. El motor no mezcla descubrimiento de mercados, cálculo, riesgo, ejecución, persistencia e IA en una sola clase.

La idea central es esta:

```text
datos confiables → cálculo determinista → límites duros → ejecución → reconciliación → evidencia
```

## Estilo arquitectónico

Yo elegí una arquitectura modular orientada a servicios internos, con dependencias explícitas y una ruta de ejecución determinista.

No es un sistema distribuido de microservicios. Para un único proceso de trading, separar cada módulo en un servicio remoto aumentaría latencia, fallos y complejidad operativa sin aportar aislamiento suficiente.

## Capas

| Capa | Responsabilidad |
|---|---|
| entrada/configuración | comandos, modo y validación fail-fast |
| mercado | descubrimiento, metadata, REST y WebSocket |
| estrategia | profundidad, fees, reserva y sizing |
| riesgo | límites independientes y pausas |
| ejecución | paper o live mediante el mismo contrato |
| reconciliación | órdenes, balances e inventario residual |
| infraestructura | SQLite, logs, métricas y health |
| supervisión | análisis periódico fuera de la ruta crítica |

## Por qué la arquitectura es adecuada

### Baja latencia sin sacrificar control

Yo mantengo datos, estrategia y riesgo dentro del mismo proceso para evitar llamadas de red internas. Aun así, separo los módulos mediante interfaces para poder probarlos y reemplazarlos.

### Fallo cerrado

Cuando falta metadata, el libro está viejo, la fee no es confiable o la reconciliación es ambigua, yo rechazo o pauso. Prefiero perder una oportunidad antes que inventar certeza.

### Evidencia durable

Yo persisto candidatos, decisiones, resultados y eventos en SQLite WAL. La base no es solo una comodidad: es el registro necesario para explicar qué ocurrió y reconstruir incidentes.

### IA fuera del camino crítico

Yo no delego aritmética financiera ni aprobación de riesgo a un LLM. La IA puede reducir riesgo o recomendar una pausa, pero no puede ampliar límites ni autorizar un rechazo.

## Decisiones principales

### D-01 — Estrategia determinista

**Yo elegí:** cálculo explícito de profundidad, fees y resultado neto.

**Porque:** el problema puede expresarse con reglas exactas y verificables.

**Descarté:** usar un modelo para decidir entradas, porque añade latencia, variabilidad y una superficie de error difícil de auditar.

### D-02 — Proceso modular único

**Yo elegí:** un proceso Node.js con módulos internos.

**Porque:** el volumen inicial y la necesidad de baja latencia no justifican microservicios.

**Costo aceptado:** un fallo del proceso puede afectar toda la ejecución; lo compenso con shutdown ordenado, persistencia y supervisión.

### D-03 — Libros WebSocket con semilla REST

**Yo elegí:** construir estado inicial por REST y mantenerlo por eventos.

**Porque:** esperar únicamente eventos puede dejar un libro incompleto; consultar REST en cada evaluación sería lento y costoso.

### D-04 — Full depth

**Yo elegí:** calcular sobre todos los niveles necesarios.

**Porque:** el mejor ask no garantiza que toda la cantidad tenga ese precio.

**Descarté:** evaluar solo top-of-book, porque produce falsos positivos.

### D-05 — Órdenes FOK

**Yo elegí:** Fill-Or-Kill para cada pata.

**Porque:** reduce fills parciales dentro de cada orden.

**Límite aceptado:** FOK no vuelve atómica la pareja de órdenes. Una puede completarse y la otra no.

### D-06 — EOA dedicada

**Yo elegí:** aceptar únicamente firma EOA en la versión actual.

**Porque:** simplifica autoridad, merge, recuperación y análisis de incidentes.

**Descarté temporalmente:** wallets proxy o Safe, porque agregan caminos de firma y recuperación no completamente validados.

### D-07 — SQLite WAL

**Yo elegí:** SQLite local en modo WAL.

**Porque:** ofrece transacciones, consultas, durabilidad y operación sencilla para una única instancia.

**No es adecuado para:** múltiples procesos escribiendo desde distintas máquinas.

### D-08 — Hard limits por configuración

**Yo elegí:** límites máximos validados al iniciar.

**Porque:** una recomendación externa o un bug de estrategia no debe aumentar exposición silenciosamente.

### D-09 — Separación scanner/paper/live

**Yo elegí:** tres modos explícitos.

**Porque:** permiten validar conectividad, estrategia y operación antes de introducir una clave privada.

### D-10 — Pausa ante ambigüedad

**Yo elegí:** detener el sistema cuando órdenes, balances o inventario no coinciden.

**Porque:** continuar puede acumular exposición direccional que contradice la estrategia.

## Atributos de calidad priorizados

1. seguridad financiera;
2. auditabilidad;
3. corrección determinista;
4. recuperación ante fallos;
5. baja latencia razonable;
6. mantenibilidad;
7. escalabilidad.

Yo puse escalabilidad al final porque escalar un motor incorrecto solo multiplica el daño.

## Diferencia frente a otras arquitecturas

| Alternativa | Ventaja | Por qué no la elegí ahora |
|---|---|---|
| microservicios | aislamiento y despliegue independiente | agrega red, coordinación y observabilidad distribuida |
| event sourcing completo | historial exhaustivo | complejidad mayor que la necesidad actual; SQLite ya conserva evidencia suficiente |
| bot controlado por LLM | flexibilidad textual | no es reproducible ni apropiado para la ruta de órdenes |
| ejecución on-chain atómica propia | reduce riesgo de dos patas | requiere contratos, auditoría y liquidez compatibles que no forman parte del alcance |
| base administrada remota | alta disponibilidad | aumenta dependencia y superficie de secretos para una instancia personal |

## Regla de evolución

Yo solo cambio esta arquitectura cuando una medición o requisito real demuestra que el diseño actual no alcanza. No introduzco distribución, colas o bases remotas por apariencia de sofisticación.