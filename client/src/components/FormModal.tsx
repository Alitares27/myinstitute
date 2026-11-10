import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export default function FormModal({ title, onClose, children, busy = false }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-overlay form-modal-overlay" onClick={event => {
      if (!busy && event.target === event.currentTarget) onClose();
    }}>
      <div className="modal-content form-modal" ref={dialog} tabIndex={-1}
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        onKeyDown={event => {
          if (event.key === "Escape" && !busy) {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex="0"]'
          )).filter(control => !control.matches(':disabled, [type="hidden"], [tabindex="-1"]') && control.getClientRects().length);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first || document.activeElement === dialog.current ||
            document.activeElement === (event.shiftKey ? first : last)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }}>
        <header className="form-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn secondary btn-icon modal-close-icon" aria-label="Cerrar formulario" disabled={busy} onClick={onClose}>×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
