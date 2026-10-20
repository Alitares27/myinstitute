/**
 * Utilidades compartidas para generar documentos PDF (con jsPDF).
 *
 * Se usa desde los reportes imprimibles de consejos y actividades. jsPDF se
 * importa de forma diferida en `crearDocumento`, de modo que la librería sólo
 * se descarga cuando el usuario decide imprimir.
 */

import type { jsPDF as JsPDFDocumento } from "jspdf";

/* -----------------------------------------
   Medidas (A4 en puntos: 72 dpi)
   ----------------------------------------- */
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN_X = 48;
export const MARGIN_BOTTOM = 66;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

export type RGB = [number, number, number];

export const COLOR_INK: RGB = [28, 28, 30];
export const COLOR_MUTED: RGB = [142, 142, 147];
export const COLOR_LINE: RGB = [229, 229, 234];
export const COLOR_PRIMARY: RGB = [0, 122, 255];
export const COLOR_PRIMARY_DARK: RGB = [0, 86, 179];
export const COLOR_SOFT: RGB = [240, 247, 255];

/* -----------------------------------------
   Formato de textos
   ----------------------------------------- */
export function formatearFechaHora(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getFullYear()} ${horas}:${minutos}`;
}

export function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* -----------------------------------------
   Logo (se intenta incluir; si falla, se omite)
   ----------------------------------------- */
let logoCache: string | null | undefined;

async function cargarLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;

  if (typeof window === "undefined" || typeof fetch === "undefined") {
    logoCache = null;
    return null;
  }

  try {
    const respuesta = await fetch(`${window.location.origin}/temple.jpg`);
    if (!respuesta.ok) throw new Error("Logo no disponible");
    const blob = await respuesta.blob();

    logoCache = await new Promise<string | null>((resolve) => {
      const lector = new FileReader();
      lector.onload = () =>
        resolve(typeof lector.result === "string" ? lector.result : null);
      lector.onerror = () => resolve(null);
      lector.readAsDataURL(blob);
    });
  } catch {
    logoCache = null;
  }

  return logoCache ?? null;
}

/* -----------------------------------------
   Documento
   ----------------------------------------- */
export interface OpcionesDocumento {
  /** Título principal del encabezado. */
  titulo: string;
  /** Línea secundaria debajo del título. */
  subtitulo?: string;
  /** Texto alineado a la derecha del encabezado (por ejemplo, cantidad de registros). */
  detalle?: string;
}

export interface OpcionesParrafo {
  size?: number;
  color?: RGB;
  lineHeight?: number;
  x?: number;
  width?: number;
  style?: "normal" | "bold" | "italic";
}

export class Documento {
  readonly doc: JsPDFDocumento;

  /** Posición vertical actual (en puntos, desde el borde superior). */
  y = 0;

  private readonly logo: string | null;
  private readonly opciones: OpcionesDocumento;
  private readonly generado = new Date();

  constructor(
    doc: JsPDFDocumento,
    logo: string | null,
    opciones: OpcionesDocumento
  ) {
    this.doc = doc;
    this.logo = logo;
    this.opciones = opciones;
    this.cabecera(false);
  }

  /* ---------- Encabezado / pie ---------- */
  private dibujarLogo(x: number, top: number, tamano: number) {
    if (!this.logo) return;
    try {
      this.doc.addImage(this.logo, "JPEG", x, top, tamano, tamano);
    } catch {
    }
  }

  private cabecera(continuacion: boolean) {
    const { doc } = this;

    if (!continuacion) {
      const tamanoLogo = 34;
      this.dibujarLogo(MARGIN_X, 38, tamanoLogo);

      const xTexto = MARGIN_X + (this.logo ? tamanoLogo + 14 : 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(...COLOR_INK);
      doc.text(this.opciones.titulo, xTexto, 57);

      if (this.opciones.subtitulo) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLOR_MUTED);
        doc.text(this.opciones.subtitulo, xTexto, 72);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_MUTED);
      doc.text(
        `Generado: ${formatearFechaHora(this.generado)}`,
        PAGE_WIDTH - MARGIN_X,
        57,
        { align: "right" }
      );

      if (this.opciones.detalle) {
        doc.text(this.opciones.detalle, PAGE_WIDTH - MARGIN_X, 71, {
          align: "right",
        });
      }

      doc.setDrawColor(...COLOR_PRIMARY);
      doc.setLineWidth(2.5);
      doc.line(MARGIN_X, 88, PAGE_WIDTH - MARGIN_X, 88);

      this.y = 110;
      return;
    }

    this.dibujarLogo(MARGIN_X, 32, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(this.opciones.titulo, MARGIN_X + (this.logo ? 26 : 0), 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Generado: ${formatearFechaHora(this.generado)}`,
      PAGE_WIDTH - MARGIN_X,
      45,
      { align: "right" }
    );

    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, 56, PAGE_WIDTH - MARGIN_X, 56);

    this.y = 76;
  }

  private pie(pagina: number, total: number) {
    const { doc } = this;

    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, PAGE_HEIGHT - 52, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `GestionAR \u00b7 ${new Date().getFullYear()} \u00b7 Documento generado autom\u00e1ticamente`,
      MARGIN_X,
      PAGE_HEIGHT - 34
    );
    doc.text(`P\u00e1gina ${pagina} de ${total}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 34, {
      align: "right",
    });
  }

  /* ---------- Páginas ---------- */
  nuevaPagina() {
    this.doc.addPage();
    this.cabecera(true);
  }

  asegurar(alto: number) {
    if (this.y + alto > PAGE_HEIGHT - MARGIN_BOTTOM) this.nuevaPagina();
  }

  /* ---------- Bloques de texto ---------- */
  parrafo(texto: string | null | undefined, opciones: OpcionesParrafo = {}) {
    const { doc } = this;
    const size = opciones.size ?? 10;
    const alto = opciones.lineHeight ?? size * 1.45;
    const x = opciones.x ?? MARGIN_X;
    const width = opciones.width ?? CONTENT_WIDTH;

    doc.setFont("helvetica", opciones.style ?? "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opciones.color ?? COLOR_INK));

    const limpio = String(texto ?? "").replace(/\r\n/g, "\n");
    const lineas: string[] = [];

    limpio.split("\n").forEach((parrafo) => {
      if (!parrafo.trim()) {
        lineas.push("");
        return;
      }
      const ajustadas = doc.splitTextToSize(parrafo.trim(), width) as string[];
      lineas.push(...ajustadas);
    });

    lineas.forEach((linea) => {
      this.asegurar(alto);
      if (linea) doc.text(linea, x, this.y);
      this.y += alto;
    });
  }

  etiqueta(texto: string) {
    const { doc } = this;

    this.asegurar(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.setCharSpace(0.7);
    doc.text(texto.toUpperCase(), MARGIN_X, this.y);
    doc.setCharSpace(0);
    this.y += 12;
  }

  acortar(texto: string, width: number): string {
    const { doc } = this;
    if (doc.getTextWidth(texto) <= width) return texto;

    let recortado = texto;
    while (recortado.length > 1 && doc.getTextWidth(`${recortado}\u2026`) > width) {
      recortado = recortado.slice(0, -1);
    }
    return `${recortado}\u2026`;
  }

  /* ---------- Bloques compuestos ---------- */
  /**
   * Título de un registro, con una barra de color a su izquierda.
   * `espacioMinimo` reserva además espacio para el contenido que sigue.
   */
  tituloBloque(titulo: string, espacioMinimo = 86) {
    const { doc } = this;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);

    const lineas = doc.splitTextToSize(
      titulo || "Sin título",
      CONTENT_WIDTH - 16
    ) as string[];
    const altoTitulo = lineas.length * 17;

    this.asegurar(altoTitulo + espacioMinimo);

    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(MARGIN_X, this.y - 9.5, 3, altoTitulo + 2, "F");

    doc.setTextColor(...COLOR_INK);
    lineas.forEach((linea) => {
      doc.text(linea, MARGIN_X + 13, this.y);
      this.y += 17;
    });
  }

  /** Recuadro con un resumen (izquierda) y un detalle a la derecha. */
  resumen(izquierda: string, derecha?: string) {
    const { doc } = this;
    const alto = 32;

    this.asegurar(alto + 18);

    doc.setFillColor(...COLOR_SOFT);
    doc.roundedRect(MARGIN_X, this.y, CONTENT_WIDTH, alto, 7, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(izquierda, MARGIN_X + 14, this.y + 20);

    if (derecha) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_MUTED);
      doc.text(derecha, PAGE_WIDTH - MARGIN_X - 14, this.y + 20, {
        align: "right",
      });
    }

    this.y += alto + 22;
  }

  /** Línea divisoria entre registros. */
  separador(espacio = 26) {
    const { doc } = this;

    this.asegurar(espacio);
    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, this.y + 5, PAGE_WIDTH - MARGIN_X, this.y + 5);
    this.y += espacio;
  }

  /** Numeración de páginas; debe llamarse al terminar de escribir el contenido. */
  finalizar() {
    const total = this.doc.getNumberOfPages();

    for (let pagina = 1; pagina <= total; pagina++) {
      this.doc.setPage(pagina);
      this.pie(pagina, total);
    }
  }

  guardar(nombreArchivo: string) {
    this.doc.save(nombreArchivo);
  }
}

/**
 * Crea un documento A4 vertical con el encabezado de la institución.
 */
export async function crearDocumento(
  opciones: OpcionesDocumento
): Promise<Documento> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const logo = await cargarLogo();

  return new Documento(doc, logo, opciones);
}
