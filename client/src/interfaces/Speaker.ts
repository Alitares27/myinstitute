export interface SpeakerRecord {
  id: number;
  member_id: number;
  member_name?: string;
  topic?: string;
  tema_id: number;
  speech_title: string;
  speech_reference_id?:number|null;
  speech_author?:string;
  speech_conference?:string;
  speech_url?:string;
  time: number;
  date: string;
  assigned: string;
  completed: string;
}
