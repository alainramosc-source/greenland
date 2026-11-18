# Recepciones atómicas

Entrega pendiente de autorización de publicación. No modifica el Inbox, Última Milla,
la RPC antigua `adjust_warehouse_stock`, firmas de Caja ni pagos.

## Alcance

`save_container_reception_atomic` guarda borradores o confirma recepciones. Ambas
operaciones usan un UUID estable y bloquean la recepción. La confirmación incluye
partidas, ingresos por bodega, costo promedio ponderado por producto, cargos PRO,
tránsitos, estados de POs, orden de flete y estado final en una transacción.
Solo Super Admin activo puede invocarla. Un reintento sobre una recepción completada
devuelve éxito sin repetir movimientos. Guardar de nuevo como borrador se rechaza,
incluso si procede de una pestaña antigua que escribe directamente en la tabla.

Se añaden `container_receptions.linked_purchase_orders` y
`container_reception_items.purchase_order_id` para conservar las POs secundarias
al guardar/reabrir y calcular correctamente los pendientes de futuras recepciones.
Las filas antiguas siguen utilizando el vínculo de la cabecera.

Se conserva la distribución proporcional de gastos por valor de origen. El promedio
se calcula una vez por producto, con su valor completo antes del redondeo por partida.
Flete externo no genera orden; si ya existe una orden vinculada devuelve una advertencia.
Flete registrado sin transportista activo se rechaza antes de completar la operación.
Cerrar una PO como final elimina su tránsito restante, igual que el flujo anterior.
La edición posterior de recepciones completadas no forma parte de esta entrega.

## Pruebas reproducibles

`schema.sql` es una instantánea de columnas y restricciones de las tablas involucradas,
consultadas en solo lectura el 17/11/2026. No contiene datos reales. El runner crea
usuarios, POs, existencias y transportista ficticios, y carga el SQL exacto de la migración.

Con `@electric-sql/pglite` disponible:

```powershell
# Si no está instalado localmente, indicar la URL file:/// al dist/index.js de un runtime existente.
$env:PGLITE_MODULE = 'file:///C:/ruta/node_modules/@electric-sql/pglite/dist/index.js'
node tests/receptions/atomic-receptions.mjs
node node_modules/eslint/bin/eslint.js --no-ignore src/hooks/useReceptionForm.js
```

Comprueba autorización, borradores sin stock, errores inyectados en costos/tránsitos/flete,
cantidades y bodegas inválidas, dos POs y el mismo SKU en dos bodegas, promedio, reservas,
reintentos, cierre final, flete externo, cargo PRO y recepción libre sin PO.
El test de llamadas solapadas usa la cola de una sola conexión PGlite: verifica reintentos,
no simula contención real de dos conexiones PostgreSQL. Los bloqueos de fila y advisory
son explícitos en SQL. Docker no estaba disponible para una prueba de dos conexiones.

## Aplicación tras autorización

1. Aplicar únicamente `migrations/20261117_atomic_container_receptions.sql`.
   Es una expansión compatible: no retira la confirmación antigua antes del despliegue.
2. Publicar únicamente ese SQL, `src/hooks/useReceptionForm.js` y estas pruebas/documentación,
   partiendo del `main` remoto actual; no incorporar el resto del directorio de trabajo.
3. Recargar el formulario antes de comenzar la recepción pendiente.
4. Confirmar la recepción real una vez y revisar existencias, reservas, costos, POs,
   tránsitos, cargo PRO si procede y flete por su identificador de recepción.

Ante un error la llamada revierte completa y se puede reintentar con el mismo UUID.
Ante pérdida de respuesta, reintentar es seguro mientras se conserve el identificador;
si se cerró la pestaña, localizar primero la recepción para no iniciar otra con otro UUID.
Si falla el despliegue, conservar la expansión y recuperar el código previo. No borrar
recepciones, movimientos o cargos reales para intentar deshacer una operación completada.
