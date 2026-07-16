# 02 — Uso funcional

## Flujo normal

Yo opero Alberdi con una secuencia deliberadamente simple:

```text
doctor → scanner → report → paper → report → aceptación → live
```

Cada paso reduce una incertidumbre distinta. Saltar etapas ahorra minutos, pero aumenta el riesgo de perder fondos o interpretar mal el sistema.

## `doctor`

```bash
npm run doctor
```

Yo uso este comando para validar:

- variables obligatorias;
- conectividad;
- respuesta de geoblocking;
- parámetros de capital y riesgo;
- disponibilidad de servicios necesarios;
- coherencia matemática del objetivo configurado.

Un doctor exitoso no prueba que live sea rentable. Solo indica que la configuración básica es coherente.

## `scan`

```bash
npm run scan
```

En este modo yo observo mercados y libros sin autenticar una wallet ni enviar órdenes.

El scanner puede descartar una oportunidad por:

- libro viejo;
- profundidad insuficiente;
- fee desconocida;
- ganancia inferior al mínimo;
- capital insuficiente;
- cooldown activo;
- mercado no binario o metadata incompleta.

Los rechazos son información útil. Un sistema prudente debe rechazar la mayoría de las situaciones dudosas.

## `paper`

```bash
npm run paper
```

Paper usa datos reales pero simula la ejecución. Yo lo uso para comprobar:

- frecuencia de oportunidades;
- sensibilidad a fees y profundidad;
- comportamiento del sizing;
- drawdown teórico;
- cooldowns;
- persistencia y reportes.

La simulación no reproduce completamente latencia, rechazos, cambios entre firma y ejecución ni comportamiento de la cadena.

## `report`

```bash
npm run report
```

Yo reviso como mínimo:

- oportunidades detectadas;
- razones de rechazo;
- operaciones simuladas o reales;
- beneficio bruto y neto;
- fees;
- pausas;
- errores consecutivos;
- inventario residual;
- timestamps de reconciliación.

No uso solo el saldo final para evaluar calidad. Una ganancia aislada puede ocultar riesgo residual o datos incompletos.

## `live`

Antes de ejecutar:

```dotenv
MODE=live
POLYMARKET_SIGNATURE_TYPE=0
PRIVATE_KEY=0x...
LIVE_TRADING_ACK=I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST
```

Después:

```bash
npm run live
```

Yo comienzo con el mínimo tamaño aceptado por el mercado y capital que puedo perder por completo.

## Qué ocurre durante una operación

1. Alberdi toma un snapshot fresco de ambos libros.
2. Calcula cuánta cantidad puede comprarse en los niveles disponibles.
3. Descuenta fees y reserva de seguridad.
4. Consulta los límites del motor de riesgo.
5. Construye dos órdenes FOK de igual cantidad.
6. Envía ambas.
7. Consulta balances y órdenes.
8. Une únicamente el inventario YES/NO emparejado.
9. Si existe incertidumbre o residuo, pausa.
10. Registra evidencia durable.

## Estados esperables

| Estado | Significado | Mi acción |
|---|---|---|
| observando | no hay oportunidad aprobada | continuar supervisión |
| oportunidad rechazada | falló una condición | revisar motivo, no forzar |
| ejecutada | las dos patas y la reconciliación terminaron | revisar resultado |
| parcial/ambigua | existe diferencia entre órdenes o balances | detener y reconciliar |
| pausada por riesgo | se alcanzó un límite | investigar antes de reanudar |
| objetivo alcanzado | se activó `STOP_AT_TARGET` | retirar o redefinir de forma consciente |

## Parada normal

Yo detengo con la señal normal del proceso y espero el cierre ordenado. No mato el proceso durante firma, reconciliación o merge salvo que exista una emergencia.

## Parada de emergencia

1. detengo Alberdi;
2. reviso órdenes abiertas desde una interfaz independiente;
3. cancelo lo que corresponda;
4. verifico balances de pUSD, YES, NO y POL;
5. preservo base SQLite y logs;
6. no reinicio live hasta entender el estado.

## Supervisor con OpenAI

Cuando `OPENAI_ENABLED=true`, yo uso el modelo para resumir estado y recomendar reducción de riesgo o pausa. No lo uso para:

- calcular el edge;
- elegir cantidades;
- saltar un rechazo;
- aumentar límites;
- firmar órdenes;
- decidir en la ruta de baja latencia.

## Errores frecuentes

| Problema | Causa probable | Resolución |
|---|---|---|
| no descubre mercados | endpoint o filtros | ejecutar doctor y revisar logs |
| libros siempre viejos | WebSocket/red/reloj | revisar conexión y timestamps |
| ninguna oportunidad | mercado eficiente o límites estrictos | no relajar sin evidencia |
| live no inicia | falta acknowledgement, EOA o credenciales | revisar configuración |
| merge falla | gas, allowance o contrato | pausar y seguir runbook |
| saldo no coincide | fill parcial, retraso o consulta fallida | reconciliar manualmente |

## Regla operativa

Yo nunca convierto un error repetido en una razón para ampliar tolerancias. Primero identifico la causa, reproduzco en paper y recién después evalúo un cambio.