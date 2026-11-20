# Inventarios: paquete conjunto de correcciones

Preparado el 19/11/2026. Base: producción `549f862`. Sin ajustes históricos,
reposición de devoluciones antiguas ni modificación de conteos ya aplicados.
Las notificaciones del Inbox quedaron verificadas por el usuario en el celular.

## Alcance y evidencia

1. **Ajustes y CSV.** La RPC antigua era SECURITY DEFINER, ejecutable por anon
   y sin validación de actor; el trigger anterior permitía auth.uid() nulo.
   La reproducción aislada permitió sumar stock como anon. La migración retira
   ese permiso y convierte la función antigua en invoker con validación de cargo.
   Sus firmas/retorno void se conservan. Se usan bloqueos y se mantiene el acceso
   de padres SECURITY DEFINER y service_role legítimos; no se reemplazan credenciales.
   El frontend pasa a la RPC transaccional `apply_inventory_operation` para ajustes,
   CSV y transferencias, comprueba el resultado de negocio y conserva el formulario
   ante errores. SET/CSV valida el stock base, rechaza decimales y no consume reservas.
2. **Conteos.** La función anterior actualizaba warehouse_stock (que sincroniza
   products con trigger) y después sumaba la misma diferencia a products. Se
   reprodujo 10→12 con bodega=12/global=14. Se elimina el segundo incremento.
   Se bloquean cabecera y existencias, se impide editar conteos enviados/aplicados
   desde el cliente y se conserva un único ajuste por producto/sesión. Las
   bitácoras registran solo operaciones completas. El total agregado se calcula
   después de adquirir el bloqueo del producto, evitando evaluar un SUM antes
   de esperar a otro escritor. No se recalculan masivamente los datos existentes.
3. **Transferencia y crédito PRO.** La RPC individual ya tenía bloqueos y protegía
   reservas. El frontend anterior la llamaba por partida y después insertaba el
   crédito en recepciones y su detalle, en peticiones separadas. La nueva RPC
   engloba el lote, sus bitácoras y los créditos en una transacción: cualquier fallo
   revierte todo. El PRO puede transferir desde su bodega sin autootorgarse crédito.
   Para crédito se requiere un administrador de inventario y un único PRO activo
   asignado al origen, obtenidos en servidor. El importe de cabecera es exacto a
   centavos y se conserva el redondeo existente del precio unitario a dos decimales.

## Permisos y compatibilidad

Escritura de inventario/conteos: admin activo con sub_role super_admin, admin
o warehouse_admin. Accountant y viewer conservan consulta, no escritura.
Se retiran privilegios directos TRUNCATE/TRIGGER/REFERENCES que el cliente no
necesita. Los ajustes aplicados de conteo quedan de solo lectura para el cliente.
La tabla de solicitudes tiene RLS y no es accesible por anon/authenticated;
las RPC verifican al usuario y graban su identidad desde auth.uid().

No se altera `adjust_warehouse_stock_atomic` utilizado por Mostrador ni sus RPCs
de venta/devolución. La función de transferencia individual mantiene firma y
retorno. Los llamadores internos de Última Milla conservan acceso a la función
heredada. No se cambian Caja, pagos, recepción atómica ni Inbox. Las refactorizaciones
locales anteriores de Antigravity quedan fuera de la entrega.

## Reintentos y conteos con movimientos

Cada petición lleva un UUID persistido por pestaña y contenido en sessionStorage.
Si se pierde la respuesta, el reintento conserva ese UUID; el servidor devuelve
el resultado guardado, sin mover stock ni crear crédito nuevamente. También se
aplica al guardado de conteos: un reintento no recaptura una base más reciente.
Si el navegador no permite almacenamiento se usa memoria; en ese caso no se
garantiza conservar el identificador después de cerrar o recargar la pestaña.
Tras éxito confirmado, una nueva operación idéntica recibe otro UUID.

La captura de una cantidad fija su base del sistema bajo bloqueo al guardar.
Editar solo el motivo no vuelve a fijar esa base. Si el stock cambia después,
Aplicar se rechaza completo e identifica el SKU. “Volver a conteo” permite
retirar la aprobación pendiente, verificar físicamente esa partida y recapturarla
(editar y volver a introducir su cantidad) antes de enviarla otra vez.
Los conteos ya posted no se reabren. No se reinterpretan capturas antiguas en lote.

