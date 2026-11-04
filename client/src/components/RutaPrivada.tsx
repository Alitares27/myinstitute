import { Navigate } from "react-router-dom";
import { forgetOfflineSession } from "../services/offlineSync";

interface PrivateRouteProps {
  children: JSX.Element;
}

function isTokenExpired(token: string): boolean {
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

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  const expiredOfflineSession = !navigator.onLine && !!savedUser && !!token && isTokenExpired(token);

  if (!token || (isTokenExpired(token) && !expiredOfflineSession)) {
    void forgetOfflineSession();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    return <Navigate to="/iniciar-sesion" replace />;
  }

  return children;
}
