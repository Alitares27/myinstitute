import { invalidarCache } from "./clienteCache";
import { forgetOfflineSession } from "../services/offlineSync";
import { clearAndroidReminders } from "../native/androidNotifications";

let pendingCleanup: Promise<void> | undefined;

export function limpiarSesion(): Promise<void> {
  if (pendingCleanup) return pendingCleanup;
  invalidarCache();
  const forgetSession = forgetOfflineSession();
  const clearReminders=clearAndroidReminders();
  for (const key of ["token", "user", "role"]) localStorage.removeItem(key);
  pendingCleanup = Promise.all([forgetSession,clearReminders]).then(async () => {
    if ("caches" in window) await caches.delete("api-cache").catch(() => undefined);
  }).finally(() => { pendingCleanup = undefined; });
  return pendingCleanup;
}
