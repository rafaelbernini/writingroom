import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn,spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createProofRecipient,publicProofCard } from '../../sharing-spike/src/hpke-proof.mjs';
import { createProofSigner,proofSignerCard,signDeviceBinding,answerDeviceChallenge } from '../../sharing-spike/src/device-binding-proof.mjs';
import { createDurableDeviceDirectory,openDurableDeviceDirectory,restoreDurableDeviceDirectory } from '../../sharing-spike/src/durable-device-directory.mjs';
let Database;try{Database=(await import('node:sqlite')).DatabaseSync;}catch{}
const check=(name,fn)=>test(name,{skip:!Database&&'SQLite nativo indisponível.'},fn);
async function fixture(t){const base=await mkdtemp(path.join(tmpdir(),'wroom-devices-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const file=path.join(base,'directory.sqlite'),signer=await createProofSigner(),identity=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();
 const binding=await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject:'editor',device:'laptop',issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000});
 const api=await createDurableDeviceDirectory(file,[{subject:'editor',fingerprint:identity.fingerprint}]);t.after(()=>api.close());
 const answer=c=>answerDeviceChallenge(recipient,binding,c,{subject:'editor',device:'laptop',identityFingerprint:identity.fingerprint});
 const activate=async d=>d.confirm(await answer(await d.begin(binding)));
 return {base,file,api,identity,recipient,binding,answer,activate};}
