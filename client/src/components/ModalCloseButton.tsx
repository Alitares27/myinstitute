export default function ModalCloseButton({onClose,busy=false,label="Cerrar formulario"}:{onClose:()=>void;busy?:boolean;label?:string}){
  return <button type="button" className="btn secondary modal-close-control" aria-label={label} disabled={busy} onClick={onClose}><span className="modal-close-desktop" aria-hidden="true">×</span><span className="modal-close-mobile">Cerrar</span></button>;
}
