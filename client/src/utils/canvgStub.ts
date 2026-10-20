/**
 * Sustituto mínimo de la dependencia opcional "canvg".
 *
 * jsPDF la importa de forma dinámica únicamente para `doc.html()`, que
 * convierte HTML a imagen usando un canvas. La aplicación no utiliza esa
 * función (sólo genera texto e imágenes JPEG), pero Rollup intenta resolver la
 * dependencia durante el build y falla porque es opcional.
 *
 * El alias se configura en `vite.config.ts`.
 */
export default class CanvgStub {
  static fromString() {
    return {
      render: () => Promise.resolve(),
    };
  }

  render() {
    return Promise.resolve();
  }
}
