# Recordatorios de la aplicación

La campana del encabezado muestra actividades desde siete días antes, consejos desde tres días antes y un recordatorio de asistencia los sábados a las 19:00, con la zona horaria Argentina por defecto. Los administradores pueden cambiar días, hora, zona horaria y activar o desactivar cada tipo desde Ajustes → Notificaciones, tanto en web como en móvil.

## Instalación

Antes de publicar el backend, ejecutar `npm run migrate` desde `server`. El comando incluye `migrations/notifications.sql`, que crea la configuración y las marcas de lectura por usuario de forma idempotente. Publicar también el cliente actualizado. No se requieren claves de servicios externos.

## Comportamiento

- Los avisos se consultan al abrir la aplicación, al recuperar conexión o visibilidad y cada minuto mientras está visible.
- Son avisos internos de la campana. No son notificaciones push del navegador ni del sistema Android con la aplicación cerrada.
- La anticipación se calcula por días de calendario en la zona configurada. Los eventos pasados dejan de mostrarse. El recordatorio semanal permanece disponible durante 24 horas.
- Los consejos respetan la pertenencia: administrador, creador o participante. Los líderes necesitan el permiso del módulo correspondiente. Los estudiantes no reciben el recordatorio de registrar asistencia. Los docentes necesitan tener un curso asignado.
- Las marcas de lectura se guardan en el servidor por cuenta y ocurrencia; consultar repetidamente no duplica avisos. Reprogramar un evento produce una nueva ocurrencia.
- Los cambios en configuración se aplican en la siguiente consulta. Esta configuración es global y solo editable por administradores, incluso mediante la API.

Para avisos con la aplicación cerrada se necesita una implementación adicional de Web Push y un proveedor de push para Android; no se presenta este comportamiento como disponible.
