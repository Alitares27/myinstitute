import FormModal from "./FormModal";
import { useTheme } from "../context/ContextoTema";
import { ACCENT_COLORS,DEFAULT_APPEARANCE } from "../shared/appearance";
import { IoCheckmarkOutline } from "react-icons/io5";
import "../styles/Appearance.css";

export default function AppearanceSettings({onClose}:{onClose:()=>void}){
  const {theme,preference,setPreference,appearance,setAppearance}=useTheme();
  const android=document.documentElement.classList.contains("native-android");
  const device=android&&appearance.deviceColors;
  return <FormModal title="Apariencia" onClose={onClose}>
    <div className="appearance-options">
      <p>Los cambios se aplican al instante y se guardan en este dispositivo.</p>
      <label className="form-group">Modo<select value={preference} onChange={e=>setPreference(e.target.value as "system"|"light"|"dark")}><option value="system">Tema del dispositivo</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
      {android&&<label className="appearance-device"><input type="checkbox" checked={appearance.deviceColors} onChange={e=>setAppearance({...appearance,deviceColors:e.target.checked})}/> Usar la paleta de Android</label>}
      {device&&<p className="text-muted">Los colores siguen la paleta del dispositivo. Desactiva esta opción para elegir otros.</p>}
      {([['buttonColor','Botones'],['iconColor','Iconos'],['fontColor','Texto']] as const).map(([key,label])=><fieldset key={key} disabled={device} className="appearance-colors"><legend>{label}: {device?"Android":appearance[key]<0?"Automático":ACCENT_COLORS[appearance[key]].name}</legend><div className="appearance-palette">{ACCENT_COLORS.map((color,index)=><button type="button" key={color.name} className="appearance-swatch" style={{background:color[theme],color:theme==="dark"?"#111":"#FFF"}} aria-label={`${label}: ${color.name}`} aria-pressed={appearance[key]===index} title={color.name} onClick={()=>setAppearance({...appearance,[key]:index})}>{appearance[key]===index&&<IoCheckmarkOutline aria-hidden="true"/>}</button>)}</div>{key==='fontColor'&&<button type="button" className="btn secondary" onClick={()=>setAppearance({...appearance,fontColor:-1})}>Automático</button>}</fieldset>)}
      <label className="form-group">Fuente<select value={appearance.font} onChange={e=>setAppearance({...appearance,font:e.target.value as typeof appearance.font})}><option value="system">Sistema</option><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monoespaciada</option></select></label>
      <label className="form-group">Tamaño del texto<select value={appearance.textSize} onChange={e=>setAppearance({...appearance,textSize:e.target.value as "normal"|"large"})}><option value="normal">Normal</option><option value="large">Grande</option></select></label>
      <div className="appearance-preview"><strong>Vista previa</strong><p>Así se verán las páginas, menús y formularios.</p><button type="button" className="btn primary"><IoCheckmarkOutline aria-hidden="true"/>Botón</button><button type="button" className="btn secondary btn-icon" aria-label="Ejemplo de icono"><IoCheckmarkOutline aria-hidden="true"/></button></div>
      <button type="button" className="btn secondary" onClick={()=>{setAppearance({...DEFAULT_APPEARANCE});setPreference("system");}}>Restablecer</button>
    </div>
  </FormModal>;
}
