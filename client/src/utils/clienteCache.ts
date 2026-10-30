import api from "../api";

interface EntradaCache<T> {
  datos: T;
  expiraEn: number;
}

const cacheMemoria = new Map<string, EntradaCache<any>>();

const pendientes = new Map<string, Promise<any>>();
let revision = 0;

const TTL_DEFECTO_MS = 60 * 1000;

/**
 * Obtiene datos desde la caché en memoria o ejecuta la función fetcher si expiró o no existe.
 */
export async function fetchConCache<T>(
  clave: string,
  fetcher: () => Promise<T>,
  ttlMs: number = TTL_DEFECTO_MS,
  forzar: boolean = false
): Promise<T> {
  clave = `${localStorage.getItem("token") || "anonymous"}:${clave}`;
  const ahora = Date.now();
  const entrada = cacheMemoria.get(clave);

  if (!forzar && entrada && entrada.expiraEn > ahora) {
    return entrada.datos as T;
  }

  if (!forzar && pendientes.has(clave)) return pendientes.get(clave)!;
  const revisionActual = revision;
  const peticion = fetcher();
  pendientes.set(clave, peticion);
  try {
    const datos = await peticion;
    if (revisionActual === revision) {
      for (const [key, value] of cacheMemoria) if (value.expiraEn <= Date.now()) cacheMemoria.delete(key);
      cacheMemoria.set(clave, { datos, expiraEn: Date.now() + ttlMs });
    }
    return datos;
  } finally {
    if (pendientes.get(clave) === peticion) pendientes.delete(clave);
  }
}

/**
 * Invalida una clave específica o todas las claves que empiecen por un prefijo.
 * Si no se pasa argumento, vacía toda la caché.
 */
export function invalidarCache(prefijo?: string): void {
  revision++;
  pendientes.clear();
  if (!prefijo) {
    cacheMemoria.clear();
    return;
  }

  for (const clave of cacheMemoria.keys()) {
    if (clave.includes(`:${prefijo}`)) {
      cacheMemoria.delete(clave);
    }
  }
}

export async function obtenerEstudiantes(forzar: boolean = false) {
  return fetchConCache(
    "catalogo:students",
    async () => {
      const res = await api.get("/students");
      return res.data || [];
    },
    90 * 1000,
    forzar
  );
}

export async function obtenerCursos(forzar: boolean = false) {
  return fetchConCache(
    "catalogo:courses",
    async () => {
      const res = await api.get("/courses");
      return res.data || [];
    },
    90 * 1000,
    forzar
  );
}

export async function obtenerTemas(forzar: boolean = false) {
  return fetchConCache(
    "catalogo:topics",
    async () => {
      const res = await api.get("/topics");
      return res.data || [];
    },
    90 * 1000,
    forzar
  );
}

export function invalidarEstudiantes(): void {
  invalidarCache("catalogo:students");
}

export function invalidarCursos(): void {
  invalidarCache("catalogo:courses");
  invalidarCache("catalogo:topics");
}
