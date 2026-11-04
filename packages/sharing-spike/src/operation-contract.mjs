// Synthetic operation contract. Canonical request hashes never include plaintext invite tokens.
import {createHash} from 'node:crypto';
const fail=()=>{throw new Error('DENIED');};
const hash=v=>createHash('sha256').update(v).digest('hex');
export const operationId=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.sort().join(','))fail();}
export function operationContext(c){exact(c,['device','bindingHash','directoryDomain','directoryRevision']);if(!id(c.device)||!hex(c.bindingHash)||!operationId(c.directoryDomain)||!Number.isSafeInteger(c.directoryRevision)||c.directoryRevision<0)fail();return structuredClone(c);}
function canonical(action,input,stored=false){
 if(action==='invite'){
  exact(input,['projectId','recipient','scope','capabilities','expiresAt']);
  if(!id(input.projectId)||!id(input.recipient)||!Array.isArray(input.scope)||!input.scope.length||input.scope.length>200||input.scope.some(v=>!id(v))||new Set(input.scope).size!==input.scope.length||!Array.isArray(input.capabilities)||!input.capabilities.includes('read')||input.capabilities.some(v=>!['read','propose'].includes(v))||new Set(input.capabilities).size!==input.capabilities.length||!Number.isSafeInteger(input.expiresAt)||input.expiresAt<0)fail();
  return {projectId:input.projectId,recipient:input.recipient,scope:[...input.scope].sort(),capabilities:[...input.capabilities].sort(),expiresAt:input.expiresAt};
 }
 if(action==='accept'){
  exact(input,stored?['tokenHash','explicit']:['token','explicit']);const tokenHash=stored?input.tokenHash:typeof input.token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(input.token)?hash(input.token):null;
  if(!hex(tokenHash)||input.explicit!==true)fail();return {tokenHash,explicit:true};
 }
 if(action==='revoke'){exact(input,['projectId','invitationId']);if(!id(input.projectId)||!operationId(input.invitationId))fail();return {projectId:input.projectId,invitationId:input.invitationId};}
 fail();
}
export function operationRequest(request){
 exact(request,['operationId','journalDomain','directoryDomain','action','input']);
 if(!operationId(request.operationId)||!operationId(request.journalDomain)||!operationId(request.directoryDomain))fail();
 const clean=canonical(request.action,request.input);return {...structuredClone(request),requestHash:hash(JSON.stringify({action:request.action,input:clean}))};
}
export function validateOperationEvent(event,seen){
 const op=event.operation;exact(op,['id','device','bindingHash','journalDomain','directoryDomain','directoryRevision','requestHash']);
 if(!id(event.actor)||!operationId(op.id)||!operationId(op.journalDomain)||!hex(op.requestHash))fail();
 operationContext({device:op.device,bindingHash:op.bindingHash,directoryDomain:op.directoryDomain,directoryRevision:op.directoryRevision});
 const input=event.action==='accept'?{tokenHash:event.tokenHash,explicit:true}:event.action==='revoke'?{projectId:event.projectId,invitationId:event.invitationId}:event.input;
 if(hash(JSON.stringify({action:event.action,input:canonical(event.action,input,true)}))!==op.requestHash)fail();
 const key=event.actor+'|'+op.id;if(seen.has(key))fail();seen.add(key);
}
export function operationReceipt(snapshot,row,now){
 const event=JSON.parse(row.payload),op=event.operation;
 const invite=event.action==='invite'?event:snapshot.events.map(r=>JSON.parse(r.payload)).find(e=>e.action==='invite'&&(event.action==='accept'?e.tokenHash===event.tokenHash:e.invitationId===event.invitationId));if(!invite)fail();
 const events=snapshot.events.map(r=>JSON.parse(r.payload));
 const accepted=events.find(e=>e.action==='accept'&&e.tokenHash===invite.tokenHash);
 const revoked=events.some(e=>e.action==='revoke'&&e.invitationId===invite.invitationId);
 const effect=revoked?'revoked':now>=invite.input.expiresAt?'expired':accepted?'accepted':'pending';
 return {operationId:op.id,receiptId:row.checksum,action:event.action,sequence:row.sequence,journalDomain:op.journalDomain,directoryDomain:op.directoryDomain,directoryRevision:op.directoryRevision,invitationId:invite.invitationId,...(event.action==='accept'?{grantId:event.grantId}:{}),effect};
}
