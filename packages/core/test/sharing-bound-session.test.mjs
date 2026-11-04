import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDurableSyntheticAuthority,restoreDurableSyntheticAuthority } from '../../sharing-spike/src/durable-authority.mjs';
import { createDurableDeviceDirectory,openDurableDeviceDirectory,restoreDurableDeviceDirectory } from '../../sharing-spike/src/durable-device-directory.mjs';
import { createDeviceBoundSessionHarness } from '../../sharing-spike/src/device-bound-session.mjs';
import { createProofSigner,proofSignerCard,signDeviceBinding,answerDeviceChallenge } from '../../sharing-spike/src/device-binding-proof.mjs';
import { createProofRecipient,publicProofCard } from '../../sharing-spike/src/hpke-proof.mjs';
let sqlite;try{sqlite=await import('node:sqlite');}catch{}
const check=(name,fn)=>test(name,{skip:!sqlite&&'SQLite nativo indisponível.'},fn);
async function fixture(t){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-bound-session-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();
 const binding=await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject:'owner',device:'laptop',issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000});
 const file=path.join(base,'directory.sqlite'),directory=await createDurableDeviceDirectory(file,[{subject:'owner',fingerprint:card.fingerprint}]);t.after(()=>directory.close());
 const authority=await createDurableSyntheticAuthority(path.join(base,'journal.sqlite'),['owner','editor']);t.after(()=>authority.close());authority.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'}]});
 function harness(dir=directory,journal=authority){return createDeviceBoundSessionHarness({authority:journal,directory:dir,identities:['owner','editor']});}
 const h=harness();const send=(client,route,body={},extra={},target=h)=>target.dispatch({method:'POST',origin:target.origin,source:'fixture',path:route,body,...client,...extra});
 async function login(subject='owner',device='laptop',target=h){const start=await send({},'/synthetic/login/start',{device},{},target);assert.equal(start.status,200);const code=target.issueSyntheticCode({subject,device,state:start.body.state});const complete=await send({csrf:start.body.csrf},'/synthetic/login/complete',{code,state:start.body.state},{},target);assert.equal(complete.status,200);return {cookie:complete.headers['Set-Cookie'].split(';')[0],csrf:complete.body.csrf};}
 async function begin(client,target=h){const result=await send(client,'/device-proof/begin',{binding},{},target);assert.equal(result.status,200);return result.body;}
 const answer=c=>answerDeviceChallenge(recipient,binding,c,{subject:'owner',device:'laptop',identityFingerprint:card.fingerprint});
 async function activate(client,target=h){const c=await begin(client,target),response=await answer(c);assert.equal((await send(client,'/device-proof/confirm',{response},{},target)).status,200);return c;}
 const input={projectId:'book',recipient:'editor',scope:['one'],capabilities:['read'],expiresAt:Date.now()+3600000};
 return {base,file,h,directory,authority,binding,input,send,login,begin,answer,activate,harness};
}
check('bound service denies journal operations until same-session possession proof succeeds',async t=>{
 const f=await fixture(t),client=await f.login();assert.equal((await f.send(client,'/invitations/create',f.input)).status,403);
 await f.activate(client);assert.equal((await f.send(client,'/invitations/create',f.input)).status,200);
 assert.equal((await f.send(client,'/access/check',{projectId:'book',sceneId:'one',action:'read'})).status,200);
});
check('same-user second session cannot relay confirmation or inherit device activation',async t=>{
 const f=await fixture(t),one=await f.login(),two=await f.login(),c=await f.begin(one),response=await f.answer(c);
 assert.equal((await f.send(two,'/device-proof/confirm',{response})).status,403);
 assert.equal((await f.send(one,'/device-proof/confirm',{response})).status,200);
 assert.equal((await f.send(two,'/invitations/create',f.input)).status,403);
 assert.equal((await f.send(one,'/device-proof/confirm',{response})).status,403);
});
check('wrong subject/device and missing CSRF cannot request or confirm possession',async t=>{
 const f=await fixture(t),other=await f.login('editor'),device=await f.login('owner','other');
 assert.equal((await f.send(other,'/device-proof/begin',{binding:f.binding})).status,403);
 assert.equal((await f.send(device,'/device-proof/begin',{binding:f.binding})).status,403);
 const owner=await f.login();assert.equal((await f.send(owner,'/device-proof/begin',{binding:f.binding},{csrf:undefined})).status,403);
});
check('directory revocation invalidates a proven session on next protected operation',async t=>{
 const f=await fixture(t),client=await f.login(),c=await f.activate(client);
 const other=await openDurableDeviceDirectory(f.file);t.after(()=>other.close());other.revokeBinding(c.binding_hash,{expectedRevision:other.summary().revision});
 assert.equal((await f.send(client,'/invitations/create',f.input)).status,403);
 assert.equal((await f.send(client,'/session',{}, {method:'GET'})).status,403);
});
check('logout during asynchronous confirmation prevents persistent activation',async t=>{
 const f=await fixture(t),client=await f.login(),c=await f.begin(client),response=await f.answer(c);
 const pending=f.send(client,'/device-proof/confirm',{response});await f.send(client,'/logout');assert.equal((await pending).status,403);
 assert.equal(f.directory.summary().bindings.length,0);
});
check('restart discards cookie and session proof even with active durable device',async t=>{
 const f=await fixture(t),one=await f.login();await f.activate(one);const next=f.harness();
 assert.equal((await f.send(one,'/invitations/create',f.input,{},next)).status,403);
 const fresh=await f.login('owner','laptop',next);assert.equal((await f.send(fresh,'/invitations/create',f.input,{},next)).status,403);
 await f.activate(fresh,next);assert.equal((await f.send(fresh,'/invitations/create',f.input,{},next)).status,200);
});
check('restored suspended directory never admits a fresh session proof',async t=>{
 const f=await fixture(t),one=await f.login();await f.activate(one);const backup=path.join(f.base,'backup.sqlite'),{checksum}=await f.directory.backup(backup);
 const restored=await restoreDurableDeviceDirectory(backup,path.join(f.base,'restore.sqlite'),checksum);t.after(()=>restored.close());const next=f.harness(restored),client=await f.login('owner','laptop',next);
 assert.equal((await f.send(client,'/device-proof/begin',{binding:f.binding},{},next)).status,403);assert.equal((await f.send(client,'/invitations/create',f.input,{},next)).status,403);
});

check('suspended restored journal also denies possession even when directory is active',async t=>{
 const f=await fixture(t),one=await f.login();await f.activate(one);const backup=path.join(f.base,'journal-backup.sqlite'),{checksum}=await f.authority.backup(backup);
 const restored=await restoreDurableSyntheticAuthority(backup,path.join(f.base,'journal-restore.sqlite'),checksum);t.after(()=>restored.close());
 const next=f.harness(f.directory,restored),client=await f.login('owner','laptop',next);
 assert.equal((await f.send(client,'/device-proof/begin',{binding:f.binding},{},next)).status,403);
 assert.equal((await f.send(client,'/invitations/create',f.input,{},next)).status,403);
});
check('logout while device admission awaits prevents journal mutation',async t=>{
 const f=await fixture(t);let next,client;
 const directory={...f.directory,withAuthorizedBinding:async(binding,action)=>{await f.send(client,'/logout',{}, {},next);return f.directory.withAuthorizedBinding(binding,action);}};
 next=f.harness(directory);client=await f.login('owner','laptop',next);await f.activate(client,next);const before=f.authority.summary().events;
 assert.equal((await f.send(client,'/invitations/create',f.input,{},next)).status,403);assert.equal(f.authority.summary().events,before);
});
