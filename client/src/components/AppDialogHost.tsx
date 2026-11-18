import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DialogRequest = { id: number; message: string; confirm: boolean; resolve?: (value: boolean) => void };
type DialogEvent = CustomEvent<Omit<DialogRequest, "id">>;

export function showAppMessage(message: string) {
  window.dispatchEvent(new CustomEvent("app:dialog", { detail: { message, confirm: false } }));
}

export function confirmAppAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("app:dialog", { detail: { message, confirm: true, resolve } }));
  });
}

export default function AppDialogHost() {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  useEffect(() => {
    const nativeAlert = window.alert.bind(window);
    window.alert = (message?: unknown) => showAppMessage(String(message ?? ""));
    const onDialog = (event: Event) => {
      const detail = (event as DialogEvent).detail;
      setDialog({ ...detail, id: Date.now() + Math.random() });
    };
    window.addEventListener("app:dialog", onDialog);
    return () => {
      window.removeEventListener("app:dialog", onDialog);
      window.alert = nativeAlert;
    };
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(false);
        return;
      }
      if (event.key === "Tab") {
        const dialogEl = document.querySelector(".ios-dialog") as HTMLElement | null;
        if (!dialogEl) return;
        const focusables = Array.from(dialogEl.querySelectorAll<HTMLElement>("button:not(:disabled)"));
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

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [dialog]);

  function close(accepted: boolean) {
    if (!dialog) return;
    dialog.resolve?.(accepted);
    setDialog(null);
  }

  if (!dialog) return null;
  return createPortal(
    <div className="ios-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) close(false); }}>
      <section className="ios-dialog" role="alertdialog" aria-modal="true" aria-describedby="ios-dialog-message" key={dialog.id}>
        <p id="ios-dialog-message">{dialog.message}</p>
        <div className="ios-dialog-actions">
          {dialog.confirm && <button type="button" className="ios-dialog-cancel" onClick={() => close(false)}>Cancelar</button>}
          <button type="button" className={dialog.confirm ? "ios-dialog-destructive" : "ios-dialog-primary"} autoFocus onClick={() => close(true)}>
            {dialog.confirm ? "Confirmar" : "Aceptar"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
