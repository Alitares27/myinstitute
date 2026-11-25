import type {SpeakerRecord} from '../interfaces/Speaker';
import {parseLocalDate} from './utilidadesFecha';

type Selection={member_id:string;speech_title:string;speech_reference_id?:string;speech_url?:string};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const dayNumber=(value:string)=>{const date=parseLocalDate(value);return date?Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000:null;};
const canonicalUrl=(value?:string)=>{try{const url=new URL(value!);return url.hostname.replace(/^www\./,'')+url.pathname.replace(/\/$/,'');}catch{return null;}};
export function speakerSelectionWarnings(records:SpeakerRecord[],selection:Selection,editingId:number|null,today:string){
  const others=records.filter(record=>record.id!==editingId);
  const matching=others.filter(record=>{
    if(selection.speech_reference_id&&record.speech_reference_id&&String(record.speech_reference_id)===selection.speech_reference_id)return true;
    const selectedUrl=canonicalUrl(selection.speech_url),recordUrl=canonicalUrl(record.speech_url);
    if(selectedUrl&&recordUrl&&selectedUrl===recordUrl)return true;
    // Separate catalog references may share a title. Only use the title for legacy/free-text matches.
    if((selection.speech_reference_id&&record.speech_reference_id)||(selectedUrl&&recordUrl))return false;
    return Boolean(normalize(selection.speech_title))&&normalize(selection.speech_title)===normalize(record.speech_title||'');
  });
  const latest=(rows:SpeakerRecord[])=>[...rows].sort((a,b)=>(dayNumber(b.date)??-Infinity)-(dayNumber(a.date)??-Infinity)||b.id-a.id)[0]??null;
  const now=dayNumber(today);
  const recent=others.filter(record=>{
    if(!selection.member_id||String(record.member_id)!==selection.member_id||now===null)return false;
    const date=dayNumber(record.date);return date!==null&&now-date>=0&&now-date<=30;
  });
  const recentMember=latest(recent);
  return {previousSpeech:latest(matching),recentMember,daysAgo:recentMember&&now!==null?now-dayNumber(recentMember.date)!:null};
}
