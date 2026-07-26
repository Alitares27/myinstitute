import { ReactNode } from "react";
import BarraLateral from "./BarraLateral";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      <BarraLateral />
      <main className="content">{children}</main>
    </div>
  );
}