/**
 * Generación del archivo PDF de actividades.
 */

import type { jsPDF as JsPDFDocumento } from "jspdf";
import type { Activity } from "../interfaces/Activity";
import { formatDate, formatDateTimeLong } from "./utilidadesFecha";
import {
  COLOR_MUTED,
  crearDocumento,
  quitarAcentos,
  type Documento,
} from "./pdfBase";

/* -----------------------------------------
   Utilidades de formato
   ----------------------------------------- */
const AREAS: Array<{ clave: keyof Activity; etiqueta: string }> = [
  { clave: "spiritual", etiqueta: "Espiritual" },
  { clave: "social", etiqueta: "Social" },
  { clave: "physical", etiqueta: "Físico" },
  { clave: "intellectual", etiqueta: "Intelectual" },
];

function areasDeActividad(actividad: Activity): string[] {
  return AREAS.filter((area) => Boolean(actividad[area.clave])).map(
    (area) => area.etiqueta
  );
}

function formatearPresupuesto(presupuesto?: number | null): string {
  if (presupuesto == null) return "--";
  return `$${Number(presupuesto).toLocaleString("es-AR")}`;
}

function formatearAsistencia(asistencia?: number | null): string {
  if (asistencia == null) return "--";
  return `${asistencia} ${asistencia === 1 ? "hermano" : "hermanos"}`;
}

function nombreArchivo(actividades: Activity[]): string {
  if (actividades.length === 1) {
    const titulo = quitarAcentos(actividades[0].activity_name || "actividad")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return `Actividad_${titulo || "actividad"}.pdf`;
  }

  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `Actividades_${hoy.getFullYear()}-${mes}-${dia}.pdf`;
}

function rangoDeFechas(actividades: Activity[]): string {
  const fechas = actividades
    .map((actividad) => actividad.activity_datetime)
    .filter(Boolean)
    .sort();

  if (fechas.length === 0) return "";

  const primera = formatDate(fechas[0]);
  const ultima = formatDate(fechas[fechas.length - 1]);

  return primera === ultima ? primera : `Del ${primera} al ${ultima}`;
}

/* -----------------------------------------
   Bloque de una actividad
   ----------------------------------------- */
function dibujarActividad(
  documento: Documento,
  actividad: Activity,
  haySiguiente: boolean
) {
  documento.tituloBloque(actividad.activity_name || "Actividad sin título", 110);

  const meta = [
    `Fecha: ${formatDateTimeLong(actividad.activity_datetime)}`,
    `Encargado: ${actividad.assigned_to_name || "--"}`,
    `Asistencia: ${formatearAsistencia(actividad.attendance)}`,
    `Presupuesto: ${formatearPresupuesto(actividad.budget)}`,
  ].join("   \u00b7   ");

  documento.y += 3;
  documento.parrafo(meta, { size: 9, color: COLOR_MUTED, lineHeight: 12.5 });
  documento.y += 9;

  documento.etiqueta("Propósito");
  documento.parrafo(
    actividad.purpose && actividad.purpose.trim()
      ? actividad.purpose
      : "Sin propósito registrado."
  );
  documento.y += 11;

  documento.etiqueta("Descripción");
  documento.parrafo(
    actividad.description && actividad.description.trim()
      ? actividad.description
      : "Sin descripción."
  );
  documento.y += 11;

  documento.etiqueta("Asignaciones");
  documento.parrafo(
    actividad.assignments && actividad.assignments.trim()
      ? actividad.assignments
      : "Sin asignaciones."
  );
  documento.y += 11;

  const areas = areasDeActividad(actividad);
  documento.etiqueta("Áreas");
  documento.parrafo(
    areas.length > 0 ? areas.join("   \u00b7   ") : "Sin áreas asignadas."
  );

  if (haySiguiente) documento.separador();
}

/* -----------------------------------------
   Documento
   ----------------------------------------- */
export async function construirPDFActividades(
  activities: Activity[]
): Promise<JsPDFDocumento> {
  const actividades = (activities || []).filter(Boolean);

  const documento = await crearDocumento({
    titulo: "Actividades",
    subtitulo: "Rama Arroyo Seco",
    detalle: `${actividades.length} ${
      actividades.length === 1 ? "actividad incluida" : "actividades incluidas"
    }`,
  });

  if (actividades.length === 0) {
    documento.parrafo("No se seleccionaron actividades para imprimir.", {
      size: 10,
      color: COLOR_MUTED,
    });
  } else {
    documento.resumen(
      `${actividades.length} ${
        actividades.length === 1
          ? "actividad seleccionada"
          : "actividades seleccionadas"
      }`,
      rangoDeFechas(actividades)
    );

    actividades.forEach((actividad, indice) => {
      dibujarActividad(documento, actividad, indice < actividades.length - 1);
    });
  }

  documento.finalizar();

  return documento.doc;
}

/**
 * Construye el PDF de las actividades indicadas y dispara su descarga.
 */
export async function generarPDFActividades(
  activities: Activity[]
): Promise<void> {
  const actividades = (activities || []).filter(Boolean);
  const doc = await construirPDFActividades(actividades);
  doc.save(nombreArchivo(actividades));
}
