// Synthetic directory only. No private keys, accounts, manuscripts or HTTP routes.
import { randomUUID,createHash } from 'node:crypto';
import { open,lstat,readFile,unlink,realpath } from 'node:fs/promises';
import path from 'node:path';
import {directoryCheckpoint} from './directory-checkpoint.mjs';
import { createDeviceBindingVerifier,verifyDeviceBinding } from './device-binding-proof.mjs';
const fail=()=>{throw new Error('DIRECTORY_REJECTED');};
const digest=b=>createHash('sha256').update(b).digest('hex');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
async function sqlite(){try{return(await import('node:sqlite')).DatabaseSync;}catch{throw new Error('UNSUPPORTED_SQLITE');}}
async function regular(file){const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size>8_000_000)fail();}
async function target(file){const f=path.resolve(file);return path.join(await realpath(path.dirname(f)),path.basename(f));}
async function sync(file){const f=await open(file,'r');try{await f.sync();}finally{await f.close();}}
function inspect(db){
 if(db.prepare('PRAGMA user_version').get().user_version!==1||db.prepare('PRAGMA quick_check').get().quick_check!=='ok')fail();
 const meta=db.prepare('SELECT * FROM directory').all();if(meta.length!==1||meta[0].kind!=='writingroom-synthetic-device-directory-v1'||!Number.isSafeInteger(meta[0].revision)||meta[0].revision<0||![0,1].includes(meta[0].suspended))fail();
 const pins=db.prepare('SELECT * FROM pin').all(),bindings=db.prepare('SELECT * FROM binding').all(),revoked=db.prepare('SELECT hash FROM revoked_hash').all().map(r=>r.hash);
 if(revoked.length>1000||revoked.some(h=>!hex(h)))fail();
 createDeviceBindingVerifier({pins:pins.map(p=>({subject:p.subject,fingerprint:p.fingerprint}))});
 if(bindings.length>1000||pins.some(p=>![0,1].includes(p.revoked)))fail();
 for(const b of bindings){if(!hex(b.hash)||!['active','revoked'].includes(b.status)||Buffer.byteLength(b.json)>4096||digest(b.json)!==b.checksum||!pins.some(p=>p.subject===b.subject))fail();}
 return {meta:meta[0],pins,bindings,revoked};
}
function publicSummary(s){return {domain:s.meta.domain,revision:s.meta.revision,suspended:Boolean(s.meta.suspended),revokedHashes:[...s.revoked],pins:s.pins.map(p=>({...p,revoked:Boolean(p.revoked)})),bindings:s.bindings.map(({hash,subject,device,status})=>({hash,subject,device,status}))};}
async function verifyStored(snapshot){for(const b of snapshot.bindings){const binding=JSON.parse(b.json),pin=snapshot.pins.find(p=>p.subject===b.subject);const v=await verifyDeviceBinding(binding,{subject:b.subject,device:b.device,identityFingerprint:pin.fingerprint,now:binding.payload.issued_at});if(v.hash!==b.hash)fail();}}
function guard(s,binding,hash,now){
 if(s.meta.suspended)fail();const p=binding.payload,pin=s.pins.find(i=>i.subject===p.subject);
 if(!pin||pin.revoked||pin.fingerprint!==p.identity_fingerprint||now<p.issued_at||now>=p.expires_at)fail();
 if(s.revoked.includes(hash)||s.bindings.some(b=>b.hash===hash&&b.status==='revoked')||s.bindings.some(b=>b.subject===p.subject&&b.device===p.device&&b.status==='active'&&b.hash!==hash))fail();
}
export async function createDurableDeviceDirectory(file,pins){
 pins=structuredClone(pins);createDeviceBindingVerifier({pins});const Database=await sqlite(),out=await target(file);const fd=await open(out,'wx',0o600);await fd.close();let db;
 try{
  db=new Database(out);db.exec('PRAGMA synchronous=FULL; BEGIN IMMEDIATE; CREATE TABLE directory(kind TEXT NOT NULL,domain TEXT NOT NULL,revision INTEGER NOT NULL,suspended INTEGER NOT NULL); CREATE TABLE pin(subject TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,revoked INTEGER NOT NULL); CREATE TABLE binding(hash TEXT PRIMARY KEY,subject TEXT NOT NULL,device TEXT NOT NULL,json TEXT NOT NULL,checksum TEXT NOT NULL,status TEXT NOT NULL); CREATE TABLE revoked_hash(hash TEXT PRIMARY KEY); CREATE UNIQUE INDEX active_device ON binding(subject,device) WHERE status=\'active\'; PRAGMA user_version=1;');
  db.prepare('INSERT INTO directory VALUES (?,?,0,0)').run('writingroom-synthetic-device-directory-v1',randomUUID());
  for(const p of pins)db.prepare('INSERT INTO pin VALUES (?,?,0)').run(p.subject,p.fingerprint);
  db.exec('COMMIT');db.close();db=null;await sync(out);await sync(path.dirname(out));return openDurableDeviceDirectory(out);
 }catch(error){if(db?.isTransaction)db.exec('ROLLBACK');db?.close();await unlink(out);throw error;}
}
export async function openDurableDeviceDirectory(file,{now=Date.now,beforeCommit}={}){
 await regular(file);const Database=await sqlite(),db=new Database(file);let closed=false;const pending=new Map();
 function snapshot(){if(closed)fail();db.exec('BEGIN');try{const s=inspect(db);db.exec('COMMIT');return s;}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}}
 try{db.exec('PRAGMA trusted_schema=OFF;PRAGMA busy_timeout=500;');await verifyStored(snapshot());db.exec('PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;');}catch(error){db.close();throw error;}
 function mutate(revision,action){if(closed)fail();db.exec('BEGIN IMMEDIATE');try{const s=inspect(db);if(s.meta.suspended||s.meta.revision!==revision||!Number.isSafeInteger(revision))fail();const result=action(s);db.exec('UPDATE directory SET revision=revision+1');beforeCommit?.(Object.freeze({domain:s.meta.domain,revision:s.meta.revision,checkpointHash:directoryCheckpoint(publicSummary(s)).hash}));db.exec('COMMIT');return result;}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}}
 const api={mode:'SYNTHETIC_ONLY',
  summary(){return publicSummary(snapshot());},
  async begin(binding){
   binding=structuredClone(binding);const s=snapshot(),p=binding?.payload,pin=s.pins.find(i=>i.subject===p?.subject);if(!pin)fail();
   const v=await verifyDeviceBinding(binding,{subject:p.subject,device:p.device,identityFingerprint:pin.fingerprint,now:now()});guard(s,binding,v.hash,now());
   for(const [key,value]of pending)if(now()>=value.challenge.expires_at)pending.delete(key);if(pending.size>=100)fail();
   const verifier=createDeviceBindingVerifier({pins:[{subject:pin.subject,fingerprint:pin.fingerprint}],now});const challenge=await verifier.begin(binding);
   const latest=snapshot();if(latest.meta.revision!==s.meta.revision)fail();guard(latest,binding,v.hash,now());if(pending.size>=100)fail();
   pending.set(challenge.challenge_id,{verifier,binding,hash:v.hash,revision:s.meta.revision,expires_at:challenge.expires_at});return structuredClone(challenge);
  },
  async confirm(response,beforeActivation){
   response=structuredClone(response);if(closed)fail();const c=pending.get(response?.challenge_id);if(!c)fail();pending.delete(response.challenge_id);
   const result=await c.verifier.confirm(response);const json=JSON.stringify(c.binding);if(Buffer.byteLength(json)>4096)fail();
   return mutate(c.revision,s=>{guard(s,c.binding,c.hash,now());if(now()>=c.expires_at)fail();beforeActivation?.();const previous=s.bindings.find(b=>b.hash===c.hash);
    if(!previous){if(s.bindings.length>=1000)fail();db.prepare('INSERT INTO binding VALUES (?,?,?,?,?,?)').run(c.hash,result.subject,result.device,json,digest(json),'active');}return result;
   });
  },
  async authorize(binding){
   binding=structuredClone(binding);const s=snapshot(),p=binding?.payload,pin=s.pins.find(i=>i.subject===p?.subject);if(!pin)fail();
   const v=await verifyDeviceBinding(binding,{subject:p.subject,device:p.device,identityFingerprint:pin.fingerprint,now:now()});
   const latest=snapshot();if(latest.meta.revision!==s.meta.revision)fail();guard(latest,binding,v.hash,now());if(!latest.bindings.some(b=>b.hash===v.hash&&b.status==='active'))fail();return {binding_hash:v.hash,subject:p.subject,device:p.device};
  },
  async withAuthorizedBinding(binding,action){
   binding=structuredClone(binding);const s=snapshot(),p=binding?.payload,pin=s.pins.find(i=>i.subject===p?.subject);if(!pin||typeof action!=='function')fail();
   const v=await verifyDeviceBinding(binding,{subject:p.subject,device:p.device,identityFingerprint:pin.fingerprint,now:now()});
   if(closed)fail();db.exec('BEGIN IMMEDIATE');
   try{const current=inspect(db);if(current.meta.revision!==s.meta.revision)fail();guard(current,binding,v.hash,now());if(!current.bindings.some(b=>b.hash===v.hash&&b.status==='active'))fail();
    const result=action(Object.freeze({domain:current.meta.domain,revision:current.meta.revision,bindingHash:v.hash,checkpointHash:directoryCheckpoint(publicSummary(current)).hash}));if(result&&typeof result.then==='function')fail();db.exec('COMMIT');return result;
   }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
  },
  revokeBinding(hash,{expectedRevision}={}){if(!hex(hash))fail();return mutate(expectedRevision,s=>{if(!s.revoked.includes(hash)){if(s.revoked.length>=1000)fail();db.prepare('INSERT INTO revoked_hash VALUES (?)').run(hash);}db.prepare("UPDATE binding SET status='revoked' WHERE hash=?").run(hash);});},
  revokeIdentity(subject,{expectedRevision}={}){return mutate(expectedRevision,s=>{if(!s.pins.some(p=>p.subject===subject))fail();db.prepare('UPDATE pin SET revoked=1 WHERE subject=?').run(subject);db.prepare("UPDATE binding SET status='revoked' WHERE subject=?").run(subject);});},
  async backup(destination){
   const out=await target(destination),fd=await open(out,'wx',0o600);await fd.close();try{db.prepare('VACUUM INTO ?').run(out);await sync(out);const check=new Database(out,{readOnly:true});try{await verifyStored(inspect(check));}finally{check.close();}await sync(path.dirname(out));return {checksum:digest(await readFile(out))};}catch(error){await unlink(out);throw error;}
  },
  close(){if(!closed){pending.clear();db.close();closed=true;}}
 };return Object.freeze(api);
}
export async function restoreDurableDeviceDirectory(backup,destination,checksum){
 await regular(backup);const bytes=await readFile(backup);if(!hex(checksum)||digest(bytes)!==checksum)fail();const Database=await sqlite(),out=await target(destination),fd=await open(out,'wx',0o600);let db;
 try{try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}db=new Database(out);db.exec('PRAGMA trusted_schema=OFF');await verifyStored(inspect(db));db.exec('PRAGMA synchronous=FULL;BEGIN IMMEDIATE');db.prepare('UPDATE directory SET domain=?,revision=revision+1,suspended=1').run(randomUUID());db.exec('COMMIT');db.close();db=null;await sync(out);await sync(path.dirname(out));return openDurableDeviceDirectory(out);}
 catch(error){db?.close();await unlink(out);throw error;}
}
