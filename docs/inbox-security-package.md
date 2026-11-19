# Paquete de seguridad del Inbox — preparado, sin aplicar

Fecha: 18/11/2026. Base de producción observada: `b826bc7` (`READY`).
No se han aplicado migraciones, publicado commits ni enviado mensajes reales.
El directorio contiene cambios de Antigravity ajenos a esta entrega: publicar
solo la lista de archivos de este documento, sobre el `main` remoto vigente.

## Acceso cotidiano

Se reutilizan las cookies de Supabase y su renovación actual. No hay segundo
login, PIN, doble firma ni confirmación para abrir el Inbox. La comprobación de
permisos ocurre en servidor y no cambia la duración de las sesiones.
Los operadores preparados son Alain Ramos y Didier Fernandez Hernandez, por
UUID exacto y perfil `admin` activo. Otros superadministradores no heredan acceso.
La misma condición está en `inbox-access.js` y `can_operate_inbox()`; cualquier
cambio futuro de operadores debe actualizar ambos en una entrega coordinada.

El layout conserva la barra y navegación originales en `InboxShell.jsx`.
Elimina la comprobación cliente duplicada del layout anterior; el servidor
proporciona el nombre al mismo diseño. Insights, canales, envío, envío masivo,
medios y adjuntos validan esa misma sesión y autorización antes de usar secretos.

## Cambios incluidos

- Insights deja de entregar conversaciones o consumir Gemini sin autorización.
- La ruta HTTP antigua `/api/inbox/chatbot` responde 410. No hay consumidores
  internos encontrados. El webhook sigue llamando directamente a
  `processBotMessage`: ese motor y su configuración no se modifican.
- RLS de las ocho tablas Inbox queda limitada a los dos operadores activos.
  Se retiran también privilegios TRUNCATE que no quedan sujetos a RLS.
- El navegador puede consultar los campos necesarios de los canales, pero no
  sus tokens ni escribir canales directamente. Las rutas de conexión siguen
  operando en servidor y ya no devuelven `access_token` en sus respuestas.
- Los adjuntos nuevos del chat se guardan en `inbox-attachments`, privado.
  La conversación guarda una referencia estable autenticada. Para enviar a
  Meta, el servidor genera un enlace de una hora, sin sesión del cliente.
  Para ver el adjunto en el portal, genera un enlace de cinco minutos.
  Son enlaces portadores temporales: quien los reciba puede usarlos hasta vencer.
- La subida valida conversación, tamaño y lista de tipos MIME. Los nombres son
  UUID generados en servidor. Esto no es análisis antivirus ni prueba del
  contenido binario: el MIME declarado por el navegador no demuestra el formato.
- El proxy de medios Meta exige que el identificador corresponda a un mensaje
  visible. El cron no acepta solicitudes si `CRON_SECRET` no está configurado.
- La subida antigua compartida con entregas exige un pedido visible y chofer
  asignado o administrador activo; mantiene los enlaces públicos de evidencias.
  Los clientes antiguos de Inbox pueden seguir subiendo por esa ruta únicamente
  como signers autorizados durante la transición.

## Acceso directo móvil

Se incluye un manifiesto propio, iconos PNG generados por Next y modo standalone,
con inicio en `/dashboard/inbox`. No se cachean conversaciones para uso offline.
Se conserva el destino Inbox tras el login cuando la sesión haya vencido.

Después de publicar: abrir la URL habitual del portal con `/dashboard/inbox`
en Safari (iPhone) o Chrome (Android), iniciar sesión si es la primera vez y
usar “Agregar a pantalla de inicio” / “Añadir a pantalla principal”.
Usar siempre el mismo dominio: www, sin www y vercel.app tienen sesiones distintas.
Un navegador o acceso instalado nuevo puede exigir su primer inicio de sesión;
este paquete no permite prometer sesión perpetua ni compartida entre navegadores.
No se ha verificado todavía en un teléfono real.

## Orden de aplicación propuesto (requiere autorización posterior)

1. Antes de aplicar: volver a capturar políticas/grants y comparar con
   `tests/inbox/before-permissions.json`. Confirmar que no apareció un consumidor
   externo legítimo de la ruta HTTP antigua. No solicitar ni rotar credenciales.
2. Aplicar únicamente `supabase/migrations/20261118231046_inbox_operator_permissions.sql`.
   Es transaccional. Conserva las credenciales existentes y el acceso service_role
   utilizado por webhook/bot; crea un bucket vacío, no mueve archivos históricos.
   El frontend actual consulta id/plataforma de canales, no `select(*)`, por lo
   que no depende de leer el token que se retira.
3. Desplegar solamente los archivos enumerados abajo. No volver a ejecutar Expand
   ni Contract de Caja. No incorporar otros cambios locales.
4. Verificar con cada signer: abrir Inbox sin nuevo login, conversaciones y tiempo
   real, Insights, responder un mensaje real, adjuntar imagen/PDF y volver a
   abrir el adjunto. Verificar recepción y respuesta automática en los canales
   realmente activos, y evidencia de entregas con usuario legítimo si se utiliza.
5. Confirmar denegación para usuario ajeno/sin sesión mediante pruebas controladas.
   Validar el acceso directo en el teléfono del usuario. La prueba aislada no
   sustituye estas comprobaciones de integración posteriores al despliegue.

