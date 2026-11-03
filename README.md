# GestionAR

Sistema de gestión integral para institutos religiosos. Administración de miembros, cursos, asistencia, calificaciones, discursantes, consejos, actividades, viajes al templo y más.

## Tecnologías

**Frontend:** React 18 + Vite 7 + TypeScript, React Router, Axios, Tabler Icons, react-icons
**Backend:** Node.js + Express + TypeScript, PostgreSQL, JWT, bcryptjs
**Android:** aplicación nativa basada en Capacitor, con la misma interfaz y módulos que la web, almacenamiento local offline y sincronización en segundo plano mediante Android JobScheduler.

## Módulos

| Módulo | URL | Descripción |
|--------|-----|-------------|
| Panel | `/panel` | Dashboard con estadísticas y accesos directos |
| Miembros | `/miembros` | CRUD de miembros + modal de maestros |
| Inscripciones | `/inscripciones` | Matrículas a cursos + modal de cursos |
| Asistencia | `/asistencia` | Registro diario de asistencia |
| Calificaciones | `/calificaciones` | Notas por curso y miembro |
| Discursantes | `/discursantes` | Temas y expositores + modal de temas |
| Consejos | `/consejos` | Reuniones con participantes y estado |
| Actividades | `/actividades` | Actividades con áreas (espiritual, social, física, intelectual) |
| Viajes al Templo | `/viajes-templo` | Gestión de viajes programados |
| Reservar Viajes | `/reservar-viajes` | Reservas y amortizaciones |
| Templos | `/templos` | Mantenimiento de templos |
| Usuarios | `/usuarios` | Perfil y cambio de contraseña (no-admin) / CRUD completo (admin) |

## Roles

- **admin** — acceso completo a CRUD en todos los módulos
- **teacher** — acceso a lectura y gestión de cursos/asistencia/calificaciones
- **student** — acceso de lectura a su información

## Instalación local

```bash
# Clonar
git clone <repo>
cd myinstitute

# Backend
cd server
npm ci
# Crear .env con DATABASE_URL y JWT_SECRET
npm run migrate           # requiere el esquema de aplicación existente; migración aditiva
npm run dev               # http://localhost:5000

# Frontend
cd ../client
npm ci
npm run dev               # http://localhost:5173
```

## Despliegue

- **Frontend:** Vercel (SPA + PWA)
- **Backend:** Render / Railway / VPS
- **Base de datos:** Neon PostgreSQL

## Aplicación móvil para Android

`client/android` contiene el proyecto Android nativo de Capacitor. La app carga el mismo frontend y ofrece las mismas rutas y módulos que la versión web; su interfaz móvil mantiene el estilo redondeado y adapta la paleta al tema dinámico de Android en dispositivos compatibles. La compilación web móvil no incorpora service worker ni se instala desde el navegador como PWA.

Android apunta a `https://myinstitute-1.onrender.com/api`; la URL está en `client/.env.android.example` y en el archivo local ignorado `client/.env.android.local`. Comprueba esa dirección antes de compilar; usa HTTPS para distribuir la app. Capacitor sirve el frontend desde `https://localhost`, origen que también debe estar permitido por CORS en el backend. Tras actualizar `server/index.ts`, despliega el backend para que acepte las solicitudes de la app.

Desde PowerShell, prepara los recursos nativos y abre Android Studio:

```powershell
Set-Location client
Copy-Item .env.android.example .env.android.local -Force
notepad .env.android.local
npm ci
npm run android:sync
npm run android:open
```

Se requiere Node.js >=22.12, Android Studio 2025.2.1 o posterior, Android SDK y un JDK compatible con Android Gradle Plugin. Para preparar un APK de lanzamiento firmado, crea una clave privada y un almacén de claves que conservarás de forma segura; no los subas al repositorio. Desde `client/android`, ejecuta `keytool -genkeypair -v -keystore app/gestionar-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias gestionar` y crea `keystore.properties` con `storeFile=app/gestionar-release.jks`, `storePassword`, `keyAlias=gestionar` y `keyPassword`. El archivo y la clave ya están excluidos de Git. La configuración de firma se activa cuando existe ese archivo.

