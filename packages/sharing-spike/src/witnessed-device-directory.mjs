// Fail-closed wrapper. A directory/witness crash gap requires explicit recovery, never auto-advance.
import {openDurableDeviceDirectory} from './durable-device-directory.mjs';
import {directoryCheckpoint} from './directory-checkpoint.mjs';
const fail=()=>{throw new Error('DIRECTORY_WITNESS_MISMATCH');};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function openWitnessedDeviceDirectory(file,witness,{now=Date.now,beforeWitnessCommit}={}){
 if(witness?.mode!=='SYNTHETIC_TRUST_WITNESS')fail();let pending,reservation,busy=false;
 const directory=await openDurableDeviceDirectory(file,{now,beforeCommit(admission){if(!pending||reservation||admission.domain!==pending.checkpoint.domain||admission.revision!==pending.checkpoint.revision||admission.checkpointHash!==pending.checkpoint.hash)fail();reservation=witness.reserve(pending);}});
 function current(){if(busy)fail();const summary=directory.summary(),record=witness.read();if(!same(directoryCheckpoint(summary),record.checkpoint)||summary.suspended||summary.pins.length!==1||summary.pins[0].subject!==record.subject||summary.pins[0].fingerprint!==record.fingerprint)fail();return {summary,record};}
 try{current();}catch(e){directory.close();throw e;}
 async function confirm(response,beforeActivation){
  const {record}=current();busy=true;pending=record;
  try{const result=await directory.confirm(response,beforeActivation);if(!reservation)fail();beforeWitnessCommit?.();reservation.advance(directoryCheckpoint(directory.summary()));return result;}catch(e){reservation?.rollback();throw e;}finally{pending=undefined;reservation=undefined;busy=false;}
 }
 function mutate(method,args){const {record}=current();busy=true;pending=record;try{const result=directory[method](...args);if(!reservation)fail();beforeWitnessCommit?.();reservation.advance(directoryCheckpoint(directory.summary()));return result;}catch(e){reservation?.rollback();throw e;}finally{pending=undefined;reservation=undefined;busy=false;}}
 return Object.freeze({mode:'SYNTHETIC_ONLY',
  summary(){const {summary,record}=current();return {...summary,expectedJournalDomain:record.journalDomain,trustEpoch:record.epoch};},
  async begin(binding){binding=structuredClone(binding);current();const result=await directory.begin(binding);current();return result;},
  confirm,
  async authorize(binding){binding=structuredClone(binding);const {record}=current();const result=await directory.withAuthorizedBinding(binding,a=>{if(a.checkpointHash!==record.checkpoint.hash)fail();return witness.reserve(record).readOnly(()=>({subject:binding.payload.subject,device:binding.payload.device,binding_hash:a.bindingHash}));});current();return result;},
  async withAuthorizedBinding(binding,action){binding=structuredClone(binding);const {record}=current();return directory.withAuthorizedBinding(binding,a=>{if(a.checkpointHash!==record.checkpoint.hash)fail();return witness.reserve(record).readOnly(()=>action(a));});},
  revokeBinding:(hash,options)=>mutate('revokeBinding',[hash,options]),
  revokeIdentity:(subject,options)=>mutate('revokeIdentity',[subject,options]),
  async backup(destination){current();return directory.backup(destination);},
  close(){reservation?.rollback();directory.close();}
 });
}
