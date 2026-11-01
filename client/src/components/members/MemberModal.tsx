import {useEffect,useRef} from "react";
import type {ReactNode} from "react";
import {IoCloseOutline} from "react-icons/io5";
export default function MemberModal({children,onClose}:{children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
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
  return()=>{document.removeEventListener('keydown',keyboard);document.body.style.overflow=overflow;previous?.focus();};
 },[]);
 return <div className="miembros-modal-overlay" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="miembros-modal" role="dialog" aria-modal="true" aria-labelledby="miembros-modal-title" tabIndex={-1} ref={ref}>
   <header className="miembros-modal-header"><h2 id="miembros-modal-title">Información del miembro</h2><button type="button" className="btn cancel-btn" aria-label="Cerrar ficha" title="Cerrar ficha" onClick={onClose}><IoCloseOutline aria-hidden="true"/></button></header>
   {children}
  </div>
 </div>;
}
