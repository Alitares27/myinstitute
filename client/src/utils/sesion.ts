export async function limpiarSesion(): Promise<void> {
  for (const key of ["token", "user", "role"]) localStorage.removeItem(key);
  if ("caches" in window) {
    await Promise.all(["api-cache"].map(name => caches.delete(name))).catch(() => undefined);
  }
}
