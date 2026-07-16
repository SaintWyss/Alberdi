# Operaciones

## 1. Secuencia autorizada

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run doctor
npm run scan
npm run paper
npm run report
```

`npm run live` solo se habilita después de cumplir los gates de [Testing](TESTING.md).

## 2. Scanner

```bash
npm run scan
```

Scanner consume información pública y registra candidatos. No debe requerir clave privada ni credenciales de trading.

Controlar:

```bash
curl -fsS http://127.0.0.1:8787/health
curl -fsS http://127.0.0.1:8787/status | jq
curl -fsS http://127.0.0.1:8787/metrics
```

## 3. Paper trading

```bash
npm run paper
```

Paper usa los mismos candidatos que live, pero ejecuta con `PaperBroker`. La evidencia se conserva en SQLite dentro de `DATA_DIR`.

No considerar paper rentable si:

- hubo crashes o reinicios no explicados;
- se ejecutaron libros stale;
- existen inconsistencias contables;
- el beneficio desaparece después de fees y reserva;
- el volumen de oportunidades es insuficiente.

## 4. Live en primer plano

```bash
npm run live
```

Durante la primera aceptación mantener abiertas tres vistas:

```bash
npm run report
curl -fsS http://127.0.0.1:8787/status | jq
journalctl -f -u alberdi   # si corre como servicio
```

Un estado `paused: true` requiere intervención. No reiniciar automáticamente sin comprender `pauseReason` y reconciliar wallet/auditoría.

## 5. Docker Compose

```bash
docker compose build --pull
docker compose up -d
docker compose ps
docker compose logs -f --tail=200 alberdi
```

Compose publica `8787` solo en `127.0.0.1` y monta `./data:/app/data`. Verificar que `.env` no esté incluido en la imagen ni expuesto por permisos del host.

Detención:

```bash
docker compose stop alberdi
```

Actualización:

```bash
docker compose stop alberdi
cp -a data "data.backup.$(date -u +%Y%m%dT%H%M%SZ)"
git pull --ff-only
npm ci
npm run typecheck && npm test && npm run build
docker compose build --no-cache
docker compose up -d
```

## 6. systemd

La unidad incluida espera `/opt/alberdi`, `/opt/alberdi/.env` y `/opt/alberdi/data`.

```bash
sudo install -d -m 0750 /opt/alberdi
sudo cp -a dist package.json package-lock.json /opt/alberdi/
sudo install -m 0600 .env /opt/alberdi/.env
sudo install -d -m 0700 /opt/alberdi/data
sudo cp systemd/alberdi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now alberdi
sudo systemctl status alberdi
```

La unidad usa `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict` y permite escritura solo en `/opt/alberdi/data`.

## 7. Parada segura

Preferir SIGTERM/SIGINT. El shutdown intenta:

- detener timers;
- cerrar WebSocket;
- cancelar órdenes abiertas mediante `cancelAll`;
- cerrar status server;
- cerrar SQLite.

```bash
sudo systemctl stop alberdi
# o
docker compose stop alberdi
```

Después de detener, confirmar que no queden órdenes activas mediante una interfaz independiente de Polymarket.

## 8. Backup

La evidencia mínima es todo `DATA_DIR`, especialmente `poly-arb.sqlite` y sus archivos WAL/SHM si existen.

```bash
sudo systemctl stop alberdi   # snapshot consistente recomendado
tar -C "$(dirname "$DATA_DIR")" -czf "alberdi-data-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" "$(basename "$DATA_DIR")"
sha256sum alberdi-data-*.tar.gz > alberdi-data-checksums.txt
sudo systemctl start alberdi
```

Guardar `.env` por separado, cifrado y con control de acceso. No mezclar secretos con backups operativos normales.

## 9. Restore drill

1. detener el proceso;
2. preservar el directorio actual;
3. verificar SHA-256 del backup;
4. restaurar en una ruta aislada;
5. arrancar con `MODE=scanner` y `DATA_DIR` apuntando al restore;
6. ejecutar `npm run report`;
7. comparar conteos y PnL esperado;
8. destruir credenciales temporales.

Un backup nunca restaurado no se considera validado.

## 10. Rollback

Si una release falla:

1. detener Alberdi;
2. conservar logs, SQLite y versión exacta;
3. volver al commit/artefacto anterior;
4. no reemplazar la DB con una copia vieja hasta entender compatibilidad;
5. ejecutar typecheck, tests y doctor;
6. arrancar primero en scanner;
7. pasar a paper antes de reautorizar live.

## 11. Observabilidad mínima

Alertas operativas recomendadas:

- proceso caído o reiniciando;
- `/health` no responde;
- `paused=true`;
- `PARTIAL` o `FAILED` en ejecuciones;
- fallos consecutivos cercanos al máximo;
- PnL diario alcanza stop;
- libros stale o WebSocket reconectando repetidamente;
- ausencia de actualización de mercados;
- crecimiento anormal o corrupción de SQLite;
- balances reales no coinciden con auditoría.

## 12. Criterio de no operación

No ejecutar live si falta cualquiera de estos elementos:

- jurisdicción permitida;
- wallet dedicada;
- POL de gas;
- backup de evidencia;
- paper gate aprobado;
- conectividad estable;
- reloj sincronizado;
- posibilidad de observar y detener el proceso;
- procedimiento de reconciliación manual disponible.
