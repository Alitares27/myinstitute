import { ReactNode } from "react";
import BarraLateral from "./BarraLateral";
import PieDePagina from "./PieDePagina";
import EstadoSincronizacion from "./EstadoSincronizacion";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      <BarraLateral />
      <div className="main-content">
        <main className="content">
          <EstadoSincronizacion />
          {children}
        </main>
        <PieDePagina />
      </div>
    </div>
  );
}
