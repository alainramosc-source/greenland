# Inbox: corrección móvil y conservación de escritorio

Solicitud del usuario: la captura de Samsung muestra controles y texto fuera de
pantalla y falta de un retorno fácil del chat al listado.

Causas confirmadas en código: el contenedor flex principal permite ancho mínimo
automático, barras con todos sus controles en una sola línea, un panel de chat
de embudo fijo de 500px, audio con ancho mínimo y espaciado de escritorio. El
botón anterior para volver existía, pero quedaba dentro de un área susceptible
de recorte. No se necesita desplazar toda la página horizontalmente para leer
una conversación: los mensajes y controles deben ajustarse al ancho del teléfono.

## Cambios

- Contenedores min-width/min-height cero, alto basado en viewport dinámico y
  columna central limitada al espacio real. La barra lateral ocupa 44px en móvil
  y conserva sus 56px en escritorio.
- Barras y filtros se acomodan en varias filas. En móvil los textos largos de
  acciones se sustituyen por etiquetas cortas; las etiquetas de escritorio se
  mantienen. El embudo conserva su desplazamiento horizontal dentro de su área.
- Botón “Chats” visible fuera del área desplazable de mensajes. Vuelve al listado
  manteniendo la sesión y sin salir del Inbox. Disponible también desde el chat
  del embudo. El escritorio mantiene lista y conversación simultáneamente.
- Texto largo y enlaces se parten dentro de la burbuja. El audio y el compositor
  se ajustan al ancho; mensajes y lista tienen su desplazamiento vertical propio.
- Las rutas internas de adjuntos no se muestran como texto de imagen/documento
  ni como preview crudo; el archivo y sus enlaces autenticados no cambian.
- Paneles de contacto y venta accesibles como panel móvil con cierre visible.
  El panel lateral de escritorio conserva su comportamiento a partir de xl.
- Barra de avisos compacta en móvil; no cambia permisos ni el mecanismo push.

No se modifican cálculos, pedidos, ventas, datos, autenticación ni motor del bot
para corregir la vista móvil. Las refactorizaciones anteriores de Antigravity
quedan excluidas. Los cambios se entregan junto con notificaciones, solicitadas
en el mismo trabajo antes de esta corrección.

## Verificación

`node tests/inbox/mobile.mjs` crea una app temporal usando los componentes reales
y el hook ficticio `mobile-fixture-hook.jsx`. No carga credenciales, sesiones ni
datos de producción y bloquea todo tráfico del navegador fuera de localhost.
Prueba 320/360/390px y escritorio 1366px: ancho y alto de página, filtros,
compositor, texto sin espacios, botón Chats, retorno al listado, contacto y
chat del embudo. Produce capturas en la carpeta temporal greenland-mobile-checks.
Es una prueba visual y funcional aislada; el teclado físico/virtual y los avisos
del Samsung real todavía requieren la comprobación del usuario tras publicar.

El navegador local puede encontrarse en LOCALAPPDATA/ms-playwright o en el
runtime de Playwright. No se instala código de prueba en la página de producción;
el fixture solo se copia a una carpeta temporal durante el test.
