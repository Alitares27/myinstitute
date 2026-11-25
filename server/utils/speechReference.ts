import { pool } from "../models/db";
import { InputError } from "./validation";

export function officialSpeechUrl(value:unknown){
  if(typeof value!=='string'||value.length>1000)throw new InputError('Ingresa un enlace oficial de Conferencia General.');
  let url:URL;try{url=new URL(value);}catch{throw new InputError('El enlace no es válido.');}
  if(url.protocol!=='https:'||!['www.churchofjesuschrist.org','churchofjesuschrist.org'].includes(url.hostname)||url.username||url.password||url.port||!/^\/study\/general-conference\/\d{4}\/(04|10)\/[a-z0-9-]+\/?$/i.test(url.pathname))throw new InputError('Usa el enlace de un discurso de Conferencia General del sitio oficial.');
  return `https://www.churchofjesuschrist.org${url.pathname.replace(/\/$/,'')}?lang=spa`;
}
export async function selectedSpeechReference(value:unknown){
  if(value===undefined||value===null||value==='')return null;
  const id=Number(value);if(!Number.isSafeInteger(id)||id<=0)throw new InputError('Referencia de discurso inválida.');
  const reference=(await pool.query('SELECT * FROM speech_references WHERE id=$1',[id])).rows[0];
  if(!reference)throw new InputError('La referencia seleccionada ya no existe.');
  return reference;
}