Los comandos para generar el APK cuando se autorice se indican por separado más abajo; no se debe ejecutar `assembleRelease` sin haber configurado la firma.

### Generar el APK (no ejecutar durante la preparación)

Después de completar los pasos anteriores, desde PowerShell:

```powershell
Set-Location client/android

# APK de depuración, firmado automáticamente con la clave de desarrollo
.\gradlew.bat assembleDebug

# APK de lanzamiento, firmado con keystore.properties
.\gradlew.bat assembleRelease
```

Los archivos se guardan en `client/android/app/build/outputs/apk/debug/app-debug.apk` y `client/android/app/build/outputs/apk/release/app-release.apk`. Si no existe la configuración de firma privada, Gradle puede producir un APK de lanzamiento sin firmar, que no sirve para distribuir como actualización. Conserva siempre la misma clave para publicar actualizaciones de la app.

### Uso sin conexión

- Inicia sesión con conexión al menos una vez en el dispositivo.
- Abre con conexión los módulos y filtros que necesitarás: las respuestas consultadas se guardan localmente y se aíslan por cuenta.
- Sin conexión, la app muestra las consultas guardadas y conserva altas, ediciones y eliminaciones en una cola local.
- Al volver la conexión, Android JobScheduler reintenta los cambios pendientes en segundo plano, sujeto a las políticas de batería y red del sistema. Al abrir la app también se actualiza el estado y se reconcilian los identificadores locales.
- La barra superior informa si no hay conexión, cuántos cambios siguen pendientes y cuándo una operación no pudo sincronizarse. Los cambios rechazados por validaciones del servidor permanecen guardados para que no se pierdan.

El inicio de sesión, el registro y el cambio de contraseña requieren conexión. La base local no puede mostrar datos de un módulo o filtro que nunca se haya consultado mientras había conexión. Las escrituras se reenvían en el orden en que se hicieron; si dos usuarios modifican el mismo registro sin conexión, el servidor aplica sus validaciones al sincronizar y puede dejar una operación pendiente para revisión.

## Seguridad

- Autenticación JWT con expiry 1h
- Login: 10 intentos fallidos por cuenta y 100 por IP en 15 minutos; registro: 10 por IP.
- Helmet para headers de seguridad HTTP
- Contraseñas hasheadas con bcryptjs
- Escrituras administrativas protegidas con `isAdmin`; asistencia y calificaciones con permisos de administrador o docente asignado
- SQL parametrizado (sin inyección SQL)
- La versión web usa un service worker propio; Android no incluye ese service worker. Las respuestas privadas nunca entran a Cache Storage.

## Licencia

Uso interno.

## Verificación

```bash
npm test --prefix server
npm test --prefix client
npm run build --prefix server
npm run build --prefix client
# Opcional: requiere la base configurada; solo SELECT y GET, sin cambios de datos.
npm run test:readonly --prefix server
```

La suite de regresión usa una base simulada para validar escrituras, rechazos y concurrencia.
La prueba de solo lectura comprueba consultas y aislamiento con los roles disponibles en PostgreSQL.

## Configuración de seguridad y actualización

