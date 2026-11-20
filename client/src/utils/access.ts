import { MODULE_ROUTES, FINANCE_MODULES } from "../shared/constants";
import type { AppModule } from "../shared/constants";
import type { User } from "../interfaces/User";

export function readSessionUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function canAccessModule(user: Pick<User,"role"|"permissions"> | null, module: AppModule, studentAllowed = true) {
  return user?.role === "admin" ||
    (user?.role === "teacher" && user.permissions?.includes(module) === true) ||
    (user?.role === "finance" && FINANCE_MODULES.includes(module) && user.permissions?.includes(module) === true) ||
    (user?.role === "student" && studentAllowed);
}
export function canManageModule(user:Pick<User,"role"|"permissions">|null,module:AppModule){return user?.role==="admin"||(user?.role==="finance"&&canAccessModule(user,module,false));}

export function moduleForPath(path: string): AppModule | undefined {
  if (path === "/usuarios") return "miembros";
  return (Object.keys(MODULE_ROUTES) as AppModule[]).find(module => {
    const [route] = MODULE_ROUTES[module];
    return path === route || path.startsWith(route + "/");
  });
}

export function firstAllowedPage(user: User | null) {
  const module = (Object.keys(MODULE_ROUTES) as AppModule[]).find(key => canAccessModule(user, key));
  return module ? MODULE_ROUTES[module][0] : "/sin-acceso";
}
