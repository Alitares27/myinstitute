export const ACCENT_COLORS = [
  {name:"Azul",color:"#0000FF",light:"#0000CC",dark:"#9999FF"},
  {name:"Azul violeta",color:"#4000FF",light:"#4000BB",dark:"#B599FF"},
  {name:"Violeta",color:"#8000FF",light:"#7000BB",dark:"#CC99FF"},
  {name:"Rojo violeta",color:"#C00080",light:"#990066",dark:"#FF99DD"},
  {name:"Rojo",color:"#FF0000",light:"#BB0000",dark:"#FF9999"},
  {name:"Rojo naranja",color:"#FF4000",light:"#A62A00",dark:"#FFB399"},
  {name:"Naranja",color:"#FF8000",light:"#995000",dark:"#FFCC99"},
  {name:"Amarillo naranja",color:"#FFBF00",light:"#805E00",dark:"#FFE699"},
  {name:"Amarillo",color:"#FFFF00",light:"#696900",dark:"#FFFF99"},
  {name:"Amarillo verde",color:"#80FF00",light:"#426600",dark:"#CCFF99"},
  {name:"Verde",color:"#00FF00",light:"#006600",dark:"#99FF99"},
  {name:"Azul verde",color:"#00A080",light:"#006650",dark:"#99FFDD"},
] as const;
export function swatchTextColor(hex:string){
  const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  return (luminance+.05)/.05>=1.05/(luminance+.05)?"#000000":"#FFFFFF";
}
export const FONT_FAMILIES={system:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',sans:'Arial, Helvetica, sans-serif',serif:'Georgia, "Times New Roman", serif',mono:'"SFMono-Regular", Consolas, monospace'};
export type Appearance={buttonColor:number;iconColor:number;fontColor:number;font:keyof typeof FONT_FAMILIES;textSize:"normal"|"large";deviceColors:boolean};
export const DEFAULT_APPEARANCE:Appearance={buttonColor:0,iconColor:0,fontColor:-1,font:"system",textSize:"normal",deviceColors:true};
export function readAppearance():Appearance{
  try{const value=JSON.parse(localStorage.getItem("appearance")||"null");if(!value)return {...DEFAULT_APPEARANCE};
    if(value.paletteVersion!==2){const mapping=[0,1,2,3,4,6,8,9,10,11,11,0];for(const key of ['buttonColor','iconColor','fontColor'])if(Number.isInteger(value[key])&&value[key]>=0&&value[key]<12)value[key]=mapping[value[key]];}
    return {
    buttonColor:Number.isInteger(value.buttonColor)&&value.buttonColor>=0&&value.buttonColor<12?value.buttonColor:0,
    iconColor:Number.isInteger(value.iconColor)&&value.iconColor>=0&&value.iconColor<12?value.iconColor:0,
    fontColor:Number.isInteger(value.fontColor)&&value.fontColor>=0&&value.fontColor<12?value.fontColor:-1,
    font:Object.prototype.hasOwnProperty.call(FONT_FAMILIES,value.font)?value.font:"system",
    textSize:value.textSize==="large"?"large":"normal",deviceColors:value.deviceColors!==false,
  };}catch{return {...DEFAULT_APPEARANCE};}
}
