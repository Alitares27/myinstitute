import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoPrintOutline } from "react-icons/io5";

export interface ReportFilterOption {
  value: string;
  label: string;
}

interface Props {
  title: string;
  description: string;
  label: string;
  allLabel: string;
  options: ReportFilterOption[];
  initialValue?: string;
  onClose: () => void;
  onPrint: (value: string) => void | Promise<void>;
}

export default function ReportFilterModal({ title, description, label, allLabel, options, initialValue = "", onClose, onPrint }: Props) {
  const [value, setValue] = useState(initialValue);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const select = document.getElementById("report-filter-select") as HTMLSelectElement | null;
    select?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !printing) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const modal = document.querySelector(".report-filter-modal") as HTMLElement | null;
        if (!modal) return;
        const focusables = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]'
          )
        ).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose, printing]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPrinting(true);
    try {
      await onPrint(value);
      onClose();
    } finally {
      setPrinting(false);
    }
  }

  return createPortal(
    <div className="modal-overlay report-filter-overlay" onClick={(event) => { if (event.target === event.currentTarget && !printing) onClose(); }}>
      <section className="report-filter-modal" role="dialog" aria-modal="true" aria-labelledby="report-filter-title">
        <div className="report-filter-icon"><IoPrintOutline aria-hidden="true" /></div>
        <h2 id="report-filter-title">{title}</h2>
        <p>{description}</p>
        <form onSubmit={submit}>
          <label htmlFor="report-filter-select">{label}</label>
          <select id="report-filter-select" value={value} onChange={(event) => setValue(event.target.value)} disabled={printing}>
            <option value="">{allLabel}</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="report-filter-actions">
            <button type="button" className="report-filter-cancel" onClick={onClose} disabled={printing} style={{ minHeight: "44px" }}>Cancelar</button>
            <button type="submit" className="report-filter-submit" disabled={printing} style={{ minHeight: "44px" }}>
              <IoPrintOutline aria-hidden="true" /> {printing ? "Preparando…" : "Imprimir"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
