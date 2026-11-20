# Recepción del distribuidor — 20/11/2026

Regresión confirmada en receive_order de security_phase1_expand: intentaba
insertar/actualizar distributor_inventory.quantity y total_received; el esquema
vivo y el SQL histórico usan stock. Error antes de acreditar o cerrar el pedido.

Parche: supabase/migrations/20261120203259_fix_receive_order_stock_column.sql.
Sustituye únicamente esas columnas por stock, con COALESCE para un valor previo
nulo. Mantiene firma, retorno, permisos de dueño/admin de inventario, bloqueo
FOR UPDATE de orders y transición shipped→closed con delivered_at. Anon sigue
sin EXECUTE. No se agregan columnas ni se vuelve a ejecutar Expand.

tests/inventory/receive-order.mjs aplica el SQL exacto en PGlite con el esquema
real mínimo y datos ficticios: dueño, admin autorizado, anon, distribuidor ajeno,
Contabilidad, SKU repetido, inventario previo, reintento tras cierre y fallo
inyectado en un SKU posterior. Suma stock una sola vez y revierte todo si falla.
No se afirma una prueba de concurrencia real con dos conexiones independientes.

Aplicado y comprobado en producción por catálogo: sin referencias a columnas
inexistentes, stock correcto, bloqueo retenido y permisos conservados. No se
invocó receive_order contra pedidos reales por el agente. El distribuidor debe
reintentar Confirmar Recepción Física; la validación operativa queda pendiente.
No requiere cambios de frontend, credenciales ni movimiento de stock central.
