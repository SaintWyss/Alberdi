# 01 — Producto y primeros pasos

## Explicación simple

Yo construí Alberdi para detectar una situación muy concreta en mercados binarios: comprar la misma cantidad de **YES** y **NO** cuando el costo total ejecutable es menor que el valor que puede recuperarse al unir ambos tokens.

Alberdi no intenta adivinar quién ganará. Yo no lo diseñé como un bot direccional, un sistema de apuestas ni una promesa de multiplicar dinero.

## Ejemplo cotidiano

Imaginá que dos cupones complementarios pueden canjearse juntos por 1 dólar. Si consigo ambos por 0,97 dólares, todavía debo descontar comisiones y costos. Solo existe una oportunidad si, después de todos esos costos, queda una ganancia real y ejecutable.

Alberdi hace ese cálculo con libros de órdenes, profundidad, fees, capital disponible y límites de riesgo.

## Cómo lo explicaría yo

> Yo uso Alberdi para buscar arbitraje de conjunto completo. El sistema compra YES y NO en partes iguales únicamente cuando la profundidad disponible permite recuperar más de lo que cuesta la operación completa.

## Qué problema resuelve

Yo separé el problema en cinco partes:

1. descubrir mercados binarios válidos;
2. mantener libros de órdenes frescos;
3. calcular el costo real de toda la cantidad, no solo el mejor precio visible;
4. aplicar límites de riesgo independientes;
5. ejecutar, reconciliar y registrar evidencia.

## Qué no hace

- No predice resultados.
- No usa martingala.
- No aumenta el riesgo para alcanzar un objetivo de ganancias.
- No garantiza convertir USD 10 en USD 100.
- No permite que una IA ignore los límites deterministas.
- No convierte dos órdenes separadas en una transacción atómica inexistente.

## Modos disponibles

| Modo | Qué hace | Riesgo financiero |
|---|---|---|
| `scanner` | observa y registra oportunidades | no envía órdenes |
| `paper` | simula contra libros reales | no usa dinero real |
| `live` | firma y envía órdenes reales | puede perder dinero |

Yo considero `scanner` y `paper` etapas obligatorias. `live` no es un modo de demostración.

## Requisitos

- Node.js 22 o superior.
- npm.
- Conexión a los endpoints públicos configurados.
- Para `live`: wallet EOA dedicada, pUSD, POL para gas y credenciales válidas.
- Jurisdicción permitida para operar.

## Instalación segura

```bash
cp .env.example .env
chmod 600 .env
npm ci
npm run typecheck
npm test
npm run build
npm run doctor
```

Yo uso `npm ci` para instalar exactamente las versiones bloqueadas y reducir diferencias entre equipos.

## Primera ejecución recomendada

```bash
npm run doctor
npm run scan
npm run report
```

Después de observar el sistema, continúo con:

```bash
npm run paper
npm run report
```

No agrego la clave privada durante las primeras pruebas.

## Resultado esperado

Una instalación sana debe:

- validar configuración;
- comprobar endpoints;
- informar geoblocking;
- descubrir mercados;
- rechazar libros viejos;
- registrar oportunidades y motivos de rechazo;
- exponer salud y métricas solo en localhost.

## Criterio para seguir

Yo no avanzo a `live` porque el proceso «arrancó». Avanzo únicamente cuando:

- el doctor no muestra bloqueos;
- el scanner funciona durante una ventana representativa;
- paper trading no presenta errores de reconciliación;
- entiendo los reportes;
- hice backup del directorio de datos;
- preparé una wallet dedicada con capital mínimo;
- acepté explícitamente el riesgo residual de dos órdenes no atómicas.