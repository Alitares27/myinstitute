export enum TripStatus {
  PROGRAMADO = "programado",
  CANCELADO = "cancelado",
  COMPLETADO = "completado",
  EN_CURSO = "en_curso",
}
export const TABLE_PAGE_SIZE = 7;

export const UI_STRINGS = {
  LOADING: "Cargando...",
  NO_RESULTS: "No se encontraron resultados",
  ERROR: "Ha ocurrido un error",
};

export const MODULE_ROUTES = {
  panel: ["/panel", "Panel"],
  actividades: ["/actividades", "Actividades"],
  agendas: ["/agendas", "Agendas"],
  asistencia: ["/asistencia", "Asistencia"],
  calificaciones: ["/calificaciones", "Calificaciones"],
  consejos: ["/consejos", "Consejos"],
  discursantes: ["/discursantes", "Discursantes"],
  inscripciones: ["/inscripciones", "Matrículas"],
  maestros: ["/maestros", "Maestros"],
  miembros: ["/miembros", "Miembros"],
  templos: ["/templos", "Templos"],
  "viajes-templo": ["/viajes-templo", "Viajes al templo"],
  "pagos-templos": ["/pagos", "Pagos"],
  "reservar-viajes": ["/reservar-viajes", "Reservas"],
  auditorias: ["/auditorias", "Auditorías"],
  sincronizacion: ["/sincronizacion", "Sincronización"],
} as const;

export type AppModule = keyof typeof MODULE_ROUTES;
export const FINANCE_MODULES:readonly AppModule[]=["panel","miembros","templos","viajes-templo","reservar-viajes","pagos-templos","auditorias","sincronizacion"];
