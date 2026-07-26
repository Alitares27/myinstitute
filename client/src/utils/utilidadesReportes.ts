
const LOGO_URL = `${window.location.origin}/temple.webp`;
const CURRENT_YEAR = new Date().getFullYear();

export const reportBaseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    padding: 30px 30px 50px 30px;
    color: #333;
  }
  .report-header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 3px solid #444;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }
  .report-header img {
    width: 60px;
    height: 60px;
    object-fit: contain;
  }
  .report-header-text h1 {
    font-size: 1.4em;
    color: #222;
    margin: 0;
    text-align: left;
  }
  .report-header-text p {
    font-size: 0.85em;
    color: #666;
    margin-top: 2px;
  }
  h2 {
  font-size: 1.2em;
    margin-top: 30px;
    border-bottom: 2px solid #ccc;
    padding-bottom: 5px;
    color: #444;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 9px 10px;
    text-align: left;
    font-size: 0.92em;
  }
  th { background-color: #f4f4f4; font-weight: bold; }
  tfoot tr td { background: #efefef; font-weight: bold; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .date-header { color: #666; font-style: italic; margin-bottom: 20px; }
  .summary-box {
    padding: 14px 18px;
    display: inline-block;
    font-size: 1em;
    font-weight: bold;
  }

  .report-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 8px 30px;
    border-top: 1px solid #ccc;
    background: #fff;
    font-size: 0.78em;
    color: #666;
  }
  .report-footer img {
    width: 22px;
    height: 22px;
    object-fit: contain;
    opacity: 0.7;
  }
  @media print {
    .report-footer { position: fixed; bottom: 0; }
  }
`;

export function reportHeader(title: string, subtitle?: string): string {
  return `
    <div class="report-header">
      <img src="${LOGO_URL}" alt="GestionAR Logo" />
      <div class="report-header-text">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
    </div>
  `;
}

export function reportFooter(): string {
  return `
    <div class="report-footer">
      <img src="${LOGO_URL}" alt="Logo" />
      <span>GestionAR &copy; ${CURRENT_YEAR} &mdash; Todos los derechos reservados</span>
    </div>
  `;
}

export function buildReportDocument(title: string, subtitle: string, bodyContent: string): string {
  return `
    <html>
    <head>
      <title>${title}</title>
      <style>${reportBaseStyles}</style>
    </head>
    <body>
      ${reportHeader(title, subtitle)}
      ${bodyContent}
      ${reportFooter()}
    </body>
    </html>
  `;
}

export function openPrintWindow(title: string, subtitle: string, bodyContent: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(buildReportDocument(title, subtitle, bodyContent));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}
