# Notificaciones por cada mensaje entrante

18/11/2026, America/Mexico_City. Funcionalidad solicitada para los signers del
Inbox instalado en Samsung. No añade avisos por mensajes salientes del bot,
envíos manuales ni cambios de estado de entrega.

## Funcionamiento

El usuario activa “Activar avisos” en cada dispositivo y concede el permiso de
Android/navegador. Una suscripción identifica ese navegador/dispositivo; no se
crean suscripciones en nombre de otras personas. Puede desactivar los avisos
con el mismo botón. Los dos puntos de cierre de sesión del dashboard revocan la
suscripción local y retiran las notificaciones visibles antes de cerrar sesión.
Si el servidor no está disponible se revoca igualmente la suscripción del navegador.

El service worker tiene alcance `/dashboard/inbox` y no intercepta peticiones
ni guarda conversaciones para uso offline. Muestra una notificación con canal
y texto genérico, sin nombre, teléfono, texto del cliente ni archivo en la
pantalla bloqueada. Cada mensaje tiene etiqueta distinta; tocarlo abre su
conversación utilizando la sesión normal. Cerrar el Inbox no cancela la suscripción.

No se puede garantizar sonido, entrega instantánea ni funcionamiento después
de forzar la detención del navegador: Android, sus permisos, ahorro de energía,
la red y el proveedor de push determinan la presentación y entrega final.

## Datos y permisos

La migración `supabase/migrations/20261119052724_inbox_push_notifications.sql`
añade dos tablas nuevas con RLS sin acceso directo para `anon`/`authenticated`:
suscripciones y entregas. Las rutas de gestión comprueban sesión y la membresía
explícita del Inbox; el servidor deriva user_id, ignora propietarios del cliente,
valida endpoint HTTPS de proveedores conocidos y las claves de suscripción.
Nunca permite usar el servidor como proxy hacia direcciones arbitrarias.

El trigger AFTER INSERT crea una entrega por dispositivo de un signer activo
únicamente para un mensaje entrante nuevo. No recorre ni notifica el historial.
La combinación mensaje/suscripción es única; el control de duplicados Meta ya
existente continúa intacto. Si falla el encolado, el mensaje sigue guardándose
y se registra únicamente el código SQL del error.

El webhook conserva la recepción, la verificación actual y el motor del bot.
Se añade solo el inicio concurrente del despachador después de guardar el mensaje;
el bot no espera al proveedor push para empezar. Al finalizar se espera la tarea
acotada para evitar que Vercel la abandone. Un fallo se deriva a reintentos.
La validación de firmas de Meta continúa como trabajo separado; este cambio
no la activa ni modifica `chatbot-engine.js`.

La cola usa claims con FOR UPDATE SKIP LOCKED y lease de 60 segundos; hasta
20 entregas por invocación, en grupos de cinco, con timeout de socket de cinco
segundos. El cron adicional cada cinco minutos usa el CRON_SECRET existente.
No cambia el cron ni el horario de seguimientos. Se comprueba que el propietario
siga activo y autorizado también al tomar entregas pendientes.

Se reintenta hasta cinco veces; los avisos de más de un día dejan de enviarse.
La cola se purga a siete días. Una respuesta 404/410 elimina únicamente la
suscripción push vencida y sus entregas asociadas, no cuentas ni integraciones.
Aceptado por el proveedor no significa confirmado en pantalla del teléfono.
Si el proceso muere después de enviar y antes de registrar éxito puede repetirse
el envío; la misma etiqueta por mensaje evita dos notificaciones visibles
distintas de ese mensaje en un dispositivo. No se promete entrega exactamente una vez.

## Claves y despliegue

Se necesitan dos variables nuevas exclusivamente de producción:
`INBOX_PUSH_VAPID_PUBLIC_KEY` y `INBOX_PUSH_VAPID_PRIVATE_KEY`.
La privada se guarda como variable sensitive de Vercel, nunca en Git, archivos
del proyecto, logs ni NEXT_PUBLIC. La pública se entrega solo por la ruta con sesión.
Se generan una sola vez y se reutilizan; nunca sobrescribir claves existentes.
No se modifican credenciales de Meta/Supabase ni integraciones de Antigravity.
La biblioteca `web-push` se fija a 4.0.0 con su lockfile.

Orden: verificar y compilar el commit aislado sobre main; crear únicamente las
variables nuevas ausentes; aplicar la migración aditiva; publicar ese commit.
Sin suscripciones no se crean entregas ni se envían avisos. Para activarlos en el
Samsung, recargar la app, pulsar “Activar avisos” y aceptar el permiso. Luego
cerrar la app y enviar un mensaje real desde el teléfono personal para verificar.

## Validación y reversión

`tests/inbox/push.mjs`: nueve grupos de pruebas con payloads y perfiles ficticios:
validación SSRF, cifrado/VAPID real sin red, rutas autorizadas y propiedad,
SQL exacto, solo entrantes nuevos, perfiles activos, leases y reintentos,
retención, fallo de cola sin perder recepción, despachador con proveedor
simulado, bot concurrente y service worker con enlace a la conversación.
Las pruebas PGlite no simulan dos conexiones Postgres independientes.
También se ejecuta `tests/inbox/security.mjs` de la entrega anterior.

ESLint en archivos nuevos y flujo Inbox: sin errores. Los dos componentes
preexistentes de logout presentan reglas de efectos/pureza ya presentes en
main; no se refactorizan como parte de esta funcionalidad.

Ante un problema, recuperar el despliegue anterior y desactivar únicamente
`trg_enqueue_inbox_push` usando `tests/inbox/disable-push.sql` para detener nuevas
entregas. No borrar mensajes, canales, suscripciones ni claves. No aplicar esa
reversión sin una decisión explícita; el fallo de push ya está aislado del bot.

Archivos de publicación: package.json/package-lock.json, vercel.json,
public/inbox-push-sw.js; src/lib/inbox-push-{browser,server,validation}.js;
src/app/api/inbox/push/route.js y push/dispatch/route.js;
src/app/api/inbox/webhook/route.js; página Inbox e InboxPushControl.jsx;
DashboardSidebar.jsx/DashboardTopBar.jsx (solo revocación al salir);
la nueva migración, tests/inbox/push.mjs, tests/inbox/disable-push.sql y este documento.
Excluir las refactorizaciones locales previas de Antigravity y los demás archivos.

Referencias: [Web Push](https://github.com/web-push-libs/web-push),
[PWAs en Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps),
[permiso y suscripción](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).
