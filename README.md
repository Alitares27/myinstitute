# GestionAR

Sistema de gestión integral para institutos religiosos. Administración de miembros, cursos, asistencia, calificaciones, discursantes, consejos, actividades, viajes al templo y más.

## Tecnologías

**Frontend:** React 18 + Vite 5 + TypeScript, React Router, Axios, Tabler Icons, react-icons
**Backend:** Node.js + Express + TypeScript, PostgreSQL, JWT, bcryptjs
**PWA:** vite-plugin-pwa + Workbox (instalable en Android, caché offline de assets)

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

## Seguridad

- Autenticación JWT con expiry 1h
- Rate limiting en login/registro (10 intentos/15 min)
- Helmet para headers de seguridad HTTP
- Contraseñas hasheadas con bcryptjs
- Escrituras administrativas protegidas con `isAdmin`; asistencia y calificaciones con permisos de administrador o docente asignado
- SQL parametrizado (sin inyección SQL)
- PWA con service worker y Workbox

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
- Las migraciones `server/migrations/performance_indexes.sql` e `integrity_guards.sql` se aplican explícitamente al desplegar. Las restricciones `NOT VALID` preservan datos históricos; revisa inconsistencias previas antes de validarlas. Las pruebas de solo lectura no ejecutan migraciones.
