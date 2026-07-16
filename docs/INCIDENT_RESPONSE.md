# Respuesta a incidentes

## 1. Prioridad

Ante una anomalía, preservar capital y evidencia tiene prioridad sobre mantener el proceso activo o perseguir una oportunidad.

Orden general:

1. detener nuevas ejecuciones;
2. verificar órdenes y balances por un canal independiente;
3. preservar SQLite y logs;
4. contener credenciales si aplica;
5. reconciliar;
6. determinar causa raíz;
7. volver primero a scanner/paper.

## 2. Parada de emergencia

```bash
sudo systemctl stop alberdi
# o
docker compose stop alberdi
```

Luego verificar que no existan órdenes activas. El shutdown intenta `cancelAll`, pero una falla de red o del proceso puede impedirlo; no asumir cancelación sin comprobarla externamente.

No reiniciar hasta registrar:

- hora UTC;
- commit/release;
- modo;
- `pauseReason`;
- último execution ID;
- balances pUSD/YES/NO;
- órdenes y hashes relevantes;
- logs alrededor del incidente.

## 3. Partial fill o posición residual

Síntomas:

- ejecución `PARTIAL`;
- balance YES distinto de NO;
- merge menor que shares solicitadas;
- `paused=true` después de una ejecución.

Procedimiento:

1. detener el motor si no está ya pausado;
2. no comprar automáticamente la pierna faltante;
3. consultar balances de ambos conditional tokens;
4. identificar la cantidad emparejada y confirmar si ya fue fusionada;
5. registrar el residual no emparejado;
6. revisar respuestas de ambas órdenes y estado en CLOB;
7. comparar collateral antes/después con SQLite;
8. decidir manualmente entre mantener, cerrar o esperar resolución según riesgo y precio vigente;
9. documentar cualquier operación manual fuera de Alberdi;
10. volver a paper después de corregir la causa.

El residual es exposición direccional. No debe tratarse como arbitraje garantizado.

## 4. Reconciliación negativa o ambigua

Activar este procedimiento cuando:

- el PnL registrado no coincide con wallet;
- no se conoce el estado final de una orden;
- hubo timeout después de enviar órdenes;
- el merge existe pero el collateral no se actualizó dentro del timeout;
- RPC y CLOB devuelven estados incompatibles.

Acciones:

1. detener el proceso;
2. conservar el SQLite original sin editar;
3. consultar transaction receipts en Polygon;
4. consultar estado de órdenes por ID;
5. reconstruir balances antes/después desde cadena y CLOB;
6. clasificar cada pierna como no enviada, abierta, cancelada, matched o desconocida;
7. evitar reintentos ciegos;
8. generar una nota de reconciliación con fuentes y timestamps;
9. no reanudar live mientras exista un estado desconocido.

## 5. Credencial o private key expuesta

1. detener Alberdi;
2. retirar fondos a una wallet segura nueva;
3. cancelar órdenes activas;
4. revocar/rotar credenciales CLOB y OpenAI;
5. reemplazar la EOA;
6. rotar secretos de cualquier backup o host afectado;
7. revisar logs y accesos;
8. preservar evidencia sin copiar la clave comprometida;
9. invalidar imágenes, artefactos o tickets que contengan el secreto;
10. realizar postmortem antes de live.

No basta con borrar `.env` si la clave ya pudo ser leída.

## 6. Geoblocking o cambio regulatorio

Si `doctor` o live detectan bloqueo:

- no intentar evadirlo con VPN, proxy o cambio de endpoint;
- detener operación;
- registrar respuesta y ubicación del runtime;
- revisar términos y requisitos aplicables;
- mantener únicamente scanner si su uso también está permitido.

## 7. Caída de CLOB, Gamma, WebSocket o RPC

- CLOB/Gamma sin respuesta: no iniciar live.
- WebSocket inestable o libros stale: no operar con snapshots vencidos.
- RPC degradado: no asumir que merge/receipt falló o tuvo éxito sin verificación.
- Reconexiones repetidas: pausar y evaluar límites/rate limits.

No bajar `BOOK_STALE_MS` ni desactivar checks para forzar actividad.

## 8. SQLite corrupto o almacenamiento lleno

1. detener el proceso;
2. copiar DB, WAL y SHM sin modificarlos;
3. revisar espacio e I/O del host;
4. restaurar una copia en entorno aislado;
5. ejecutar `npm run report` contra la copia;
6. comparar con wallet antes de aceptar el restore;
7. no borrar evidencia original.

## 9. Supervisor OpenAI defectuoso

Una respuesta inválida o indisponibilidad no debe elevar riesgo. Si el supervisor genera pausas incorrectas o errores:

1. detener o mantener pausado;
2. configurar `OPENAI_ENABLED=false`;
3. volver a scanner/paper;
4. revisar prompts, schema y logs sin exponer secretos;
5. comprobar que `RiskEngine` sigue imponiendo límites.

## 10. Postmortem mínimo

Documentar:

- impacto financiero y operativo;
- línea temporal UTC;
- causa raíz y factores contribuyentes;
- controles que funcionaron;
- controles que fallaron;
- reconciliación final;
- acciones correctivas con owner y fecha;
- gate objetivo para volver a live.

Una corrección de código no cierra el incidente hasta validar paper, backup/restore y un nuevo ciclo mínimo supervisado.
