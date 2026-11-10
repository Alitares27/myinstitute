import { Capacitor, registerPlugin } from "@capacitor/core";
import type { jsPDF } from "jspdf";

export const isAndroidApp = () => Capacitor.getPlatform() === "android";

export const AndroidReports = registerPlugin<{
  printHtml(options: { title: string; html: string }): Promise<void>;
  savePdf(options: { name: string; base64: string }): Promise<void>;
}>("AndroidReports");

export async function saveReportPdf(doc: jsPDF, name: string): Promise<void> {
  if (isAndroidApp()) {
    const base64 = doc.output("datauristring").split(",", 2)[1];
    await AndroidReports.savePdf({ name, base64 });
    return;
  }
  doc.save(name);
}
