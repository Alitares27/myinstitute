import api from "../api";

interface EntradaCache<T> {
  datos: T;
  expiraEn: number;
}

const cacheMemoria = new Map<string, EntradaCache<any>>();

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
  const ahora = Date.now();
  const entrada = cacheMemoria.get(clave);

  if (!forzar && entrada && entrada.expiraEn > ahora) {
    return entrada.datos as T;
  }

  const datos = await fetcher();
  cacheMemoria.set(clave, {
    datos,
    expiraEn: ahora + ttlMs,
  });

  return datos;
}

/**
 * Invalida una clave específica o todas las claves que empiecen por un prefijo.
 * Si no se pasa argumento, vacía toda la caché.
 */
export function invalidarCache(prefijo?: string): void {
  if (!prefijo) {
    cacheMemoria.clear();
    return;
  }

  for (const clave of cacheMemoria.keys()) {
    if (clave.startsWith(prefijo)) {
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
