import { ReactNode, useState, useEffect } from "react";
import BarraLateral from "./BarraLateral";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="app-layout">
      <BarraLateral />
      <main className="content">
        {isOffline && (
          <div className="offline-banner">
            Sin conexión a internet — algunos datos podrían no estar actualizados
          </div>
        )}
        {children}
      </main>
    </div>
  );
}