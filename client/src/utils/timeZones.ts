const common=["UTC","America/Argentina/Buenos_Aires","America/Montevideo","America/Asuncion","America/Santiago","America/Lima","America/Bogota","America/La_Paz","America/Caracas","America/Mexico_City","America/New_York","America/Los_Angeles","Europe/Madrid","Europe/London","Europe/Rome","Asia/Tokyo","Australia/Sydney"];
export function timeZoneOptions(current:string){
  let supported:string[]=[];
  try{supported=(Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]}).supportedValuesOf?.("timeZone")??[];}catch{/* Older WebViews use the curated list. */}
  return [...new Set([...common,...supported,...(current?[current]:[])])].sort().map(value=>({value,label:value==="UTC"?"UTC — Tiempo universal":value.split("_").join(" ").split("/").join(" · ")}));
}
