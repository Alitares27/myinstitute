import { lockBodyScroll } from "../../utils/scrollLock";
import {useEffect,useRef} from "react";
import type {ReactNode} from "react";
export default function MemberModal({children,onClose}:{children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const unlockScroll=lockBodyScroll();
  ref.current?.focus();
  function keyboard(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();close.current();}
   if(event.key!=='Tab')return;
   const controls=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')||[]);
   const first=controls[0],last=controls[controls.length-1];
   if(!first){event.preventDefault();return;}
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',keyboard);
  return()=>{document.removeEventListener('keydown',keyboard);unlockScroll();previous?.focus();};
 },[]);
 return <div className="miembros-modal-overlay" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="miembros-modal" role="dialog" aria-modal="true" aria-labelledby="miembros-modal-title" tabIndex={-1} ref={ref}>
   <header className="miembros-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 id="miembros-modal-title">Información del miembro</h2><button type="button" className="btn secondary btn-icon modal-close-icon" aria-label="Cerrar modal de miembro" onClick={onClose} style={{ minHeight: "44px", minWidth: "44px" }}>×</button></header>
   {children}
  </div>
 </div>;
}
