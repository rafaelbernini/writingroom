// Private synthetic locator index. Witnesses supplied by independent trusted configuration remain authoritative.
import {createHash} from 'node:crypto';
import {open,lstat,realpath,unlink} from 'node:fs/promises';
import path from 'node:path';
import {validateWitnessRecord} from './trust-witness.mjs';
import {openWitnessedDeviceDirectory} from './witnessed-device-directory.mjs';
import {openDurableDeviceDirectory} from './durable-device-directory.mjs';
import {openDurableSyntheticAuthority} from './durable-authority.mjs';
import {directoryCheckpoint} from './directory-checkpoint.mjs';
const fail=()=>{throw new Error('SUBJECT_RECOVERY_MAP_REJECTED');};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
const schema='CREATE TABLE locators(subject TEXT NOT NULL,directory_domain TEXT NOT NULL UNIQUE,journal_domain TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,checksum TEXT NOT NULL,PRIMARY KEY(subject,directory_domain,journal_domain))';
const fields='anchorId,directoryDomain,directoryFile,epoch,fingerprint,journalDomain,journalFile,subject';
function projection(r){return {subject:r.subject,anchorId:r.anchorId,epoch:r.epoch,fingerprint:r.fingerprint,directoryDomain:r.checkpoint.domain,journalDomain:r.journalDomain};}
function reference(r){return {subject:r.subject,anchorId:r.anchorId,epoch:r.epoch,fingerprint:r.fingerprint,directoryDomain:r.directoryDomain,journalDomain:r.journalDomain};}
function locator(r,directoryFile,journalFile){return {...projection(r),directoryFile,journalFile};}
function validate(r){
 if(!r||Object.keys(r).sort().join(',')!==fields||typeof r.subject!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(r.subject)||!uuid(r.anchorId)||!Number.isSafeInteger(r.epoch)||r.epoch<0||typeof r.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(r.fingerprint)||!uuid(r.directoryDomain)||!uuid(r.journalDomain))fail();
 for(const file of [r.directoryFile,r.journalFile])if(typeof file!=='string'||!/^[A-Za-z0-9_-]{1,120}\.sqlite$/.test(file))fail();
 if(r.directoryFile===r.journalFile)fail();
}
async function regular(file){const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink())fail();return s;}
async function sync(file){const f=await open(file,'r');try{await f.sync();}finally{await f.close();}}
export async function createSubjectRecoveryMap(file,options={}){
 const parent=await realpath(path.dirname(path.resolve(file))),out=path.join(parent,path.basename(file));
 const fd=await open(out,'wx',0o600);await fd.close();let db;
 try{
  const {DatabaseSync}=await import('node:sqlite');db=new DatabaseSync(out);db.exec('PRAGMA synchronous=FULL;BEGIN IMMEDIATE;'+schema+';PRAGMA user_version=1;COMMIT');db.close();db=undefined;
  await sync(out);await sync(parent);return await openSubjectRecoveryMap(out,options);
 }catch(e){db?.close();await unlink(out);throw e;}
}
export async function openSubjectRecoveryMap(file,{root,anchors,now=Date.now,beforeLocatorCommit,afterLocatorCommit}={}){
 if(!Array.isArray(anchors)||!anchors.length||anchors.length>100)fail();
 const trusted=new Map();
 for(const a of anchors){
  if(!a||trusted.has(a.subject)||a.witness?.mode!=='SYNTHETIC_TRUST_WITNESS')fail();
  const record=a.witness.read();validateWitnessRecord(record);if(record.subject!==a.subject||record.anchorId!==a.anchorId)fail();
  trusted.set(a.subject,{witness:a.witness,anchorId:a.anchorId});
 }
 const base=await realpath(root);if((await regular(file)).size>16_000_000)fail();
 const {DatabaseSync}=await import('node:sqlite'),db=new DatabaseSync(file);let closed=false;
 function inspect(){
  if(closed||db.prepare('PRAGMA user_version').get().user_version!==1||db.prepare('PRAGMA quick_check').get().quick_check!=='ok')fail();
  const definitions=db.prepare('SELECT type,name,sql FROM sqlite_schema WHERE sql IS NOT NULL').all();
  if(definitions.length!==1||definitions[0].type!=='table'||definitions[0].name!=='locators'||definitions[0].sql!==schema)fail();
 }
 try{db.exec('PRAGMA trusted_schema=OFF;PRAGMA busy_timeout=500;PRAGMA synchronous=FULL;');inspect();}catch(e){db.close();throw e;}
 function current(subject){
  if(closed)fail();const a=trusted.get(subject);if(!a)fail();const r=a.witness.read();validateWitnessRecord(r);
  if(r.subject!==subject||r.anchorId!==a.anchorId)fail();return {record:r,witness:a.witness};
 }
 async function files(r){validate(r);const d=path.join(base,r.directoryFile),j=path.join(base,r.journalFile);await regular(d);await regular(j);return {directoryFile:d,journalFile:j};}
 function store(r,source,witness){
  validate(r);if(!same(projection(source),projection(current(r.subject).record)))fail();
  // Order witness -> locator DB. This stores a hint, never advances the witness.
  return witness.reserve(source).readOnly(()=>{
   db.exec('BEGIN IMMEDIATE');let result;
   try{
    inspect();const old=db.prepare('SELECT * FROM locators WHERE directory_domain=? OR journal_domain=?').all(r.directoryDomain,r.journalDomain),payload=JSON.stringify(r);
    if(old.length){if(old.length!==1||old[0].payload!==payload||old[0].checksum!==hash(payload))fail();result={remembered:false};}
    else {
     if(db.prepare('SELECT count(*) AS n FROM locators WHERE subject=?').get(r.subject).n>=100)fail();
     db.prepare('INSERT INTO locators VALUES (?,?,?,?,?)').run(r.subject,r.directoryDomain,r.journalDomain,payload,hash(payload));result={remembered:true};
    }
    beforeLocatorCommit?.();db.exec('COMMIT');
   }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
   afterLocatorCommit?.();return result;
  });
 }
 async function openResolved(r,record,witness){
  const paths=await files(r);let directory,journal;
  try{
   directory=await openWitnessedDeviceDirectory(paths.directoryFile,witness,{now});journal=await openDurableSyntheticAuthority(paths.journalFile,{now});
   if(journal.summary().suspended||journal.sessionEpoch!==record.journalDomain||!same(witness.read(),record))fail();
   return {subject:r.subject,directory,journal,trust:projection(record),close(){directory.close();journal.close();}};
  }catch(e){directory?.close();journal?.close();throw e;}
 }
 return Object.freeze({mode:'SYNTHETIC_SUBJECT_RECOVERY_MAP',
  // Repair is explicit private control with known locators; no scan, bootstrap, or witness update.
  async rememberCurrent(subject,{directoryFile,journalFile}={}){
   const {record,witness}=current(subject),r=locator(record,directoryFile,journalFile),opened=await openResolved(r,record,witness);
   try{return store(r,record,witness);}finally{opened.close();}
  },
  // Persist only public destination references before recovery. An uncommitted target is never served.
  async prepareTarget(subject,{review,directoryFile,journalFile}={}){
   review=structuredClone(review);const {record,witness}=current(subject);
   if(!review||review.anchorId!==record.anchorId||review.subject!==subject||review.sourceSequence!==record.sequence||review.sourceEpoch!==record.epoch||review.oldFingerprint!==record.fingerprint||!same(review.sourceCheckpoint,record.checkpoint)||review.newFingerprint===record.fingerprint||!Number.isSafeInteger(review.expiresAt)||now()>=review.expiresAt||review.targetCheckpoint?.domain===record.checkpoint.domain||review.targetJournalDomain===record.journalDomain)fail();
   const target={...record,epoch:record.epoch+1,fingerprint:review.newFingerprint,checkpoint:review.targetCheckpoint,journalDomain:review.targetJournalDomain},r=locator(target,directoryFile,journalFile),paths=await files(r);let directory,journal;
   try{
    directory=await openDurableDeviceDirectory(paths.directoryFile,{now});journal=await openDurableSyntheticAuthority(paths.journalFile,{now});
    const d=directory.summary(),j=journal.summary();
    if(d.suspended||d.revision!==1||d.bindings.length!==1||d.bindings[0].status!=='active'||d.bindings[0].subject!==subject||d.bindings[0].hash!==review.bindingHash||d.pins.length!==1||d.pins[0].subject!==subject||d.pins[0].fingerprint!==r.fingerprint||d.pins[0].revoked||!same(directoryCheckpoint(d),review.targetCheckpoint)||j.suspended||j.events!==0||j.domain!==r.journalDomain)fail();
    journal.withEmptyDomain(r.journalDomain,subject,()=>true);return store(r,record,witness);
   }finally{directory?.close();journal?.close();}
  },
  async resolve(subject){
   const {record,witness}=current(subject);inspect();
   // Query only the witness-selected domain, never 'newest row' or a previous epoch.
   const row=db.prepare('SELECT * FROM locators WHERE subject=? AND directory_domain=? AND journal_domain=?').get(subject,record.checkpoint.domain,record.journalDomain);
   if(!row||hash(row.payload)!==row.checksum)fail();const r=JSON.parse(row.payload);validate(r);
   if(r.subject!==row.subject||r.directoryDomain!==row.directory_domain||r.journalDomain!==row.journal_domain||!same(reference(r),projection(record)))fail();
   return openResolved(r,record,witness);
  },
  close(){if(!closed){db.close();closed=true;}}
 });
}
