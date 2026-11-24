import { Children,Fragment,cloneElement,isValidElement,useEffect,useState } from "react";
import type { ReactElement,ReactNode,MouseEvent } from "react";
import { createPortal } from "react-dom";
import { IoEllipsisVerticalOutline,IoEyeOutline } from "react-icons/io5";
import FormModal from "./FormModal";
import { ViewRecordButton } from "./RecordDetails";

function flatten(children:ReactNode):ReactElement<any>[] {
  return Children.toArray(children).flatMap(child=>!isValidElement(child)?[]:child.type===Fragment?flatten((child.props as {children?:ReactNode}).children):String((child.props as any).className??"").includes("table-desktop-only")?[]:[child]);
}
function actionName(props:any){
  const label=String(props.label||props['aria-label']||props.title||'Acción');
  if(/ver/i.test(label))return 'Ver';if(/edit/i.test(label))return 'Editar';if(/elimin/i.test(label))return 'Eliminar';if(/archiv/i.test(label))return 'Archivar';if(/curso|asignar/i.test(label))return 'Asignar cursos';return label;
}
export default function RecordActions({children}:{children:ReactNode}){
  const compact=()=>document.documentElement.classList.contains('native-android')||window.matchMedia('(max-width: 700px)').matches;
  const [mobile,setMobile]=useState(compact),[open,setOpen]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(max-width: 700px)');const update=()=>{setMobile(compact());setOpen(false);};query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  if(!mobile)return <div className="table-record-actions">{children}</div>;
  const actions=flatten(children);
  if(!actions.length)return null;
  return <div className="table-record-actions record-actions-compact">
    <button type="button" className="btn secondary btn-icon" aria-label="Acciones del registro" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><IoEllipsisVerticalOutline aria-hidden="true"/></button>
    {open&&createPortal(<FormModal title="Acciones del registro" onClose={()=>setOpen(false)}><div className="record-actions-menu">
      {actions.map((child,index)=>{
        const props=child.props as any,label=actionName(props);
        const onClick=(event:MouseEvent)=>{setOpen(false);props.onClick?.(event);};
        if(child.type===ViewRecordButton)return <button type="button" key={index} className="btn secondary record-action-option" onClick={onClick}><IoEyeOutline aria-hidden="true"/><span>{label}</span></button>;
        return cloneElement(child,{key:index,className:`${String(props.className??'btn secondary').replace(/\bbtn-icon\b/g,'')} record-action-option`,onClick,children:<>{props.children}<span>{label}</span></>});
      })}
    </div></FormModal>,document.body)}
  </div>;
}
