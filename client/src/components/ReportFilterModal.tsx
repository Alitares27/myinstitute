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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !printing) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
    <div className="modal-overlay report-filter-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !printing) onClose(); }}>
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
            <button type="button" className="report-filter-cancel" onClick={onClose} disabled={printing}>Cancelar</button>
            <button type="submit" className="report-filter-submit" disabled={printing}>
              <IoPrintOutline aria-hidden="true" /> {printing ? "Preparando…" : "Imprimir"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
