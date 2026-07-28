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
pnpm install
cp .env.example .env   # configurar DATABASE_URL y JWT_SECRET
pnpm dev               # http://localhost:5000

# Frontend
cd ../client
pnpm install
pnpm dev               # http://localhost:5173
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
- Todas las rutas de escritura protegidas con middleware `isAdmin`
- SQL parametrizado (sin inyección SQL)
- PWA con service worker y Workbox

## Licencia

Uso interno.
