import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: JSX.Element;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? payload.exp < now : false;
  } catch {
    return true;
  }
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const token = sessionStorage.getItem("token");

  if (!token || isTokenExpired(token)) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("role");
    return <Navigate to="/login" replace />;
  }

  return children;
}