## Meta: parche separado, NO incluido en el despliegue inicial

`tests/inbox/meta-webhook-signature.patch` contiene la comprobación estricta
`x-hub-signature-256` sobre los bytes originales y elimina tokens de logs.
El archivo activo `webhook/route.js` queda intacto. Antes de aplicar el parche,
identificar en Meta qué aplicación firma cada canal; no basta el verify token.
El parche preparado admite un App Secret: si hay varias aplicaciones se debe
adaptar y probar la selección de secretos antes de desplegarlo.

Una vez disponible `META_APP_SECRET` correcto en Vercel, comprobar firmas con
payloads de prueba aislados y recepción real controlada de WhatsApp, Messenger
e Instagram según los canales activos. Sin secreto devuelve 503 y con firma
inválida 403; publicarlo sin esa preparación podría interrumpir mensajes.
No se añaden excepciones que acepten solicitudes sin firma.

## Riesgos que permanecen identificados

- Los archivos históricos en `inbox-media` siguen públicos para no romper
  mensajes anteriores ni evidencias. Cerrar esos enlaces necesita inventariar
  referencias, migrar archivos y actualizar consumidores en otra transición.
  Sí se elimina la política de actualización de ese bucket para cualquier usuario.
- El webhook sigue respondiendo 200 ante algunos errores y ejecutando el bot en
  la misma solicitud. No se cambia a 500 a ciegas: si ya se guardó el mensaje,
  la deduplicación puede impedir reintentar la respuesta del bot. Resolverlo
  requiere registro durable por evento/etapa y recuperación idempotente.
- Los permisos service_role siguen siendo privilegiados por diseño del backend.
  No se lee, reemplaza, revoca ni regenera ninguna credencial de Meta/Supabase.

## Reversión

`tests/inbox/rollback-permissions.sql` restaura las políticas y grants observados.
No elimina el bucket nuevo ni sus adjuntos. Reabre los riesgos anteriores y debe
ser una decisión operativa explícita, no una reacción automática.
Si solo falla el frontend, recuperar el despliegue anterior y conservar la
migración: los signers pueden usar el portal anterior. Para usuarios distintos
del par autorizado, el bloqueo es deliberado. Si se revierte código después de
subir adjuntos privados, conservar también las rutas `attachments` y el módulo
de firma: el código anterior no puede mostrar esas referencias nuevas.

## Archivos del paquete

Código: `src/lib/inbox-access.js`, `src/lib/inbox-attachments.js`,
`src/lib/meta-webhook-signature.js`, `src/app/api/inbox/attachments/route.js`,
las rutas `insights`, `channels`, `chatbot`, `media`, `send`, `send-bulk`, `upload`
y `followup` dentro de `src/app/api/inbox`, `src/middleware.js`,
`src/app/(auth)/login/page.js`, `src/app/(dashboard)/dashboard/inbox/layout.js`,
`src/app/(dashboard)/dashboard/inbox/InboxShell.jsx`,
`src/app/(dashboard)/dashboard/inbox/components/ChatView.jsx`,
`src/app/inbox-icon/route.js`, `public/inbox.webmanifest`.

SQL: `supabase/migrations/20261118231046_inbox_operator_permissions.sql`.
Generado con el CLI; la carpeta histórica `migrations/` no se ejecuta en bloque.
No publicar `.env.local`, `supabase/.temp` ni otros archivos locales.

Pruebas y reversión: `tests/inbox/` y este documento.

## Validación local

`tests/inbox/security.mjs` comprueba sesiones/roles, adjuntos, firma criptográfica,
la ruta real de Insights denegada antes de acceder a servicios y el endpoint
retirado. Aplica el SQL exacto en PGlite con perfiles y datos ficticios: ambos
signers, otro superadmin, inactivo, anon, service_role, lectura de tokens,
TRUNCATE, escritura de canales, repetición y rollback. También prueba las rutas
protegidas reales y la evidencia del chofer asignado. Nueve grupos aprobados.
La estructura de la fixture es mínima; no es una copia completa del servidor.

Ejecución (runtime temporal, sin instalar dependencias en el portal):
`PGLITE_MODULE=file:///ruta/al/runtime/@electric-sql/pglite/dist/index.js node tests/inbox/security.mjs`.
ESLint se ejecuta con `--no-ignore` porque la configuración local ignora todos
los archivos por defecto. Se mantienen advertencias existentes de etiquetas img.
El parche Meta se valida con `git apply --check`, sin aplicarlo.

La compilación Turbopack se interrumpió después de permanecer sin progreso en
“Creating an optimized production build”; no se considera aprobada. Se revisa
por separado la compilación con Webpack, sin generar páginas estáticas.
Resultado: `next build --webpack --experimental-build-mode compile` terminó
correctamente (salida 0), con todas las rutas compiladas. El primer intento
en aislamiento encontró EPERM al crear archivos de `.next`; el mismo comando
con permiso de ejecución local completó la compilación. No es un despliegue
ni una prueba autenticada de extremo a extremo. No se generaron páginas estáticas.

Referencias: [sesión SSR](https://supabase.com/docs/guides/auth/server-side/nextjs),
[privilegios por columna](https://supabase.com/docs/guides/database/postgres/column-level-security).
