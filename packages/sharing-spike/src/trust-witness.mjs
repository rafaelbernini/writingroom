// Synthetic independent witness. Must not be stored/restored in the directory's trust domain in production.
import {createHash,randomUUID} from 'node:crypto';
import {open,lstat,realpath,unlink} from 'node:fs/promises';
import path from 'node:path';
import {calculateJwkThumbprint} from 'jose';
import {directoryCheckpoint} from './directory-checkpoint.mjs';
const fail=()=>{throw new Error('TRUST_WITNESS_REJECTED');};
const hash=v=>createHash('sha256').update(v).digest('hex');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateWitnessRecord(r){
 if(!r||Object.keys(r).sort().join(',')!=='anchorId,checkpoint,epoch,fingerprint,journalDomain,recoveryKey,sequence,subject'||!uuid(r.anchorId)||!Number.isSafeInteger(r.sequence)||r.sequence<0||!Number.isSafeInteger(r.epoch)||r.epoch<0||r.epoch>r.sequence||!id(r.subject)||!hex(r.fingerprint)||!uuid(r.journalDomain)||!r.checkpoint||Object.keys(r.checkpoint).sort().join(',')!=='domain,hash,revision'||!uuid(r.checkpoint.domain)||!Number.isSafeInteger(r.checkpoint.revision)||r.checkpoint.revision<0||!hex(r.checkpoint.hash))fail();
 const k=r.recoveryKey;if(!k||Object.keys(k).sort().join(',')!=='alg,crv,kid,kty,use,x,y'||k.alg!=='ES256'||k.kty!=='EC'||k.crv!=='P-256'||k.use!=='sig'||!uuid(k.kid)||typeof k.x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(k.x)||typeof k.y!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(k.y))fail();
}
export async function createTrustWitness(file,{directory,journal,subject,expectedFingerprint,recoveryKey,expectedRecoveryThumbprint}={}){
 const s=directory.summary(),j=journal.summary(),cp=directoryCheckpoint(s),key=structuredClone(recoveryKey);
 if(s.suspended||s.revision!==0||s.bindings.length||s.revokedHashes.length||s.pins.length!==1||s.pins[0].subject!==subject||s.pins[0].fingerprint!==expectedFingerprint||s.pins[0].revoked||j.suspended||j.events!==0||await calculateJwkThumbprint(key)!==expectedRecoveryThumbprint)fail();
 journal.withEmptyDomain(j.domain,subject,()=>true);
 const record={anchorId:randomUUID(),sequence:0,epoch:0,subject,fingerprint:expectedFingerprint,journalDomain:j.domain,checkpoint:cp,recoveryKey:key};validateWitnessRecord(record);
 const out=path.join(await realpath(path.dirname(path.resolve(file))),path.basename(file)),fd=await open(out,'wx',0o600);await fd.close();let db;
 try{const {DatabaseSync}=await import('node:sqlite');db=new DatabaseSync(out);db.exec('PRAGMA synchronous=FULL;BEGIN IMMEDIATE;CREATE TABLE witness(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,checksum TEXT NOT NULL);PRAGMA user_version=1;');const payload=JSON.stringify(record);db.prepare('INSERT INTO witness VALUES (1,?,?)').run(payload,hash(payload));db.exec('COMMIT');db.close();db=undefined;const f=await open(out,'r');try{await f.sync();}finally{await f.close();}const parent=await open(path.dirname(out),'r');try{await parent.sync();}finally{await parent.close();}return openTrustWitness(out);}catch(e){db?.close();await unlink(out);throw e;}
}
export async function openTrustWitness(file){
 const stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1_000_000)fail();
 const {DatabaseSync}=await import('node:sqlite'),db=new DatabaseSync(file);let closed=false,reserved=false;
 function inspect(){if(closed||db.prepare('PRAGMA user_version').get().user_version!==1||db.prepare('PRAGMA quick_check').get().quick_check!=='ok')fail();const rows=db.prepare('SELECT * FROM witness').all();if(rows.length!==1||rows[0].id!==1||hash(rows[0].payload)!==rows[0].checksum)fail();const record=JSON.parse(rows[0].payload);validateWitnessRecord(record);return record;}
 try{db.exec('PRAGMA trusted_schema=OFF;PRAGMA busy_timeout=500;PRAGMA synchronous=FULL;');inspect();}catch(e){db.close();throw e;}
 function read(){if(reserved)fail();db.exec('BEGIN');try{const r=inspect();db.exec('COMMIT');return r;}catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}}
 function reserve(expected){
 if(reserved||closed)fail();db.exec('BEGIN IMMEDIATE');reserved=true;
 try{if(!same(inspect(),expected))fail();}catch(e){db.exec('ROLLBACK');reserved=false;throw e;}
 let done=false;
 const rollback=()=>{if(done)return;done=true;if(db.isTransaction)db.exec('ROLLBACK');reserved=false;};
 function update(next){if(done)fail();validateWitnessRecord(next);const payload=JSON.stringify(next);db.prepare('UPDATE witness SET payload=?,checksum=? WHERE id=1').run(payload,hash(payload));db.exec('COMMIT');done=true;reserved=false;return structuredClone(next);}
 return Object.freeze({rollback,
  readOnly(action){try{const result=action();if(result&&typeof result.then==='function')fail();db.exec('COMMIT');done=true;reserved=false;return result;}catch(e){rollback();throw e;}},
  advance(checkpoint){try{if(!checkpoint||checkpoint.domain!==expected.checkpoint.domain||checkpoint.revision!==expected.checkpoint.revision+1||!hex(checkpoint.hash))fail();return update({...expected,sequence:expected.sequence+1,checkpoint:structuredClone(checkpoint)});}catch(e){rollback();throw e;}},
  recover({checkpoint,fingerprint,journalDomain}){try{if(!checkpoint||checkpoint.domain===expected.checkpoint.domain||journalDomain===expected.journalDomain||fingerprint===expected.fingerprint)fail();return update({...expected,sequence:expected.sequence+1,epoch:expected.epoch+1,checkpoint:structuredClone(checkpoint),fingerprint,journalDomain});}catch(e){rollback();throw e;}}
 });
 }
 return Object.freeze({mode:'SYNTHETIC_TRUST_WITNESS',read,reserve,close(){if(!closed){if(db.isTransaction)db.exec('ROLLBACK');db.close();closed=true;}}});
}
