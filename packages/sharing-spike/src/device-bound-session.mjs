// Synthetic integration only; identity/pin/revocation controllers never become routes.
import { createSyntheticSessionHarness } from './session-harness.mjs';
const denied=()=>({status:403,headers:{'Cache-Control':'no-store'},body:{error:'DENIED',mode:'SYNTHETIC_ONLY'}});
const fail=()=>{throw new Error('DENIED');};
const protectedPaths=new Set(['/invitations/create','/invitations/preview','/invitations/accept','/invitations/revoke','/access/check','/operations/context','/operations/execute','/operations/reconcile']);
export function createDeviceBoundSessionHarness({directory,...options}={}){
 if(directory?.mode!=='SYNTHETIC_ONLY'||typeof directory.withAuthorizedBinding!=='function')fail();
 const base=createSyntheticSessionHarness(options),bindings=new WeakMap(),pending=new Map();
 function state(){const d=directory.summary();if(d.suspended||options.authority.summary?.().suspended||(d.expectedJournalDomain&&d.expectedJournalDomain!==options.authority.sessionEpoch))fail();return d;}
 function exact(body,fields){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!==fields.sort().join(','))fail();}
 async function dispatch(request){
  let lease,checkedBinding=false;
  try{
   request=structuredClone(request);
   if(!request||!['/device-proof/begin','/device-proof/confirm',...protectedPaths,'/session'].includes(request.path))return base.dispatch(request);
   lease=base.captureSession(request);const snapshot=state();
   if(request.path==='/session'){const entry=bindings.get(lease.handle);if(entry){checkedBinding=true;if(entry.domain!==snapshot.domain)fail();await directory.authorize(entry.binding);base.validateSession(lease);}return base.dispatch(request);}
   if(request.path==='/device-proof/begin'){
    exact(request.body,['binding']);const binding=structuredClone(request.body.binding);
    if(binding?.payload?.subject!==lease.subject||binding?.payload?.device!==lease.device)fail();
    for(const [id,value]of pending)if((options.now||Date.now)()>=value.expiresAt)pending.delete(id);
    if(pending.size>=100)fail();const challenge=await directory.begin(binding);
    base.validateSession(lease);const latest=state();if(latest.domain!==snapshot.domain||latest.revision!==snapshot.revision||pending.size>=100)fail();
    pending.set(challenge.challenge_id,{handle:lease.handle,binding,domain:snapshot.domain,expiresAt:challenge.expires_at});
    return {status:200,headers:{'Cache-Control':'no-store'},body:challenge};
   }
   if(request.path==='/device-proof/confirm'){
    exact(request.body,['response']);const response=structuredClone(request.body.response),entry=pending.get(response?.challenge_id);
    if(!entry||entry.handle!==lease.handle||entry.domain!==snapshot.domain)fail();pending.delete(response.challenge_id);
    // A session may disappear while Web Crypto awaits. The directory checks this hook before its SQL commit.
    const result=await directory.confirm(response,()=>base.validateSession(lease));
    base.validateSession(lease);const latest=state();if(latest.domain!==entry.domain)fail();
    bindings.set(lease.handle,{binding:entry.binding,domain:entry.domain});
    return {status:200,headers:{'Cache-Control':'no-store'},body:result};
   }
   const entry=bindings.get(lease.handle);if(!entry||entry.domain!==snapshot.domain)fail();checkedBinding=true;
   const result=await directory.withAuthorizedBinding(entry.binding,admission=>{
    base.validateSession(lease);
    if(request.path.startsWith('/operations/')){try{
      if(request.method!=='POST'||!admission||typeof options.authority.executeOperation!=='function')fail();
      let body;
      if(request.path==='/operations/context'){exact(request.body,[]);body={journalDomain:options.authority.sessionEpoch,directoryDomain:admission.domain};}
      else {const context={device:lease.device,bindingHash:admission.bindingHash,directoryDomain:admission.domain,directoryRevision:admission.revision};
        body=options.authority[request.path==='/operations/execute'?'executeOperation':'reconcileOperation'](lease.subject,context,request.body);}
      return {status:200,headers:{'Cache-Control':'no-store'},body};
    }catch{return denied();}}
    return base.dispatch(request);
   });
   // Recheck after asynchronous admission before returning any result to this session.
   base.validateSession(lease);return result;
  }catch{if(lease&&checkedBinding){bindings.delete(lease.handle);base.invalidateSession(lease);}return denied();}
 }
 return Object.freeze({mode:'SYNTHETIC_ONLY',origin:base.origin,issueSyntheticCode:base.issueSyntheticCode,dispatch});
}
