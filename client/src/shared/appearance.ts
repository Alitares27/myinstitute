export const ACCENT_COLORS = [
  {name:"Azul",light:"#0066D6",dark:"#70AEFF"},
  {name:"Índigo",light:"#5146BD",dark:"#ADA2FF"},
  {name:"Violeta",light:"#7937B5",dark:"#D29CFF"},
  {name:"Rosa",light:"#A52B70",dark:"#FF9CCC"},
  {name:"Rojo",light:"#B3261E",dark:"#FF9B91"},
  {name:"Naranja",light:"#A94300",dark:"#FFB47C"},
  {name:"Ámbar",light:"#805B00",dark:"#F0CD60"},
  {name:"Lima",light:"#50711B",dark:"#B5D777"},
  {name:"Verde",light:"#167044",dark:"#83D9A5"},
  {name:"Turquesa",light:"#006B60",dark:"#74D9C8"},
  {name:"Cian",light:"#006B80",dark:"#80D4EA"},
  {name:"Grafito",light:"#425466",dark:"#B7CADD"},
] as const;
export const FONT_FAMILIES={system:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',sans:'Arial, Helvetica, sans-serif',serif:'Georgia, "Times New Roman", serif',mono:'"SFMono-Regular", Consolas, monospace'};
export type Appearance={buttonColor:number;iconColor:number;fontColor:number;font:keyof typeof FONT_FAMILIES;textSize:"normal"|"large";deviceColors:boolean};
export const DEFAULT_APPEARANCE:Appearance={buttonColor:0,iconColor:0,fontColor:-1,font:"system",textSize:"normal",deviceColors:true};
export function readAppearance():Appearance{
  try{const value=JSON.parse(localStorage.getItem("appearance")||"null");if(!value)return {...DEFAULT_APPEARANCE};return {
    buttonColor:Number.isInteger(value.buttonColor)&&value.buttonColor>=0&&value.buttonColor<12?value.buttonColor:0,
    iconColor:Number.isInteger(value.iconColor)&&value.iconColor>=0&&value.iconColor<12?value.iconColor:0,
    fontColor:Number.isInteger(value.fontColor)&&value.fontColor>=0&&value.fontColor<12?value.fontColor:-1,
    font:Object.prototype.hasOwnProperty.call(FONT_FAMILIES,value.font)?value.font:"system",
    textSize:value.textSize==="large"?"large":"normal",deviceColors:value.deviceColors!==false,
  };}catch{return {...DEFAULT_APPEARANCE};}
}
