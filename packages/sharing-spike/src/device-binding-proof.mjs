// Synthetic-only in-memory identity/device binding. Never a production key directory.
import { sealProof, openProof } from './hpke-proof.mjs';
const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
const fail=()=>{throw new Error('DEVICE_BINDING_REJECTED');};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const fp=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.sort().join(','))fail();}
const b64=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
function un64(s,n){if(typeof s!=='string'||s.length!==4*Math.ceil(n/3)||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))fail();const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));if(b.length!==n||b64(b)!==s)fail();return b;}
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const wire=p=>te.encode('WritingRoom synthetic device binding v1\n'+JSON.stringify(p));
export const createProofSigner=()=>crypto.subtle.generateKey('Ed25519',false,['sign','verify']);
export async function proofSignerCard(publicKey){const raw=new Uint8Array(await crypto.subtle.exportKey('raw',publicKey));return {public_key:b64(raw),fingerprint:await digest(raw)};}
async function normalized(binding){
 exact(binding,['format','version','payload','signer_public_key','signature']);
 if(binding.format!=='writingroom-synthetic-device-binding'||binding.version!==1)fail();
 const p=binding.payload;exact(p,['subject','device','binding_id','identity_fingerprint','encryption_key','issued_at','expires_at']);
 if(!id(p.subject)||!id(p.device)||!id(p.binding_id)||!fp(p.identity_fingerprint)||!Number.isSafeInteger(p.issued_at)||p.issued_at<0||!Number.isSafeInteger(p.expires_at)||p.expires_at<=p.issued_at||p.expires_at-p.issued_at>30*86400000)fail();
 const c=p.encryption_key;exact(c,['format','version','public_key','fingerprint']);
 if(c.format!=='writingroom-synthetic-hpke-key'||c.version!==1||await digest(un64(c.public_key,32))!==c.fingerprint)fail();
 if(await digest(un64(binding.signer_public_key,32))!==p.identity_fingerprint)fail();un64(binding.signature,64);
 return {subject:p.subject,device:p.device,binding_id:p.binding_id,identity_fingerprint:p.identity_fingerprint,encryption_key:{format:c.format,version:1,public_key:c.public_key,fingerprint:c.fingerprint},issued_at:p.issued_at,expires_at:p.expires_at};
}
export async function signDeviceBinding(signer,encryptionKey,{subject,device,issuedAt,expiresAt,bindingId=crypto.randomUUID()}){
 try{
  const key=structuredClone(encryptionKey),pair={publicKey:signer.publicKey,privateKey:signer.privateKey},card=await proofSignerCard(pair.publicKey);
  const payload={subject,device,binding_id:bindingId,identity_fingerprint:card.fingerprint,encryption_key:key,issued_at:issuedAt,expires_at:expiresAt};
  const binding={format:'writingroom-synthetic-device-binding',version:1,payload,signer_public_key:card.public_key,signature:b64(new Uint8Array(64))};
  const p=await normalized(binding);binding.payload=p;binding.signature=b64(new Uint8Array(await crypto.subtle.sign('Ed25519',pair.privateKey,wire(p))));return binding;
 }catch{fail();}
}
export async function verifyDeviceBinding(binding,{subject,device,identityFingerprint,now=Date.now()}={}){
 try{
  const copy=structuredClone(binding),p=await normalized(copy);
  if(!id(subject)||!id(device)||!fp(identityFingerprint)||p.subject!==subject||p.device!==device||p.identity_fingerprint!==identityFingerprint||!Number.isSafeInteger(now)||now<p.issued_at||now>=p.expires_at)fail();
  const key=await crypto.subtle.importKey('raw',un64(copy.signer_public_key,32),'Ed25519',false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',key,un64(copy.signature,64),wire(p)))fail();
  return {payload:p,hash:await digest(wire(p))};
 }catch{fail();}
}
const scope=(p,challenge)=>({device:p.device,project:'binding-proof',recipient:p.subject,transfer:challenge});
export async function answerDeviceChallenge(recipient,binding,challenge,{subject,device,identityFingerprint,now=Date.now()}={}){
 try{
  binding=structuredClone(binding);challenge=structuredClone(challenge);exact(challenge,['challenge_id','binding_hash','expires_at','envelope']);
  const p=binding.payload,v=await verifyDeviceBinding(binding,{subject,device,identityFingerprint,now});
  if(!id(challenge.challenge_id)||challenge.binding_hash!==v.hash||!Number.isSafeInteger(challenge.expires_at)||now>=challenge.expires_at||challenge.expires_at>p.expires_at||challenge.expires_at-now>300000)fail();
  const bytes=await openProof(recipient,challenge.envelope,scope(p,challenge.challenge_id));
  const plain=JSON.parse(td.decode(bytes));exact(plain,['challenge_id','binding_hash','expires_at','nonce']);
  if(plain.challenge_id!==challenge.challenge_id||plain.binding_hash!==v.hash||plain.expires_at!==challenge.expires_at)fail();un64(plain.nonce,32);
  return {challenge_id:challenge.challenge_id,binding_hash:v.hash,proof:plain.nonce};
 }catch{fail();}
}
export function createDeviceBindingVerifier({pins,now=Date.now}={}){
 if(!Array.isArray(pins)||!pins.length||pins.length>100||pins.some(p=>!id(p.subject)||!fp(p.fingerprint))||new Set(pins.map(p=>p.subject)).size!==pins.length)fail();
 const trusted=new Map(pins.map(p=>[p.subject,p.fingerprint])),revokedIdentities=new Set(),revokedBindings=new Set(),pending=new Map(),active=new Map();
 const slot=p=>p.subject+'|'+p.device;
 function prune(){for(const [key,c] of pending)if(now()>=c.expires_at)pending.delete(key);}
 function guard(v){if(revokedIdentities.has(v.payload.subject)||revokedBindings.has(v.hash)||(active.has(slot(v.payload))&&active.get(slot(v.payload)).hash!==v.hash))fail();}
 async function check(binding){const p=binding?.payload;if(!p||revokedIdentities.has(p.subject))fail();const v=await verifyDeviceBinding(binding,{subject:p.subject,device:p.device,identityFingerprint:trusted.get(p.subject),now:now()});guard(v);return v;}
 async function begin(binding){
  try{
   prune();binding=structuredClone(binding);const v=await check(binding);if(pending.size>=100)fail();
   const challenge_id=crypto.randomUUID(),expires_at=Math.min(now()+300000,v.payload.expires_at),nonce=b64(crypto.getRandomValues(new Uint8Array(32)));
   const plain={challenge_id,binding_hash:v.hash,expires_at,nonce};
   const envelope=await sealProof(v.payload.encryption_key,te.encode(JSON.stringify(plain)),scope(v.payload,challenge_id));
   const nonceHash=await digest(te.encode(nonce));await check(binding);guard(v);if(pending.size>=100||now()>=expires_at)fail();
   pending.set(challenge_id,{binding,hash:v.hash,expires_at,nonceHash});
   return {challenge_id,binding_hash:v.hash,expires_at,envelope};
  }catch{fail();}
 }
 async function confirm(response){
  try{
   prune();response=structuredClone(response);exact(response,['challenge_id','binding_hash','proof']);
   const c=pending.get(response.challenge_id);if(!c)fail();
   // Claim synchronously before awaits: concurrent confirmations cannot both commit.
   pending.delete(response.challenge_id);
   const proof=un64(response.proof,32);const v=await check(c.binding);
   if(response.binding_hash!==c.hash||await digest(te.encode(b64(proof)))!==c.nonceHash)fail();
   await check(c.binding);if(now()>=c.expires_at)fail();
   guard(v);if(!active.has(slot(v.payload))&&active.size>=1000)fail();
   active.set(slot(v.payload),{hash:c.hash,binding:structuredClone(c.binding)});
   return {binding_hash:c.hash,subject:v.payload.subject,device:v.payload.device};
  }catch{fail();}
 }
 async function authorize(binding){try{binding=structuredClone(binding);const v=await check(binding);if(active.get(slot(v.payload))?.hash!==v.hash)fail();return {subject:v.payload.subject,device:v.payload.device,binding_hash:v.hash};}catch{fail();}}
 function revokeBinding(hash){if(!fp(hash))fail();revokedBindings.add(hash);for(const [k,v] of active)if(v.hash===hash)active.delete(k);for(const [k,v] of pending)if(v.hash===hash)pending.delete(k);}
 function revokeIdentity(subject){if(!trusted.has(subject))fail();revokedIdentities.add(subject);for(const [k,v] of active)if(v.binding.payload.subject===subject)active.delete(k);for(const [k,v] of pending)if(v.binding.payload.subject===subject)pending.delete(k);}
 return Object.freeze({mode:'SYNTHETIC_ONLY',begin,confirm,authorize,revokeBinding,revokeIdentity});
}
