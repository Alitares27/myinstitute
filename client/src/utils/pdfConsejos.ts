/**
 * Generación del archivo PDF de consejos.
 */

import type { jsPDF as JsPDFDocumento } from "jspdf";
import type { Meeting, MeetingUser } from "../interfaces/Meeting";
import {
  COLOR_INK,
  COLOR_MUTED,
  COLOR_PRIMARY,
  CONTENT_WIDTH,
  MARGIN_X,
  crearDocumento,
  quitarAcentos,
  type Documento,
  type RGB,
} from "./pdfBase";

const ETIQUETA_ESTADO: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const ETIQUETA_ASISTENCIA: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  declined: "Rechazado",
};

const COLOR_ASISTENCIA: Record<string, RGB> = {
  pending: [183, 149, 11],
  confirmed: [46, 125, 50],
  declined: [198, 40, 40],
};

/* -----------------------------------------
   Utilidades de formato
   ----------------------------------------- */
export function etiquetaEstadoConsejo(estado?: string | null): string {
  if (!estado) return ETIQUETA_ESTADO.scheduled;
  return ETIQUETA_ESTADO[estado] || estado;
}

function formatearFecha(fecha?: string | null): string {
  if (!fecha) return "--";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return String(fecha).slice(0, 10);
  return valor.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatearHora(hora?: string | null): string {
  if (!hora) return "--";
  return String(hora).slice(0, 5);
}

function nombreArchivo(consejos: Meeting[]): string {
  if (consejos.length === 1) {
    const titulo = quitarAcentos(consejos[0].title || "consejo")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return `Consejo_${titulo || "consejo"}.pdf`;
  }

  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `Consejos_${hoy.getFullYear()}-${mes}-${dia}.pdf`;
}

function rangoDeFechas(consejos: Meeting[]): string {
  const fechas = consejos
    .map((consejo) => new Date(consejo.meeting_date))
    .filter((fecha) => !Number.isNaN(fecha.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (fechas.length === 0) return "";
  const primera = formatearFecha(fechas[0].toISOString());
  const ultima = formatearFecha(fechas[fechas.length - 1].toISOString());

  return primera === ultima ? primera : `Del ${primera} al ${ultima}`;
}

/* -----------------------------------------
   Participantes en dos columnas
   ----------------------------------------- */
function dibujarParticipantes(documento: Documento, asistencia: MeetingUser[]) {
  if (asistencia.length === 0) {
    documento.parrafo("No hay participantes registrados.", {
      size: 9.5,
      color: COLOR_MUTED,
    });
    return;
  }

  const { doc } = documento;
  const separacion = 18;
  const anchoColumna = (CONTENT_WIDTH - separacion) / 2;
  const altoFila = 14.5;
  const filas = Math.ceil(asistencia.length / 2);

  for (let fila = 0; fila < filas; fila++) {
    documento.asegurar(altoFila);

    for (let columna = 0; columna < 2; columna++) {
      const indice = columna * filas + fila;
      const participante = asistencia[indice];
      if (!participante) continue;

      const x = MARGIN_X + columna * (anchoColumna + separacion);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const estado =
        ETIQUETA_ASISTENCIA[participante.status] ||
        participante.status ||
        "Pendiente";
      doc.setTextColor(...(COLOR_ASISTENCIA[participante.status] ?? COLOR_MUTED));
      doc.text(estado.toUpperCase(), x + anchoColumna, documento.y, {
        align: "right",
      });
      const anchoEstado = doc.getTextWidth(estado.toUpperCase());

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text("\u2022", x, documento.y);

      doc.setTextColor(...COLOR_INK);
      const nombre = documento.acortar(
        participante.name || "Sin nombre",
        Math.max(30, anchoColumna - anchoEstado - 16)
      );
      doc.text(nombre, x + 10, documento.y);
    }

    documento.y += altoFila;
  }
}

/* -----------------------------------------
   Bloque de un consejo
   ----------------------------------------- */
function dibujarConsejo(
  documento: Documento,
  consejo: Meeting,
  haySiguiente: boolean
) {
  documento.tituloBloque(consejo.title || "Consejo sin título");

  const meta = [
    `Fecha: ${formatearFecha(consejo.meeting_date)}`,
    `Horario: ${formatearHora(consejo.start_time)} - ${formatearHora(consejo.end_time)}`,
    `Creado por: ${consejo.created_by_name || "--"}`,
    `Estado: ${etiquetaEstadoConsejo(consejo.status)}`,
  ].join("   \u00b7   ");

  documento.y += 3;
  documento.parrafo(meta, { size: 9, color: COLOR_MUTED, lineHeight: 12.5 });
  documento.y += 9;

  documento.etiqueta("Temas tratados");
  documento.parrafo(consejo.topics || "Sin temas registrados.");
  documento.y += 11;

  documento.etiqueta("Observaciones");
  documento.parrafo(
    consejo.notes && consejo.notes.trim() ? consejo.notes : "Sin observaciones."
  );
  documento.y += 11;

  const asistencia = consejo.attendees || [];
  documento.etiqueta(`Participantes (${asistencia.length})`);
  dibujarParticipantes(documento, asistencia);

  if (haySiguiente) documento.separador();
}

/* -----------------------------------------
   Documento
   ----------------------------------------- */
export async function construirPDFConsejos(
  meetings: Meeting[]
): Promise<JsPDFDocumento> {
  const consejos = (meetings || []).filter(Boolean);

  const documento = await crearDocumento({
    titulo: "Consejos",
    subtitulo: "Rama Arroyo Seco",
    detalle: `${consejos.length} ${
      consejos.length === 1 ? "consejo incluido" : "consejos incluidos"
    }`,
  });

  if (consejos.length === 0) {
    documento.parrafo("No se seleccionaron consejos para imprimir.", {
      size: 10,
      color: COLOR_MUTED,
    });
  } else {
    documento.resumen(
      `${consejos.length} ${
        consejos.length === 1 ? "consejo seleccionado" : "consejos seleccionados"
      }`,
      rangoDeFechas(consejos)
    );

    consejos.forEach((consejo, indice) => {
      dibujarConsejo(documento, consejo, indice < consejos.length - 1);
    });
  }

  documento.finalizar();

  return documento.doc;
}

/**
 * Construye el PDF de los consejos indicados y dispara su descarga.
 */
export async function generarPDFConsejos(meetings: Meeting[]): Promise<void> {
  const consejos = (meetings || []).filter(Boolean);
  const doc = await construirPDFConsejos(consejos);
  doc.save(nombreArchivo(consejos));
}
