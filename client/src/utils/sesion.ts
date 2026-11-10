import { forgetOfflineSession } from "../services/offlineSync";

let pendingCleanup: Promise<void> | undefined;

export function limpiarSesion(): Promise<void> {
  if (pendingCleanup) return pendingCleanup;
  const forgetSession = forgetOfflineSession();
  for (const key of ["token", "user", "role"]) localStorage.removeItem(key);
  pendingCleanup = forgetSession.then(async () => {
    if ("caches" in window) await caches.delete("api-cache").catch(() => undefined);
  }).finally(() => { pendingCleanup = undefined; });
  return pendingCleanup;
}
