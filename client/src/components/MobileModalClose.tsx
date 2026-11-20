export default function MobileModalClose({onClose,busy=false}:{onClose:()=>void;busy?:boolean}){
  return <footer className="modal-mobile-close"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>Cerrar</button></footer>;
}
