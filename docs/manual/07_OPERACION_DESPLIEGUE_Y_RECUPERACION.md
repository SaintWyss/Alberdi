# 07 — Operación, despliegue y recuperación

## Entornos

Yo separo tres entornos lógicos aunque use la misma máquina:

- desarrollo: cambios y pruebas unitarias;
- observación: scanner/paper con servicios reales;
- live: capital real, secretos y controles reforzados.

No reutilizo una base o `.env` live para pruebas destructivas.

## Ejecución directa

```bash
npm ci
npm run build
npm run scan
```

Para procesos prolongados yo prefiero un supervisor como systemd o un contenedor con política de reinicio consciente. No configuro reinicio infinito de live sin analizar por qué se detuvo.

## Docker

El despliegue en contenedor debe:

- ejecutar como usuario no root;
- montar `DATA_DIR` de forma persistente;
- inyectar secretos en runtime;
- no copiar `.env` a la imagen;
- exponer health solo donde corresponda;
- fijar versión por digest o tag inmutable;
- limitar CPU y memoria;
- permitir shutdown ordenado.

## systemd

Una unidad de usuario o sistema debe definir:

- directorio de trabajo;
- archivo de entorno protegido;
- comando exacto de la versión construida;
- `Restart=on-failure`, no reinicio ciego ante pausas lógicas;
- timeout suficiente para cierre;
- logs en journal;
- dependencia de red.

Yo pruebo primero la unidad con `MODE=scanner`.

## Checklist de arranque

1. confirmar versión/commit;
2. comprobar permisos de `.env`;
3. verificar espacio en disco;
4. verificar reloj del sistema;
5. ejecutar `npm run doctor`;
6. comprobar que no exista otra instancia;
7. validar backup reciente;
8. iniciar el modo previsto;
9. observar logs, health y métricas;
10. registrar el cambio operativo.

## Supervisión

Yo alerto al menos por:

- proceso caído;
- libro viejo de forma sostenida;
- fallos consecutivos;
- pausa de riesgo;
- discrepancia de inventario;
- merge fallido;
- base no escribible;
- espacio en disco;
- latencia anormal;
- pérdida diaria o drawdown;
- uso de capital superior al esperado.

## Backup consistente

La opción más segura es detener el proceso de forma ordenada y copiar `DATA_DIR`.

```bash
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p backups/$stamp
cp -a data/. backups/$stamp/
sha256sum backups/$stamp/* > backups/$stamp/SHA256SUMS
chmod -R go-rwx backups/$stamp
```

Si el proceso sigue activo, yo uso el mecanismo de backup de SQLite o copio base, WAL y SHM de forma consistente. No copio solo el archivo principal y asumo que alcanza.

Los backups pueden contener información financiera y operativa; deben cifrarse antes de salir del host.

## Restauración

Yo nunca restauro primero sobre live.

1. creo un directorio aislado;
2. verifico checksums;
3. copio el backup;
4. inicio una versión compatible en scanner/report;
5. consulto integridad SQLite;
6. comparo conteos y últimos eventos;
7. verifico reportes;
8. documento RPO, RTO y hallazgos;
9. recién después decido el reemplazo.

## Rollback de aplicación

1. pauso operaciones;
2. conservo datos y logs;
3. vuelvo a una versión identificada por commit/tag;
4. no revierto esquema de datos destructivamente sin plan;
5. ejecuto doctor y scanner;
6. verifico lectura de la base;
7. continúo en paper antes de live.

Yo prefiero un forward-fix cuando la versión anterior no puede leer los datos nuevos.

## Incidente de fill parcial o estado ambiguo

1. detener nuevas evaluaciones;
2. consultar órdenes por ID;
3. cancelar órdenes abiertas;
4. consultar balances CLOB y on-chain;
5. calcular cantidad YES/NO emparejada;
6. hacer merge solo de la cantidad inequívoca;
7. no comprar la pata faltante a cualquier precio;
8. preservar evidencia;
9. registrar causa y corrección;
10. volver a paper.

## Incidente de RPC o merge

- no repetir transacciones sin conocer nonce/receipt;
- consultar la cadena con una fuente independiente;
- verificar allowance y gas;
- identificar inventario todavía emparejado;
- evitar dobles merges;
- pausar hasta resolver.

## Corrupción o fallo de disco

1. detener el proceso;
2. copiar los archivos sin modificarlos;
3. verificar sistema de archivos;
4. trabajar sobre una copia;
5. ejecutar herramientas de integridad SQLite;
6. restaurar el último backup válido si corresponde;
7. reconciliar con el estado externo antes de live.

## Mantenimiento

Yo realizo periódicamente:

- actualización controlada de dependencias;
- revisión de endpoints y contratos;
- rotación de credenciales;
- prueba de restore;
- revisión de tamaños de base/logs;
- revisión de límites de riesgo;
- smoke scanner/paper;
- comparación de documentación con código.

## Evidencia mínima de un incidente

- fecha y hora UTC;
- versión;
- modo;
- mercado y tokens afectados;
- IDs de orden/transacción;
- balances antes/después;
- logs relevantes sin secretos;
- estado de la base;
- acciones de contención;
- decisión de recuperación;
- responsable.