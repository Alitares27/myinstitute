# Rol Financiero

Los roles internos son `admin`, `teacher` (Líder / Maestro), `student` (Miembro) y `finance` (Financiero). El registro público continúa creando miembros, nunca cuentas privilegiadas.

El administrador selecciona **Financiero** al crear o editar un miembro y marca sus páginas en **Páginas del Financiero**. Sin páginas seleccionadas no se concede acceso. Las opciones son Panel, Miembros, Templos, Viajes, Reservas, Pagos, Historial financiero y Sincronización. El rol no permite asignar páginas académicas ni configuración del sistema.

En las páginas financieras habilitadas puede consultar, imprimir, crear y actualizar registros, así como usar las acciones existentes de eliminación o archivo con las mismas restricciones de conservación del historial. Para registrar pagos desde Reservas también necesita la página Pagos.

Con Miembros habilitado puede consultar el directorio y crear/editar miembros ordinarios. No puede promover roles, cambiar permisos, modificar cuentas privilegiadas, cambiar contraseñas de otras cuentas, eliminar miembros ni retirar perfiles académicos. Solo un administrador gestiona los accesos. El historial académico se conserva al asignar Financiero a un miembro.

El servidor valida el rol y las páginas en cada petición. Cambiar los accesos invalida las sesiones anteriores mediante `token_version`. La creación de cuentas financieras y los cambios de accesos se registran en eventos de seguridad; los pagos conservan su auditoría financiera.

Antes de publicar el backend, ejecutar `npm run migrate` desde `server`; el comando incluye la migración idempotente `financial_role.sql`. Publicar también el cliente. No se genera un APK como parte de este cambio.
