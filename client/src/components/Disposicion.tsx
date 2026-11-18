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
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <BarraLateral />
      <div className="main-content">
        <main id="main-content" className="content" tabIndex={-1}>
          <EstadoSincronizacion />
          {children}
        </main>
        <PieDePagina />
      </div>
    </div>
  );
}
