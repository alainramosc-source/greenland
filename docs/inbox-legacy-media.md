# Adjuntos históricos privados — 20/11/2026

Inventario previo confirmado con SELECT: inbox-media contiene 37 archivos
(12,970,407 bytes), vinculados a 37 mensajes: 31 imágenes y 6 documentos.
Los 37 tienen archivo existente y carpeta correspondiente a su conversación.
No se encontraron referencias en evidencias de pedidos/servicios, devoluciones,
plantillas ni CMS revisados. No se afirma un inventario de enlaces fuera del portal.

## Transición

1. Publicar el GET autenticado de /api/inbox/upload y la subida compatible.
2. Aplicar únicamente 20261120063437_private_legacy_inbox_media.sql. Verifica
   referencias y archivos, cambia media_url y content a referencias de la ruta
   autenticada, retira SELECT general de authenticated sobre el bucket y lo
   vuelve privado. Todo en una transacción. No copia, elimina ni renombra objetos.
3. Comprobar conteos, permisos y acceso anónimo denegado. Recargar el Inbox para
   que el historial abierto previamente reciba las nuevas referencias.

GET valida sesión/perfil activo y conversación visible para los dos operadores.
Para evidencia compartida, conserva lectura para admin activo o chofer asignado
al pedido; un chofer ajeno y un admin ajeno al Inbox sin pedido no acceden.
Tras autorizar genera un enlace firmado de cinco minutos y redirige con no-store.
POST conserva permisos existentes y devuelve ahora la referencia autenticada.
El envío reconoce esa referencia, exige misma conversación y firma por una hora
para la descarga de Meta. Nuevos adjuntos del Inbox continúan en inbox-attachments.
No cambia webhook, firmas Meta, bot, imágenes de catálogo ni sus conexiones.

## Verificación

tests/inbox/legacy-media.mjs ejecuta la ruta real con integraciones simuladas:
paths históricos/UUID, rechazo de traversal, sesión ausente, inactivos, chofer
ajeno, signer y chofer/admin legítimos, sin llamadas privilegiadas al denegar,
redirección temporal y subida compatible. PGlite aplica el SQL exacto con
objetos/mensajes ficticios: conserva objetos, cambia referencias, cierra solo
inbox-media, retira la política amplia y soporta reejecución sin duplicados.

Los enlaces públicos antiguos compartidos fuera del portal dejarán de funcionar.
Archivos ya descargados, guardados en WhatsApp o cacheados por navegadores no
se pueden retirar; no se promete revocación instantánea de copias existentes.
La privacidad sigue el mecanismo de buckets privados y URLs firmadas de Supabase.

## Reversión

No restaurar el portal anterior después de la migración: carece del GET que
resuelve las referencias nuevas. Si falla otra parte de una publicación, conservar
la ruta protegida, su helper y soporte de envío. No volver público el bucket ni
borrar archivos para resolver un problema de presentación. La migración no tiene
efectos sobre stock, pagos, pedidos, sesiones, credenciales o integraciones.

Referencia: https://supabase.com/docs/guides/storage/buckets/fundamentals
