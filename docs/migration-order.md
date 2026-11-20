# Orden y correspondencia de migraciones

Verificado el 20/11/2026 por lectura del catálogo de Greenland
`kjctnobogzpjxpwzmkwm`. Esta documentación NO indica volver a ejecutar scripts
en producción. El sistema ya contiene estas correcciones.

## Historial de las correcciones

| Archivo del repositorio | Nombre en historial Supabase | Aplicación registrada |
|---|---|---|
| migrations/20261112_security_phase1_expand.sql | security_phase1_expand | 20261113085941 |
| migrations/20261113_fix_order_rpcs_item_warehouse.sql | fix_order_rpcs_item_warehouse | 20261113152734 |
| migrations/20261117_allow_accountant_payment_review.sql | allow_accountant_payment_review | 20261117134351 |
| migrations/20261112_security_phase2_contract.sql | security_phase2_contract | 20261117200826 |
| migrations/20261117_atomic_container_receptions.sql | atomic_container_receptions | 20261117205930 |
| supabase/migrations/20261118231046_inbox_operator_permissions.sql | inbox_operator_permissions | 20261118230048 |
| supabase/migrations/20261119052724_inbox_push_notifications.sql | inbox_push_notifications | 20261118235454 |
| supabase/migrations/20261120030335_inventory_atomic_operations.sql | inventory_atomic_operations | 20261119213755 |
| supabase/migrations/20261120053731_order_items_and_pro_retail_atomic.sql | order_items_and_pro_retail_atomic | 20261119234736 |

La fecha del nombre de archivo identifica su preparación; puede diferir de la
fecha registrada por apply_migration. No renombrar o reparar el historial vivo
para hacerlas coincidir. Los SQL de `migrations/` no son una cola automática del
CLI: incluyen cambios históricos, diagnósticos y reparaciones de datos puntuales.

## Contabilidad

Contract corresponde al commit histórico f531025, no a la versión anterior de
main. Mantiene accountant en approve_distributor_payment_atomic,
review_distributor_payment y approve_matched_payments. El primero establece
app.payment_approval_rpc=true para su entrada automática en efectivo, y la
política de cash_movements admite ese caso específico. No autoriza a Contabilidad
a crear movimientos manuales ni firmar salidas de Caja. Las funciones de
aprobación individual y por lote se contrastaron con el catálogo vivo y coinciden.

## Pedidos

El parche 20261113 (commit histórico 2e7ccd8) conserva las cuatro funciones por
bodega de partida y elimina la dependencia de orders.warehouse_id. Confirmación,
cancelación y transición de estado coinciden con las definiciones vivas.
update_order_item_quantity fue reforzada posteriormente por el paquete
20261120053731: validación de cantidad/usuario activo, última partida y reserva
suficiente. Para reconstruir esta secuencia, esa versión posterior prevalece.
Expand conserva su versión histórica: NO volver a aplicarlo encima del parche.

## Límite de esta alineación

Se recuperaron archivos ya aplicados que faltaban o estaban desactualizados en
main. Esto NO convierte el repositorio en una copia completa reconstruible de la
base. La revisión identificó tablas y funciones base sin CREATE equivalente en
los SQL publicados, además de migraciones iniciales registradas en Supabase que
no están exportadas íntegramente en este árbol. Una línea base completa necesita
una entrega separada de esquema y comprobación en una base vacía aislada.

No ejecutar todos los archivos en bloque ni usar esta secuencia como rollback.
No se alteraron datos, permisos, integraciones ni configuraciones de producción
como parte de esta alineación documental.