La opción explícita “congelar inventario” ahora detiene movimientos de esa bodega
durante el conteo; no congela bodegas por defecto. Antes de aplicar se confirmó
que no hay conteos abiertos con freeze_inventory=true, por lo que la migración
no detiene ninguna bodega existente. “Reanudar movimientos” permite quitar ese
bloqueo de forma explícita y auditada. Después vuelve a aplicar el control de base.

## Pruebas y límites

`tests/inventory/schema.sql` es una fixture de esquema sin datos reales, basada
en el snapshot de Recepciones y las tablas de conteo; incorpora campos aditivos
actuales de recepciones. `before.sql`, `before-functions.json` y
`before-permissions.json` conservan definiciones y permisos previos para revisión.
No deben ejecutarse como migración o rollback automático.

`atomic-inventory.mjs` aplica el SQL exacto en PGlite con perfiles/productos
ficticios. Trece grupos: permisos anon/lectura/inactivos; ajuste nuevo y heredado;
reservas y SET desactualizado; lote/crédito atómicos; fallos en bitácora, cabecera
y detalle de crédito; PRO e internos confiables; guardado íntegro; aplicación de
conteo una sola vez/global consistente; fallo de bitácora al aplicar; movimientos
intermedios y recaptura; congelamiento/reanudación; códigos; reintento de navegador.
Dos pruebas React verifican conservación de cantidades pendientes tras error y
consulta sin botones de edición para Contabilidad.

Docker está instalado pero su daemon no está disponible. PGlite usa una conexión:
no se afirma haber probado contención con dos sesiones PostgreSQL independientes.
Los bloqueos de fila/advisory y su orden son explícitos en SQL. La verificación
posterior de producción se hará por catálogo y SELECT, sin crear operaciones ficticias.

Comandos:

```powershell
$env:PGLITE_MODULE = 'file:///ruta/al/runtime/@electric-sql/pglite/dist/index.js'
node tests/inventory/atomic-inventory.mjs
node node_modules/jest/bin/jest.js tests/inventory/count-ui.test.jsx --runInBand
```

ESLint del flujo modificado: sin errores en hook, página de inventarios, conteo
y helper; mantiene dos advertencias anteriores de dependencias de hooks. Los
modales anteriores ya tenían efectos que incumplen la regla set-state-in-effect;
no se refactorizan como parte de esta entrega. Se compilará el commit exacto
sobre main, excluyendo los demás cambios locales.

## Aplicación y reversión

1. Revalidar funciones, permisos, duplicados y ausencia de conteos congelados.
2. Aplicar únicamente `supabase/migrations/20261120030335_inventory_atomic_operations.sql`.
   Es transaccional, no mueve existencias y no cambia dinero existente.
3. Publicar solo los archivos de esta entrega. Las firmas antiguas se conservan
   para los minutos de transición; recargar formularios antes de operar con la
   versión nueva. Los clientes viejos aún usan sus operaciones por partida.
4. Comprobar permisos, funciones, triggers, índices y consistencia con SELECT.
   En la siguiente operación legítima, verificar stock, reserva, crédito y bitácora.
   No inventar ventas, ajustes ni transferencias de prueba en producción.

Si falla el frontend, recuperar el anterior conservando las funciones seguras
en DB. Si hay conteos con movimientos pendientes de recaptura, conservar la
página nueva de conteos y `inventory-operations.js` para su flujo de reapertura.
No restaurar `before.sql` a ciegas: reintroduciría fallos conocidos. No borrar la
tabla de solicitudes, créditos, conteos ni movimientos: los reintentos y registros
confirmados dependen de ellos. Una reversión de reglas de DB requiere evaluar
el fallo concreto y autorizaciones; no implica deshacer operaciones reales.

Archivos de publicación: migración indicada; src/lib/inventory-operations.js;
src/hooks/useInventarios.js; página principal de inventarios, página conteo/[id],
AdjustStockModal.js y TransferStockModal.js; tests/inventory/ y este documento.

Referencias: [bloqueos PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html),
[funciones Supabase](https://supabase.com/docs/guides/database/functions).
