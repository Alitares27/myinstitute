import {Capacitor,registerPlugin} from '@capacitor/core';

const AndroidAutofill=registerPlugin<{commitLogin():Promise<void>}>('AndroidAutofill');
export async function completeLoginAutofill(){
  if(Capacitor.getPlatform()!=='android')return;
  // Android's selected provider owns credential storage. No credentials cross this bridge.
  try{await AndroidAutofill.commitLogin();}catch{/* Older installed apps may not have the native integration yet. */}
}
