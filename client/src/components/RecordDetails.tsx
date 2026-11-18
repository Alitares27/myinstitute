import type { ReactNode } from "react";
import { IoEyeOutline } from "react-icons/io5";
import FormModal from "./FormModal";

export function ViewRecordButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn secondary btn-icon" aria-label={label} title={label} onClick={onClick}>
      <IoEyeOutline aria-hidden="true" />
    </button>
  );
}

export function RecordDetails({ title, fields, onClose }: {
  title: string;
  fields: Array<[string, ReactNode]>;
  onClose: () => void;
}) {
  return (
    <FormModal title={title} onClose={onClose}>
      <dl className="record-details">
        {fields.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>
        ))}
      </dl>
    </FormModal>
  );
}