check('directory activation and binding revocation survive reopening, without private keys',async t=>{
 const f=await fixture(t),result=await f.activate(f.api);f.api.close();const second=await openDurableDeviceDirectory(f.file);t.after(()=>second.close());
 assert.equal((await second.authorize(f.binding)).binding_hash,result.binding_hash);
 second.revokeBinding(result.binding_hash,{expectedRevision:second.summary().revision});second.close();
 const third=await openDurableDeviceDirectory(f.file);t.after(()=>third.close());await assert.rejects(()=>third.authorize(f.binding));await assert.rejects(()=>third.begin(f.binding));
 assert.ok(third.summary().revokedHashes.includes(result.binding_hash));
 assert.equal((await stat(f.file)).mode&0o777,0o600);
 const db=new Database(f.file,{readOnly:true});const row=db.prepare('SELECT json FROM binding').get();db.close();assert.equal(row.json.includes('privateKey'),false);assert.equal(row.json.includes('nonce'),false);
});
check('pending challenge is process-local and invalid after directory restart',async t=>{
 const f=await fixture(t),challenge=await f.api.begin(f.binding),response=await f.answer(challenge);f.api.close();
 const next=await openDurableDeviceDirectory(f.file);t.after(()=>next.close());await assert.rejects(()=>next.confirm(response));await assert.rejects(()=>next.authorize(f.binding));await f.activate(next);
});
check('another connection can revoke previewed binding before confirmation with CAS',async t=>{
 const f=await fixture(t),c=await f.api.begin(f.binding),r=await f.answer(c);const other=await openDurableDeviceDirectory(f.file);t.after(()=>other.close());
 other.revokeBinding(c.binding_hash,{expectedRevision:0});await assert.rejects(()=>f.api.confirm(r));assert.equal(other.summary().bindings.length,0);await assert.rejects(()=>other.begin(f.binding));
 assert.throws(()=>f.api.revokeIdentity('editor',{expectedRevision:0}),/DIRECTORY_REJECTED/);
});
check('two connections cannot both commit activation from the same directory revision',async t=>{
 const f=await fixture(t),other=await openDurableDeviceDirectory(f.file);t.after(()=>other.close());
 const c1=await f.api.begin(f.binding),c2=await other.begin(f.binding),r1=await f.answer(c1),r2=await f.answer(c2);
 const results=await Promise.allSettled([f.api.confirm(r1),other.confirm(r2)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.api.summary().revision,1);
});
check('failed transaction rolls back activation and consumes the local challenge safely',async t=>{
 const f=await fixture(t);f.api.close();const broken=await openDurableDeviceDirectory(f.file,{beforeCommit(){throw new Error('INJECTED');}});t.after(()=>broken.close());
 const c=await broken.begin(f.binding),r=await f.answer(c);await assert.rejects(()=>broken.confirm(r),/INJECTED/);assert.equal(broken.summary().bindings.length,0);await assert.rejects(()=>broken.confirm(r));
});
check('old backup restores suspended under new domain, never reviving subsequently revoked keys',async t=>{
 const f=await fixture(t),result=await f.activate(f.api),backup=path.join(f.base,'backup.sqlite');const {checksum}=await f.api.backup(backup);assert.equal((await stat(backup)).mode&0o777,0o600);
 f.api.revokeIdentity('editor',{expectedRevision:f.api.summary().revision});await assert.rejects(()=>f.api.authorize(f.binding));
 const restored=await restoreDurableDeviceDirectory(backup,path.join(f.base,'restore.sqlite'),checksum);t.after(()=>restored.close());
 assert.equal(restored.summary().suspended,true);assert.notEqual(restored.summary().domain,f.api.summary().domain);assert.equal(restored.summary().bindings[0].hash,result.binding_hash);
 await assert.rejects(()=>restored.authorize(f.binding));await assert.rejects(()=>restored.begin(f.binding));assert.throws(()=>restored.revokeIdentity('editor',{expectedRevision:restored.summary().revision}));
 await assert.rejects(()=>f.api.backup(backup));await assert.rejects(()=>restoreDurableDeviceDirectory(backup,path.join(f.base,'bad.sqlite'),'0'.repeat(64)));
 f.api.close();const reopened=await openDurableDeviceDirectory(f.file);t.after(()=>reopened.close());await assert.rejects(()=>reopened.begin(f.binding));
});
check('killed writer rolls back uncommitted identity revocation and revision',async t=>{
 const f=await fixture(t);await f.activate(f.api);const before=f.api.summary().revision;
 const script=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1]);db.exec("BEGIN IMMEDIATE;UPDATE pin SET revoked=1;UPDATE directory SET revision=revision+1;");process.send('ready');setInterval(()=>{},1000);`;
 const p=spawn(process.execPath,['--input-type=module','-e',script,f.file],{stdio:['ignore','ignore','ignore','ipc']});t.after(()=>{if(p.exitCode===null)p.kill('SIGKILL');});await once(p,'message');p.kill('SIGKILL');await once(p,'exit');
 assert.equal(f.api.summary().revision,before);assert.equal((await f.api.authorize(f.binding)).subject,'editor');
});
check('revocation committed in another process blocks an in-flight confirmation',async t=>{
 const f=await fixture(t),c=await f.api.begin(f.binding),r=await f.answer(c);
 const url=new URL('../../sharing-spike/src/durable-device-directory.mjs',import.meta.url).href;
 const script=`import {openDurableDeviceDirectory} from ${JSON.stringify(url)};const d=await openDurableDeviceDirectory(process.argv[1]);d.revokeIdentity('editor',{expectedRevision:d.summary().revision});d.close();`;
 const child=spawn(process.execPath,['--input-type=module','-e',script,f.file],{stdio:['ignore','ignore','pipe']});const [code]=await once(child,'exit');assert.equal(code,0);await assert.rejects(()=>f.api.confirm(r));assert.equal(f.api.summary().pins[0].revoked,true);
});
check('corrupt checksum and unknown schema are rejected without migration',async t=>{
 const f=await fixture(t);await f.activate(f.api);f.api.close();const db=new Database(f.file);db.prepare('UPDATE binding SET checksum=?').run('0'.repeat(64));db.close();
 await assert.rejects(()=>openDurableDeviceDirectory(f.file));const bytes=await readFile(f.file);assert.ok(bytes.length>0);
 const future=path.join(f.base,'future.sqlite'),other=new Database(future);other.exec('PRAGMA user_version=99');other.close();const before=await readFile(future);await assert.rejects(()=>openDurableDeviceDirectory(future));assert.deepEqual(await readFile(future),before);
});

check('synchronous protected operation holds directory writer lock against another process',async t=>{
 const f=await fixture(t);await f.activate(f.api);
 const script=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA busy_timeout=20');try{db.exec('BEGIN IMMEDIATE');process.exit(2);}catch{db.close();process.exit(0);}`;
 const result=await f.api.withAuthorizedBinding(f.binding,()=>{const p=spawnSync(process.execPath,['--input-type=module','-e',script,f.file],{timeout:3000});assert.equal(p.status,0);return 'admitted';});
 assert.equal(result,'admitted');assert.equal((await f.api.authorize(f.binding)).subject,'editor');
});
