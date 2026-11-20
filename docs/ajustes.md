# Página de ajustes

El menú web y móvil abre `/ajustes`. Las cuatro secciones se consultan en una misma página:

- Sincronización: usa el permiso existente `sincronizacion`; sin permiso se informa que el acceso no está habilitado y no se consulta la cola local.
- Notificaciones: la configuración global se carga y edita solo para administradores. Los demás usuarios reciben una explicación y conservan la campana de avisos.
- Apariencia: preferencias personales inmediatas guardadas por dispositivo; mantiene las doce opciones de color y la paleta de Android.
- Acerca de: descripción, versión y desarrollador de la aplicación.

Las direcciones anteriores `/sincronizacion` y `/notificaciones` conservan sus protecciones y redirigen a la sección correspondiente en Ajustes. No se agregaron permisos nuevos ni se ampliaron privilegios de los roles.

El acceso rápido Sincronizar del Panel se reemplazó por Actividades, visible para quienes tienen acceso a ese módulo.
