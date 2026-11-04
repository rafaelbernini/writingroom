import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createDurableSyntheticAuthority, openDurableSyntheticAuthority, restoreDurableSyntheticAuthority } from '../../sharing-spike/src/durable-authority.mjs';
let Database; try { Database=(await import('node:sqlite')).DatabaseSync; } catch {}
const check=(name,fn)=>test(name,{skip:!Database&&'SQLite nativo indisponível.'},fn);
async function fixture(t) {
 const base=await mkdtemp(path.join(tmpdir(),'wroom-sharing-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const file=path.join(base,'authority.sqlite');let api=await createDurableSyntheticAuthority(file,['owner','editor','other']);
 t.after(()=>{try{api.close();}catch{}});
 api.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft',text:'NEVER_PERSIST_THIS'},{id:'private',folder:'notes'}]});
 const input={projectId:'book',recipient:'editor',scope:['one'],capabilities:['read'],expiresAt:Date.now()+3600_000};
 const access={projectId:'book',sceneId:'one',action:'read'};
 return {base,file,api,input,access};
}
check('durable invite, receipt and revocation survive reopen without persisting tokens or manuscripts',async t=>{
 const f=await fixture(t),i=f.api.invite('owner',f.input),grant=f.api.accept('editor',i.token,{explicit:true});
 f.api.close();const api=await openDurableSyntheticAuthority(f.file);t.after(()=>api.close());
 assert.equal(api.authorize('editor',f.access),true);assert.deepEqual(api.summary().receipts,[grant]);
 assert.throws(()=>api.accept('editor',i.token,{explicit:true}),/DENIED/);
 assert.throws(()=>api.authorize('editor',{...f.access,sceneId:'private'}),/DENIED/);
 assert.throws(()=>api.authorize('other',f.access),/DENIED/);
 api.revoke('owner','book',i.invitationId);assert.throws(()=>api.authorize('editor',f.access),/DENIED/);
 const db=new Database(f.file,{readOnly:true});const rows=JSON.stringify(db.prepare('SELECT * FROM event').all());db.close();
 assert.equal(rows.includes(i.token),false);assert.equal(rows.includes('NEVER_PERSIST_THIS'),false);
});
check('transaction failure leaves invite unconsumed and no receipt',async t=>{
 const f=await fixture(t),i=f.api.invite('owner',f.input);f.api.close();
 const broken=await openDurableSyntheticAuthority(f.file,{beforeCommit(){throw new Error('INJECTED');}});
 assert.throws(()=>broken.accept('editor',i.token,{explicit:true}),/INJECTED/);assert.equal(broken.summary().receipts.length,0);broken.close();
 const api=await openDurableSyntheticAuthority(f.file);t.after(()=>api.close());
 assert.deepEqual(api.preview('editor',i.token).scope,['one']);api.accept('editor',i.token,{explicit:true});
});
check('backup validates and restore preserves receipts but suspends all authority under new domain',async t=>{
 const f=await fixture(t),i=f.api.invite('owner',f.input);const grant=f.api.accept('editor',i.token,{explicit:true});
 const backup=path.join(f.base,'backup.sqlite'),{checksum}=await f.api.backup(backup);
 f.api.revoke('owner','book',i.invitationId);
 const restored=await restoreDurableSyntheticAuthority(backup,path.join(f.base,'restored.sqlite'),checksum);t.after(()=>restored.close());
 assert.notEqual(restored.sessionEpoch,f.api.sessionEpoch);assert.equal(restored.summary().suspended,true);assert.deepEqual(restored.summary().receipts,[grant]);
 assert.throws(()=>restored.authorize('editor',f.access),/DENIED/);assert.throws(()=>restored.invite('owner',f.input),/DENIED/);
 assert.throws(()=>f.api.authorize('editor',f.access),/DENIED/);
 await assert.rejects(()=>restoreDurableSyntheticAuthority(backup,path.join(f.base,'bad.sqlite'),'0'.repeat(64)),/DENIED/);
 await assert.rejects(()=>f.api.backup(backup));
});
check('two processes accept the same token at most once',async t=>{
 const f=await fixture(t),i=f.api.invite('owner',f.input);
 const module=new URL('../../sharing-spike/src/durable-authority.mjs',import.meta.url).href;
 const script=`import {openDurableSyntheticAuthority} from ${JSON.stringify(module)};const api=await openDurableSyntheticAuthority(process.argv[1]);try{api.accept('editor',process.argv[2],{explicit:true});process.send('accepted');}catch{process.send('denied');}finally{api.close();}`;
 const results=await Promise.all([1,2].map(()=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--input-type=module','-e',script,f.file,i.token],{stdio:['ignore','ignore','pipe','ipc']});let out='';p.on('message',d=>out=d);p.on('error',reject);p.on('close',code=>code===0?resolve(out):reject(new Error('child failed')));} )));
 assert.deepEqual(results.sort(),['accepted','denied']);assert.equal(f.api.summary().receipts.length,1);
});
check('killed writer rolls back uncommitted journal insert',async t=>{
 const f=await fixture(t);const before=f.api.summary().events;
 const script=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1]);db.exec("BEGIN IMMEDIATE; INSERT INTO event VALUES (999,'broken','broken');");process.send('ready');setInterval(()=>{},1000);`;
 const p=spawn(process.execPath,['--input-type=module','-e',script,f.file],{stdio:['ignore','ignore','ignore','ipc']});
 t.after(()=>{if(p.exitCode===null)p.kill('SIGKILL');});await once(p,'message');p.kill('SIGKILL');await once(p,'exit');
 assert.equal(f.api.summary().events,before);assert.deepEqual(f.api.previewFolder('owner','book','draft'),['one']);
});
check('tampered journal and unsupported schema are refused without rewriting file',async t=>{
 const f=await fixture(t);f.api.close();const db=new Database(f.file);db.prepare('UPDATE event SET payload=? WHERE sequence=1').run('{}');db.close();
 const before=await readFile(f.file);await assert.rejects(()=>openDurableSyntheticAuthority(f.file),/DENIED/);assert.deepEqual(await readFile(f.file),before);
 const future=path.join(f.base,'future.sqlite');const next=new Database(future);next.exec('PRAGMA user_version=99');next.close();
 await assert.rejects(()=>openDurableSyntheticAuthority(future),/DENIED/);
});

check('revocation from another connection invalidates an already previewed invitation',async t=>{
 const f=await fixture(t),i=f.api.invite('owner',f.input);
 const second=await openDurableSyntheticAuthority(f.file);t.after(()=>second.close());
 second.preview('editor',i.token);f.api.revoke('owner','book',i.invitationId);
 assert.throws(()=>second.accept('editor',i.token,{explicit:true}),/DENIED/);assert.equal(second.summary().receipts.length,0);
});
check('new durable harness invalidates old cookies while preserving accepted scope',async t=>{
 const {createSyntheticSessionHarness}=await import('../../sharing-spike/src/session-harness.mjs');
 const f=await fixture(t);const i=f.api.invite('owner',f.input);f.api.accept('editor',i.token,{explicit:true});
 const first=createSyntheticSessionHarness({authority:f.api,identities:['owner','editor','other']});
 const send=(h,path,body={},extra={})=>h.dispatch({method:'POST',origin:h.origin,source:'test',path,body,...extra});
 const start=send(first,'/synthetic/login/start',{device:'laptop'}).body;
 const code=first.issueSyntheticCode({subject:'editor',device:'laptop',state:start.state});
 const login=send(first,'/synthetic/login/complete',{state:start.state,code},{csrf:start.csrf});assert.equal(login.status,200);
 const cookie=login.headers['Set-Cookie'].split(';')[0];f.api.close();
 const reopened=await openDurableSyntheticAuthority(f.file);t.after(()=>reopened.close());
 const second=createSyntheticSessionHarness({authority:reopened,identities:['owner','editor','other']});
 assert.equal(send(second,'/session',{}, {method:'GET',cookie}).status,403);assert.equal(reopened.authorize('editor',f.access),true);
});
