# Folios de cotizaciones y Mostrador — 23/11/2026

Confirmado en código y Supabase: generate_quotation_folio hacía MAX+1 sin reservar
el resultado, con search_path mutable. Mostrador calculaba VMP-YYMMDD-NNN en el
navegador, y la RPC interpretaba un folio existente como reintento sin comparar
la venta. La unicidad de tabla evita insertar duplicados, pero no resuelve la
asignación simultánea o devolver por error el recibo de otra venta.

## Cambio

Migración: supabase/migrations/20261123164021_atomic_document_folios.sql.
Contadores privados con clave (tipo, periodo) y UPSERT atómico. Cotizaciones
conserva COT-YYYY-NNN, su RPC sin argumentos y acceso admin activo, incluido
Contabilidad conforme al acceso actual de cotizaciones. Mostrador conserva
VMP-YYMMDD-NNN, usa fecha de Ciudad de México y toma el folio en servidor en la
misma transacción de venta/stock/Caja. Se parte del máximo existente, sin editar
folios emitidos; números mayores de 999 se conservan completos.

La interfaz usa create_counter_sale_with_folio con UUID persistido por petición,
reutilizado si se pierde la respuesta. Un reintento devuelve la misma venta.
La tabla privada counter_sale_requests guarda payload sin seller_code: no copia
el PIN. Conserva autoría/verificación del vendedor de create_counter_sale_atomic.
La función heredada mantiene firma, permisos y operaciones; un folio existente
con datos distintos devuelve error en vez de aparentar una venta nueva exitosa.
Después del despliegue, recargar pestañas viejas de Mostrador.

Los contadores y solicitudes tienen RLS, sin acceso directo anon/authenticated;
el asignador interno tampoco es ejecutable por clientes. Anon no genera folios.
Los cargos que solo consultan Mostrador no pueden registrar ventas.

## Pruebas y límites

tests/inventory/folios.mjs aplica SQL exacto en PGlite con datos ficticios y
ejecuta la función real de venta: asignaciones sin insertar cotización, acceso
por rol, paso 999→1000, dos ventas distintas, reintento sin doble stock/Caja,
payload distinto, ausencia de PIN en ledger, conflicto heredado, credencial
inválida y rollback por fallo de Caja. Prueba del helper de navegador ante
respuesta perdida. No se ejecutan generadores ni ventas ficticias en producción.
PGlite usa una conexión: no se afirma prueba de contención real entre sesiones.
El UPSERT de la fila de contador aporta la serialización en PostgreSQL.
ESLint: sin errores, dos advertencias previas de dependencias del hook.

Un folio de cotización reservado cuyo guardado se abandona puede dejar un hueco;
no se promete numeración fiscal sin huecos. El cliente de Mostrador conserva
el UUID en sessionStorage; si ese almacenamiento está bloqueado, el fallback
en memoria no conserva la petición al cerrar o recargar.

## Aplicación

Compilar commit aislado. Verificar que las funciones vivas no cambiaron, aplicar
la migración y desplegar el helper/hook. Firmas antiguas se conservan durante
la transición. Comprobar catálogo y RLS por SELECT; siguiente cotización/venta
real valida el flujo completo. No borrar contadores/solicitudes al volver una
interfaz atrás, ni restaurar funciones anteriores a ciegas.

Fuera del alcance: folios de Recycling, pedidos, recepciones y numeración de
otros módulos, permisos residuales, inventario histórico e integraciones.
Referencia: https://www.postgresql.org/docs/17/sql-insert.html