- PostgreSQL verifica certificados TLS. Para una CA privada, configura `PGSSL_CA` (PEM); `PGSSL=disable` se reserva para una base local sin TLS.
- Después de actualizar, las sesiones anteriores deben iniciar sesión nuevamente. Cambiar contraseña o rol invalida su uso; las cuentas eliminadas dejan de autenticar.
- La API privada no se guarda en el service worker. Se elimina la caché heredada `api-cache`.
- La edición de una reserva recibe `initial_payment` como adelanto inicial; el total pagado incorpora los abonos existentes. No se puede cambiar miembro o viaje si existen abonos.
- Las reservas se consultan con `page`, `limit` (máximo 100), `trip_id`, `user_id`, `search`, `sort` y `direction`. La respuesta contiene `items`, `total`, `total_paid`, `total_pending`, `page` y `limit`. `/options?trip_id=...` carga opciones y `/report` exporta el conjunto filtrado; ambos requieren administrador.
- Los cambios de rol con historial académico o cursos asignados se rechazan para preservar los datos. Reasigna o resuelve esas dependencias primero.
- `npm run migrate --prefix server` aplica `security_and_history.sql`: versión de sesión, archivado, historial financiero e índices. Es idempotente y no elimina registros. Aplica esta migración antes de desplegar el backend. Las migraciones anteriores de índices/restricciones pueden aplicarse por separado.

## Correcciones de la auditoría del 31/10/2026

- npm es el gestor canónico; usa `npm ci` en `server` y `client`. Se retiraron los lockfiles pnpm divergentes. Requiere Node >=22.12.
- Cerrar sesión revoca todas las sesiones de esa cuenta mediante `users.auth_version`. Los JWT anteriores a esta actualización requieren nuevo inicio de sesión. Sin conexión solo se puede limpiar la sesión local; la interfaz avisa si falla la revocación remota.
- `TRUST_PROXY_CIDRS` acepta una lista explícita de proxies/subredes confiables. Sin configuración no se confían cabeceras reenviadas; en Render (`RENDER=true`) se usa su único salto de entrada protegido. Verifica la topología antes de configurar otros proveedores.
- Los cuerpos HTTP comprimidos se rechazan (`inflate:false`). Los analizadores tienen límites de tamaño.
- Viajes y templos con movimientos o eventos financieros no se eliminan. La acción Archivar los retira del catálogo activo sin borrar pagos. `/temple-trips?include_archived=true` y `/temples?include_archived=true` permiten al administrador consultar archivados.
- Las correcciones/reversiones de pagos se conservan en `financial_events`, disponible en Auditorías. Las correcciones de adelantos también dejan el estado anterior y posterior. No se expone un endpoint para borrar estos eventos.
- Asistencia, calificaciones y pagos ahora devuelven `{items,total,summary,page,limit}`. Admiten `page`, `limit` (máximo 100), `search`, `sort` y `direction`, además de sus filtros. Los endpoints `/report` exportan todo el resultado autorizado y filtrado.
- La deuda y las reservas saldadas se calculan una vez por reserva, incluidas las reservas sin abonos. El filtro de medio de pago cambia los recibos y su importe, pero no la deuda global de las reservas seleccionadas; la interfaz distingue las dos métricas.
- El porcentaje de asistencia es presentes / (presentes + ausentes) sobre registros válidos, sin utilizar temas como clases esperadas. Si no hay registros, se devuelve 0 %.
- Los días civiles se calculan en Argentina; las fechas vacías o inválidas no se sustituyen silenciosamente por hoy al editar.
- Las pruebas de integración usan PostgreSQL embebido en memoria y un esquema desechable. Cubren SQL, claves foráneas, migración idempotente, sesiones, permisos, saldos, reversiones y archivado. La concurrencia entre conexiones se comprueba por separado con dobles controlados; PGlite no sustituye una prueba de carga multiusuario contra PostgreSQL nativo.
- La auditoría npm final incluye producción y desarrollo. No se usó `audit fix --force` ni se forzaron peers incompatibles.

## Miembros y perfiles académicos

La administración unificada se encuentra en `/miembros`; `/usuarios` redirige a esta pantalla. El filtro «Tipo de registro → Estudiantes» consulta también perfiles académicos de miembros con otro rol de acceso. La ficha permite consultar cursos, asistencia y notas. `students` y `teachers` se conservan como extensiones de `users`, con sus claves e historial. Docentes ven estudiantes de sus cursos; estudiantes ven su propia ficha. Detalles y validación en [UNIFICACION-MIEMBROS.md](UNIFICACION-MIEMBROS.md).
