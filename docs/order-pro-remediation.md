# Pedidos y venta PRO — 19/11/2026

Base de publicación: main 7c0fa7f. Migración:
`supabase/migrations/20261120053731_order_items_and_pro_retail_atomic.sql`.
No corrige datos históricos ni la diferencia de $60 en ORD-555493.

## Comportamiento

- Agregar partidas en pendiente no reserva stock. En confirmado/surtido reserva;
  en enviado/cerrado descuenta físicamente. Conserva líneas repetidas por producto.
  La interfaz utiliza la bodega única del pedido o pide elegir si hay varias.
- Quitar partidas utiliza la función de cantidades bajo bloqueo de cabecera,
  liberando reserva o reintegrando físico según estado. Se conserva al menos una.
- Reasignar antes del envío exige disponibilidad completa y reserva de origen
  suficiente; quitar bodega a una partida confirmada se rechaza. Después del envío
  se rechaza reescribir la bodega histórica, sin realizar transferencias implícitas.
- Las RPC rechazan usuarios inactivos; el dueño mantiene edición en pendiente y
  los cargos de inventario mantienen administración. El cliente no puede omitir
  un rechazo escribiendo directamente cantidad/bodega o insertando/eliminando
  partidas de pedidos confirmados. Continúan precio y avance de surtido bajo RLS.
- La función heredada create_retail_sale conserva sus cinco parámetros, entrega
  y respuesta; autoriza administradores de inventario o PRO activo de su bodega.
  Valida todas las partidas, suma productos repetidos y bloquea existencias antes
  de descontar. Falta de stock revierte todo, sin omitir productos. Conserva
  FLETE-ENVIO sin producto y no descuenta anticipadamente ventas de entrega.
- El flujo PRO de Inventarios usa create_pro_retail_sale_atomic: venta, stock,
  nombre y estado de pago en efectivo se confirman juntos. Un UUID persistido
  permite repetir una petición de respuesta perdida sin duplicar la venta.
  La tabla privada pro_retail_requests tiene RLS y no es accesible al cliente.

## Comprobación

Pruebas con PGlite y datos ficticios: nueve grupos de permisos, reservas,
reubicación, pedidos enviados, venta/cobro/reintento, productos repetidos,
entradas inválidas, fallos inyectados en bitácora/cobro/auditoría, compatibilidad
de entrega/flete y persistencia del UUID del navegador. Prueba adicional ejecuta
los cuatro handlers reales de Pedidos con un rechazo de servidor, comprobando
que no intentan escrituras directas ni muestran éxito falso.

No se afirma contención probada con dos conexiones PostgreSQL independientes:
PGlite utiliza una conexión. SQL mantiene bloqueo cabecera→partida→existencias,
con bodegas/productos ordenados. Ninguna prueba operativa ficticia en producción.
ESLint conserva dos errores previos de set-state-in-effect en useOrderDetail;
con esa regla anterior excluida, sin errores y tres advertencias preexistentes.

## Publicación

Compilar únicamente el paquete sobre main. Aplicar la migración transaccional,
publicar los hooks y helper, y verificar catálogo/invariantes por SELECT.
Las firmas heredadas se conservan para la transición; clientes viejos pueden
recibir rechazo al intentar el antiguo fallback: recargar el portal.
Si falla la interfaz se puede recuperar su versión previa manteniendo las
protecciones SQL, sin restaurar funciones vulnerables ni borrar solicitudes.
Validación final con la siguiente operación real de pedido o venta PRO.

No cambia Caja, pagos de distribuidor, Inbox, bot, secretos, recepciones,
otros flujos de última milla ni refactorizaciones locales ajenas.
