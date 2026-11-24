# Recordatorios de la aplicación

La campana del encabezado muestra actividades desde siete días antes, consejos desde tres días antes y un recordatorio de asistencia los sábados a las 19:00, con la zona horaria Argentina por defecto. Los administradores pueden cambiar días, hora, zona horaria y activar o desactivar cada tipo desde Ajustes → Notificaciones, tanto en web como en móvil.

## Instalación

Antes de publicar el backend, ejecutar `npm run migrate` desde `server`. El comando incluye `migrations/notifications.sql`, que crea la configuración y las marcas de lectura por usuario de forma idempotente. Publicar también el cliente actualizado. No se requieren claves de servicios externos.

## Comportamiento

- Los avisos se consultan al abrir la aplicación, al recuperar conexión o visibilidad y cada minuto mientras está visible.
- En web son avisos internos de la campana. En Android también se programan notificaciones locales del sistema, que pueden mostrarse con la aplicación cerrada y sin conexión. Se activan desde Ajustes → Notificaciones → Activar avisos de Android, concediendo el permiso solicitado por el dispositivo.
- La anticipación se calcula por días de calendario en la zona configurada. Los eventos pasados dejan de mostrarse. El recordatorio semanal permanece disponible durante 24 horas.
- Los consejos respetan la pertenencia: administrador, creador o participante. Los líderes necesitan el permiso del módulo correspondiente. Los estudiantes no reciben el recordatorio de registrar asistencia. Los docentes necesitan tener un curso asignado.
- Las marcas de lectura se guardan en el servidor por cuenta y ocurrencia; consultar repetidamente no duplica avisos. Reprogramar un evento produce una nueva ocurrencia.
- Los cambios en configuración se aplican en la siguiente consulta. Esta configuración es global y solo editable por administradores, incluso mediante la API.

## Recordatorios de Android

El cliente nativo utiliza `@capacitor/local-notifications`. Después de actualizar las dependencias, ejecutar `npm run android:sync` desde `client` para registrar el complemento y copiar los recursos nativos. Se necesita instalar una versión nativa actualizada para disponer de esta función; publicar solo la web no actualiza el complemento instalado.

La API autenticada `/api/notifications/plan` entrega los recordatorios permitidos de los próximos 90 días, con los horarios convertidos a UTC desde la zona seleccionada en el dropdown de configuración. Android conserva el plan descargado, evita duplicar ocurrencias y elimina los avisos programados y entregados al cerrar sesión. Marcar un aviso como leído lo excluye de la siguiente programación.

La programación se actualiza al abrir o volver a la aplicación con conexión, al activar los avisos, al modificar la configuración y periódicamente mientras se usa. Los cambios realizados en otro dispositivo con la aplicación cerrada se reciben al volver a abrirla con conexión; no se utiliza un servicio de push remoto. Android puede retrasar las notificaciones por ahorro de batería. No se solicita permiso de alarmas exactas.

La aplicación no genera notificaciones push del navegador. El permiso de Android es individual por dispositivo; los parámetros de anticipación y zona horaria siguen siendo globales y solo editables por administradores.
