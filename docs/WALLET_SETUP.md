# Preparación de wallet para live mode

## 1. Regla principal

Usar una EOA de Polygon creada exclusivamente para Alberdi. No usar una wallet personal, Safe, Proxy, deposit wallet ni una dirección que custodie activos ajenos al bankroll del bot.

La clave privada otorga control total sobre los fondos. Alberdi no puede recuperar una clave perdida ni revertir una transacción confirmada.

## 2. Activos mínimos

La wallet necesita:

- pUSD suficiente para el bankroll de prueba;
- una cantidad pequeña de POL para gas;
- allowances requeridos por CLOB/conditional tokens;
- aprobación ERC-1155 cuando corresponda para la fusión.

Empezar con el mínimo previsto por el plan de capital. No transferir capital adicional hasta completar los gates de paper y live controlado.

## 3. Custodia

1. Generar la EOA fuera del repositorio.
2. Guardar la seed/private key en un gestor de secretos o mecanismo cifrado.
3. Copiar únicamente la private key operativa a `.env` en la máquina de ejecución.
4. Aplicar `chmod 0600 .env`.
5. Evitar clipboard managers, shell history, capturas, logs y prompts.
6. Mantener una dirección de retiro separada y segura.

No incluir `.env` en imágenes Docker, backups sin cifrar o soporte técnico.

## 4. Credenciales CLOB

Alberdi puede usar `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET` y `POLYMARKET_API_PASSPHRASE` existentes. Si faltan, el cliente intenta derivarlas en memoria al iniciar live.

Para operación estable:

1. ejecutar la derivación una sola vez en un entorno controlado;
2. persistir las credenciales en el secret store/`.env` autorizado;
3. reiniciar y confirmar que el proceso ya no informa derivación temporal;
4. rotarlas ante sospecha de exposición.

## 5. Preflight obligatorio

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run doctor
```

Verificar manualmente:

- el endpoint de geoblock no marca el runtime como bloqueado;
- la EOA cargada coincide con la dirección esperada;
- `POLYMARKET_SIGNATURE_TYPE=0`;
- pUSD y POL son visibles en Polygon;
- el bankroll no supera el monto autorizado para la prueba;
- `DATA_DIR` es persistente y tiene backup;
- `/health`, `/status` y `/metrics` permanecen ligados a localhost;
- el reloj del sistema está sincronizado;
- no hay otra instancia de Alberdi usando la misma wallet.

## 6. Habilitación explícita

Live requiere:

```dotenv
MODE=live
PRIVATE_KEY=0x...
POLYMARKET_SIGNATURE_TYPE=0
LIVE_TRADING_ACK=I_UNDERSTAND_REAL_MONEY_CAN_BE_LOST
```

El acknowledgement no es una protección suficiente por sí solo. Solo debe agregarse después de completar los gates de [Testing](TESTING.md) y el procedimiento de [Operaciones](OPERATIONS.md).

## 7. Primera ejecución

La primera ejecución real debe ser supervisada:

1. limitar `MAX_CAPITAL_PER_TRADE_USD` al mínimo compatible con el mercado;
2. abrir `/status`, `/metrics` y logs;
3. iniciar live en primer plano;
4. observar un único ciclo;
5. confirmar balances YES/NO/pUSD y hash de merge;
6. detener el proceso;
7. ejecutar `npm run report`;
8. comparar PnL registrado con el delta real de wallet.

No dejar el servicio desatendido hasta completar esa reconciliación.

## 8. Rotación o retiro

Ante incidente:

1. detener Alberdi;
2. cancelar órdenes desde una interfaz independiente si fuera necesario;
3. mover fondos a la dirección de retiro segura;
4. revocar/rotar credenciales CLOB;
5. generar una EOA nueva;
6. preservar SQLite y logs para investigación;
7. no reutilizar la clave comprometida.
