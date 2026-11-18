import type { AppModule } from "../shared/constants";
import { canAccessModule, firstAllowedPage, readSessionUser } from "../utils/access";
import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: JSX.Element;
  module?: AppModule;
  adminOnly?: boolean;
}

export function isTokenExpired(token: string): boolean {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return true;
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binaryPayload = atob(paddedBase64);
    const bytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const now = Math.floor(Date.now() / 1000);
    return typeof payload.exp === "number" && payload.exp < now;
  } catch {
    return true;
  }
}

export default function PrivateRoute({ children, module, adminOnly }: PrivateRouteProps) {
  const token = localStorage.getItem("token");
  const savedUser = readSessionUser();
  if (!token || !savedUser) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  if ((module && !canAccessModule(savedUser, module, !["templos", "reservar-viajes", "pagos-templos", "auditorias"].includes(module))) ||
      (adminOnly && savedUser.role !== "admin")) {
    return <Navigate to={firstAllowedPage(savedUser)} replace />;
  }

  return children;
}
