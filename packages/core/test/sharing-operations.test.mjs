import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createDurableSyntheticAuthority,openDurableSyntheticAuthority,restoreDurableSyntheticAuthority} from '../../sharing-spike/src/durable-authority.mjs';
import {createDurableDeviceDirectory,openDurableDeviceDirectory,restoreDurableDeviceDirectory} from '../../sharing-spike/src/durable-device-directory.mjs';
import {createDeviceBoundSessionHarness} from '../../sharing-spike/src/device-bound-session.mjs';
import {createProofSigner,proofSignerCard,signDeviceBinding,answerDeviceChallenge} from '../../sharing-spike/src/device-binding-proof.mjs';
import {createProofRecipient,publicProofCard} from '../../sharing-spike/src/hpke-proof.mjs';
let Database;try{Database=(await import('node:sqlite')).DatabaseSync;}catch{}
const check=(name,fn)=>test(name,{skip:!Database&&'SQLite nativo indisponível.'},fn);
const denied=r=>{assert.equal(r.status,403);assert.deepEqual(r.body,{error:'DENIED',mode:'SYNTHETIC_ONLY'});};
async function fixture(t){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-operations-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const file=path.join(base,'journal.sqlite'),directoryFile=path.join(base,'directory.sqlite'),identities=['owner','editor'];
 const devices={},pins=[];for(const subject of identities){const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();devices[subject]={card,recipient,binding:await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject,device:subject,issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000})};pins.push({subject,fingerprint:card.fingerprint});}
 const directory=await createDurableDeviceDirectory(directoryFile,pins);t.after(()=>directory.close());
 const journal=await createDurableSyntheticAuthority(file,identities);t.after(()=>{try{journal.close();}catch{}});journal.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'},{id:'private',folder:'notes'}]});
 const harness=(dir=directory,authority=journal)=>createDeviceBoundSessionHarness({directory:dir,authority,identities});
 const h=harness(),send=(client,route,body={},extra={},target=h)=>target.dispatch({method:'POST',origin:target.origin,source:'fixture',path:route,body,...client,...extra});
 async function login(subject='owner',target=h){const start=await send({},'/synthetic/login/start',{device:subject},{},target);assert.equal(start.status,200);const code=target.issueSyntheticCode({subject,device:subject,state:start.body.state});const r=await send({csrf:start.body.csrf},'/synthetic/login/complete',{state:start.body.state,code},{},target);assert.equal(r.status,200);return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:r.body.csrf};}
 async function prove(client,subject='owner',target=h){const d=devices[subject],begin=await send(client,'/device-proof/begin',{binding:d.binding},{},target);assert.equal(begin.status,200);const response=await answerDeviceChallenge(d.recipient,d.binding,begin.body,{subject,device:subject,identityFingerprint:d.card.fingerprint});assert.equal((await send(client,'/device-proof/confirm',{response},{},target)).status,200);return begin.body;}
 const owner=await login();await prove(owner);
 const domains=(await send(owner,'/operations/context')).body;
 const input={projectId:'book',recipient:'editor',scope:['one'],capabilities:['read','propose'],expiresAt:Date.now()+3600000};
 const operation=(action='invite',data=input)=>({operationId:randomUUID(),...domains,action,input:structuredClone(data)});
 const context={device:'owner',bindingHash:(await directory.authorize(devices.owner.binding)).binding_hash,directoryDomain:domains.directoryDomain,directoryRevision:directory.summary().revision};
 return {base,file,directoryFile,directory,journal,devices,h,harness,send,login,prove,owner,domains,input,operation,context};
}
check('operation invite writes one receipt, upgrades only synthetic schema and never persists its one-shot token',async t=>{
 const f=await fixture(t),op=f.operation(),before=f.journal.summary().events;
 const created=await f.send(f.owner,'/operations/execute',op);assert.equal(created.status,200);assert.equal(created.body.replayed,false);assert.ok(created.body.token);assert.equal(created.body.receipt.effect,'pending');
 const retry=await f.send(f.owner,'/operations/execute',op),reconciled=await f.send(f.owner,'/operations/reconcile',op);
 for(const r of [retry,reconciled]){assert.equal(r.status,200);assert.equal(r.body.token,undefined);assert.equal(r.body.secretDelivery,'not-recoverable');assert.equal(r.body.receipt.receiptId,created.body.receipt.receiptId);}
 assert.equal(f.journal.summary().events,before+1);
 const db=new Database(f.file,{readOnly:true});assert.equal(db.prepare('PRAGMA user_version').get().user_version,2);const rows=JSON.stringify(db.prepare('SELECT * FROM event').all());db.close();assert.equal(rows.includes(created.body.token),false);
});
check('operation fingerprint rejects payload/action/domain and device substitutions; canonical scope order is stable',async t=>{
 const f=await fixture(t),op=f.operation();assert.equal((await f.send(f.owner,'/operations/execute',op)).status,200);
 for(const altered of [{...op,input:{...op.input,scope:['private']}},{...op,input:{...op.input,expiresAt:op.input.expiresAt+1}},{...op,action:'revoke',input:{projectId:'book',invitationId:randomUUID()}},{...op,journalDomain:randomUUID()},{...op,directoryDomain:randomUUID()},{...op,input:{...op.input,actor:'owner'}}])denied(await f.send(f.owner,'/operations/execute',altered));
 const same={...op,input:{...op.input,capabilities:[...op.input.capabilities].reverse()}};assert.equal((await f.send(f.owner,'/operations/execute',same)).body.replayed,true);
 assert.throws(()=>f.journal.reconcileOperation('owner',{...f.context,device:'other'},op),/DENIED/);
});
check('operation acceptance retries keep grant identity while current revocation overrides historical receipt',async t=>{
 const f=await fixture(t),invite=(await f.send(f.owner,'/operations/execute',f.operation())).body,editor=await f.login('editor');await f.prove(editor,'editor');
 const op=f.operation('accept',{token:invite.token,explicit:true}),accepted=await f.send(editor,'/operations/execute',op);assert.equal(accepted.status,200);
 const grantId=accepted.body.receipt.grantId,before=f.journal.summary().events;
 assert.equal((await f.send(editor,'/operations/execute',op)).body.receipt.grantId,grantId);assert.equal(f.journal.summary().events,before);
 const revoke=f.operation('revoke',{projectId:'book',invitationId:invite.receipt.invitationId});assert.equal((await f.send(f.owner,'/operations/execute',revoke)).status,200);
 const after=f.journal.summary().events;assert.equal((await f.send(f.owner,'/operations/execute',revoke)).body.replayed,true);assert.equal(f.journal.summary().events,after);
 const history=await f.send(editor,'/operations/reconcile',op);assert.equal(history.body.receipt.effect,'revoked');assert.equal(history.body.receipt.grantId,grantId);
 assert.equal((await f.send(editor,'/operations/execute',op)).body.receipt.effect,'revoked');
 denied(await f.send(editor,'/access/check',{projectId:'book',sceneId:'one',action:'read'}));assert.deepEqual(f.journal.summary().receipts,[grantId]);
});
check('operation records are scoped by actor; missing means absent only within explicit current domains',async t=>{
 const f=await fixture(t),op=f.operation(),before=f.journal.summary().events;
 const missing=await f.send(f.owner,'/operations/reconcile',op);assert.deepEqual(missing.body,{status:'not_found',...f.domains});assert.equal(f.journal.summary().events,before);
 await f.send(f.owner,'/operations/execute',op);const editor=await f.login('editor');await f.prove(editor,'editor');
 assert.equal((await f.send(editor,'/operations/reconcile',op)).body.status,'not_found');denied(await f.send(editor,'/operations/execute',op));
});
check('operation errors before commit roll back both receipt and schema upgrade; explicit retry can then commit',async t=>{
 const f=await fixture(t),op=f.operation(),before=f.journal.summary().events;
 const broken=await openDurableSyntheticAuthority(f.file,{beforeCommit(){throw new Error('INJECTED');}});t.after(()=>broken.close());assert.throws(()=>broken.executeOperation('owner',f.context,op),/INJECTED/);
 assert.equal(f.journal.summary().events,before);const db=new Database(f.file,{readOnly:true});assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);db.close();
 assert.equal(f.journal.reconcileOperation('owner',f.context,op).status,'not_found');assert.equal(f.journal.executeOperation('owner',f.context,op).status,'committed');
});
check('operation failure after commit leaves durable receipt; retry returns it without a second mutation',async t=>{
 const f=await fixture(t),op=f.operation(),broken=await openDurableSyntheticAuthority(f.file,{afterCommit(){throw new Error('LOST_RESPONSE');}});t.after(()=>broken.close());
 assert.throws(()=>broken.executeOperation('owner',f.context,op),/LOST_RESPONSE/);const before=f.journal.summary().events;
 const reconciled=f.journal.reconcileOperation('owner',f.context,op),retry=f.journal.executeOperation('owner',f.context,op);assert.equal(reconciled.status,'committed');assert.equal(retry.receipt.receiptId,reconciled.receipt.receiptId);assert.equal(retry.token,undefined);assert.equal(f.journal.summary().events,before);
});
check('operation receipt survives service restart but a fresh session needs possession again',async t=>{
 const f=await fixture(t),op=f.operation(),created=await f.send(f.owner,'/operations/execute',op);const reopened=await openDurableSyntheticAuthority(f.file);t.after(()=>reopened.close());const next=f.harness(f.directory,reopened);
 denied(await f.send(f.owner,'/operations/reconcile',op,{},next));const fresh=await f.login('owner',next);denied(await f.send(fresh,'/operations/reconcile',op,{},next));await f.prove(fresh,'owner',next);
 const r=await f.send(fresh,'/operations/reconcile',op,{},next);assert.equal(r.body.receipt.receiptId,created.body.receipt.receiptId);assert.equal(r.body.token,undefined);
});
check('device revocation denies receipt reads and retries, while preserving historical commit',async t=>{
 const f=await fixture(t),op=f.operation();await f.send(f.owner,'/operations/execute',op);const before=f.journal.summary().events;
 const other=await openDurableDeviceDirectory(f.directoryFile);t.after(()=>other.close());other.revokeBinding(f.context.bindingHash,{expectedRevision:other.summary().revision});
 denied(await f.send(f.owner,'/operations/reconcile',op));denied(await f.send(f.owner,'/operations/execute',op));assert.equal(f.journal.summary().events,before);
});
check('suspended restore of either component cannot reconcile or re-execute older receipts',async t=>{
 const f=await fixture(t),op=f.operation();await f.send(f.owner,'/operations/execute',op);
 const journalBackup=path.join(f.base,'journal-backup.sqlite'),j=await f.journal.backup(journalBackup),restored=await restoreDurableSyntheticAuthority(journalBackup,path.join(f.base,'restored-journal.sqlite'),j.checksum);t.after(()=>restored.close());
 assert.throws(()=>restored.reconcileOperation('owner',f.context,op),/DENIED/);assert.throws(()=>restored.executeOperation('owner',f.context,op),/DENIED/);
 const directoryBackup=path.join(f.base,'directory-backup.sqlite'),d=await f.directory.backup(directoryBackup),restoredDirectory=await restoreDurableDeviceDirectory(directoryBackup,path.join(f.base,'restored-directory.sqlite'),d.checksum);t.after(()=>restoredDirectory.close());
 const next=f.harness(restoredDirectory),client=await f.login('owner',next);denied(await f.send(client,'/operations/reconcile',op,{},next));
});
check('receipt metadata tampering and duplicate operation IDs are refused at reopen without rewriting files',async t=>{
 for(const kind of ['fingerprint','duplicate']){
  const f=await fixture(t),op=f.operation();await f.send(f.owner,'/operations/execute',op);f.journal.close();const db=new Database(f.file);
  const row=db.prepare('SELECT * FROM event ORDER BY sequence DESC LIMIT 1').get(),event=JSON.parse(row.payload);
  if(kind==='fingerprint')event.operation.requestHash='0'.repeat(64);const payload=JSON.stringify(event),checksum=createHash('sha256').update(payload).digest('hex');
  if(kind==='duplicate')db.prepare('INSERT INTO event VALUES (?,?,?)').run(row.sequence+1,payload,checksum);else db.prepare('UPDATE event SET payload=?,checksum=? WHERE sequence=?').run(payload,checksum,row.sequence);db.close();
  const before=await readFile(f.file);await assert.rejects(openDurableSyntheticAuthority(f.file),/DENIED/);assert.deepEqual(await readFile(f.file),before);
 }
});
check('two processes executing one operation persist one event and the same receipt',async t=>{
 const f=await fixture(t),op=f.operation(),before=f.journal.summary().events;
 const module=new URL('../../sharing-spike/src/durable-authority.mjs',import.meta.url).href;
 const script=`import {openDurableSyntheticAuthority} from ${JSON.stringify(module)};const a=await openDurableSyntheticAuthority(process.argv[1]);try{const r=a.executeOperation('owner',JSON.parse(process.argv[2]),JSON.parse(process.argv[3]));process.send({id:r.receipt.receiptId,replayed:r.replayed});}finally{a.close();}`;
 const results=await Promise.all([1,2].map(()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',script,f.file,JSON.stringify(f.context),JSON.stringify(op)],{stdio:['ignore','ignore','ignore','ipc']});let out;child.on('message',v=>out=v);child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error('child failed')));} )));
 assert.deepEqual(results.map(v=>v.replayed).sort(),[false,true]);assert.equal(results[0].id,results[1].id);assert.equal(f.journal.summary().events,before+1);
});
check('SIGKILL after journal commit but before directory release preserves receipt and releases the admission lock',async t=>{
 const f=await fixture(t),op=f.operation(),before=f.journal.summary().events;
 const journalModule=new URL('../../sharing-spike/src/durable-authority.mjs',import.meta.url).href,directoryModule=new URL('../../sharing-spike/src/durable-device-directory.mjs',import.meta.url).href;
 const script=`import {openDurableSyntheticAuthority} from ${JSON.stringify(journalModule)};import {openDurableDeviceDirectory} from ${JSON.stringify(directoryModule)};const j=await openDurableSyntheticAuthority(process.argv[1],{afterCommit(){process.send('committed');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});const d=await openDurableDeviceDirectory(process.argv[2]);await d.withAuthorizedBinding(JSON.parse(process.argv[3]),admission=>j.executeOperation('owner',{device:'owner',bindingHash:admission.bindingHash,directoryDomain:admission.domain,directoryRevision:admission.revision},JSON.parse(process.argv[4])));`;
 const child=spawn(process.execPath,['--input-type=module','-e',script,f.file,f.directoryFile,JSON.stringify(f.devices.owner.binding),JSON.stringify(op)],{stdio:['ignore','ignore','ignore','ipc']});t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 const timer=setTimeout(()=>child.kill('SIGKILL'),10000);t.after(()=>clearTimeout(timer));const [message]=await once(child,'message');assert.equal(message,'committed');child.kill('SIGKILL');await once(child,'exit');clearTimeout(timer);
 const reply=await f.send(f.owner,'/operations/reconcile',op);assert.equal(reply.status,200);assert.equal(reply.body.status,'committed');assert.equal(f.journal.summary().events,before+1);
 assert.equal((await f.send(f.owner,'/operations/execute',op)).body.replayed,true);assert.equal(f.journal.summary().events,before+1);
});

check('operation query/execute require CSRF and possession; caller cannot supply admission metadata',async t=>{
 const f=await fixture(t),op=f.operation(),fresh=await f.login();
 for(const route of ['/operations/context','/operations/execute','/operations/reconcile']){
  denied(await f.send(fresh,route,route==='/operations/context'?{}:op));
  denied(await f.send(f.owner,route,route==='/operations/context'?{}:op,{csrf:undefined}));
  denied(await f.send(f.owner,route,route==='/operations/context'?{}:op,{method:'GET'}));
 }
 denied(await f.send(f.owner,'/operations/execute',{...op,context:f.context}));assert.equal(f.journal.summary().events,1);
});
check('logout while operation admission awaits does not leave a receipt or mutation',async t=>{
 const f=await fixture(t);let next,client;
 const directory={...f.directory,withAuthorizedBinding:async(binding,action)=>{await f.send(client,'/logout',{}, {},next);return f.directory.withAuthorizedBinding(binding,action);}};
 next=f.harness(directory);client=await f.login('owner',next);await f.prove(client,'owner',next);const op=f.operation(),before=f.journal.summary().events;
 denied(await f.send(client,'/operations/execute',op,{},next));assert.equal(f.journal.summary().events,before);assert.equal(f.journal.reconcileOperation('owner',f.context,op).status,'not_found');
});
check('expired invitation receipt remains historical and retry cannot renew its deadline',async t=>{
 const f=await fixture(t),expiresAt=Date.now()+1000,op=f.operation('invite',{...f.input,expiresAt});
 const created=f.journal.executeOperation('owner',f.context,op),before=f.journal.summary().events;
 const later=await openDurableSyntheticAuthority(f.file,{now:()=>expiresAt+1});t.after(()=>later.close());
 const r=later.executeOperation('owner',f.context,op);assert.equal(r.replayed,true);assert.equal(r.receipt.effect,'expired');assert.equal(r.receipt.receiptId,created.receipt.receiptId);assert.equal(later.summary().events,before);
 assert.throws(()=>later.accept('editor',created.token,{explicit:true}),/DENIED/);
});
check('SIGKILL before operation commit rolls back receipt and synthetic schema version',async t=>{
 const f=await fixture(t),op=f.operation(),before=f.journal.summary().events,module=new URL('../../sharing-spike/src/durable-authority.mjs',import.meta.url).href;
 const script=`import {openDurableSyntheticAuthority} from ${JSON.stringify(module)};const j=await openDurableSyntheticAuthority(process.argv[1],{beforeCommit(){process.send('inserted');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});j.executeOperation('owner',JSON.parse(process.argv[2]),JSON.parse(process.argv[3]));`;
 const child=spawn(process.execPath,['--input-type=module','-e',script,f.file,JSON.stringify(f.context),JSON.stringify(op)],{stdio:['ignore','ignore','ignore','ipc']});t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 const timer=setTimeout(()=>child.kill('SIGKILL'),10000);t.after(()=>clearTimeout(timer));const [message]=await once(child,'message');assert.equal(message,'inserted');child.kill('SIGKILL');await once(child,'exit');clearTimeout(timer);
 assert.equal(f.journal.summary().events,before);assert.equal(f.journal.reconcileOperation('owner',f.context,op).status,'not_found');const db=new Database(f.file,{readOnly:true});assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);db.close();
 assert.equal(f.journal.executeOperation('owner',f.context,op).status,'committed');
});
