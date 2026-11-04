import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { checkServerIdentity } from 'node:tls';
import { mkdtemp, readFile, rm, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startSyntheticHttpsTransport } from '../../sharing-spike/src/https-transport.mjs';
import { createDurableSyntheticAuthority, openDurableSyntheticAuthority, restoreDurableSyntheticAuthority } from '../../sharing-spike/src/durable-authority.mjs';
import { createDurableDeviceDirectory } from '../../sharing-spike/src/durable-device-directory.mjs';
import { createProofSigner,proofSignerCard,signDeviceBinding,answerDeviceChallenge } from '../../sharing-spike/src/device-binding-proof.mjs';
import { createProofRecipient,publicProofCard } from '../../sharing-spike/src/hpke-proof.mjs';
let sqlite;try{sqlite=await import('node:sqlite');}catch{}
let openssl;try{execFileSync('openssl',['version'],{stdio:'ignore'});openssl=true;}catch{}
const check=(name,fn)=>test(name,{skip:(!sqlite||!openssl)&&'Prova HTTPS exige SQLite nativo e openssl local.'},fn);
async function fixture(t,{bound=false,drop=false}={}){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-https-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const keyFile=path.join(base,'key.pem'),certFile=path.join(base,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=WritingRoom synthetic loopback','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
 await chmod(keyFile,0o600);const tls={key:await readFile(keyFile),cert:await readFile(certFile)};
 const file=path.join(base,'authority.sqlite'),identities=['owner','editor','other'];
 const authority=await createDurableSyntheticAuthority(file,identities);t.after(()=>{try{authority.close();}catch{}});
 authority.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'},{id:'private',folder:'research'}]});
 authority.createProject('other',{id:'otherbook',scenes:[{id:'one',folder:'draft'}]});
 let directory;const devices={};
 if(bound){const pins=[];for(const subject of identities){const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();pins.push({subject,fingerprint:card.fingerprint});devices[subject]={recipient,fingerprint:card.fingerprint,binding:await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject,device:subject,issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000})};}
 directory=await createDurableDeviceDirectory(path.join(base,'devices.sqlite'),pins);t.after(()=>directory.close());}
 let dropped=false;const transport=await startSyntheticHttpsTransport({authority,identities,tls,directory,...(drop?{enableBrowserFixture:true,shouldDropOperationResponse:()=>{if(dropped)return false;dropped=true;return true;}}:{})});t.after(()=>transport.close().catch(()=>{}));
 function request(route,body={},client={},extra={}){
  return new Promise((resolve,reject)=>{
   const raw=extra.raw??JSON.stringify(body),headers=extra.rawHeaders??{'content-type':'application/json',origin:transport.origin,...(client.cookie?{cookie:client.cookie}:{}),...(client.csrf?{'x-csrf-token':client.csrf}:{}),...extra.headers};
   const req=https.request(transport.origin+route,{method:extra.method||'POST',headers,ca:tls.cert,checkServerIdentity:(_host,cert)=>checkServerIdentity('127.0.0.1',cert),agent:false},res=>{const parts=[];res.on('data',b=>parts.push(b));res.on('end',()=>{const text=Buffer.concat(parts).toString();resolve({status:res.statusCode,headers:res.headers,body:text?JSON.parse(text):null});});res.on('error',reject);});
   req.on('error',reject);if(extra.chunked){req.write(raw);req.end();}else req.end(extra.method==='GET'?undefined:raw);
  });
 }
 async function login(subject,device=subject){const start=await request('/synthetic/login/start',{device});assert.equal(start.status,200);
  const code=transport.issueSyntheticCode({subject,device,state:start.body.state});const complete=await request('/synthetic/login/complete',{state:start.body.state,code},{csrf:start.body.csrf});assert.equal(complete.status,200);
  return {cookie:complete.headers['set-cookie'][0].split(';')[0],csrf:complete.body.csrf,complete};}
 const invite={projectId:'book',recipient:'editor',scope:['one'],capabilities:['read','propose'],expiresAt:Date.now()+3600_000};
 async function prove(client,subject){const d=devices[subject],begin=await request('/device-proof/begin',{binding:d.binding},client);assert.equal(begin.status,200);const response=await answerDeviceChallenge(d.recipient,d.binding,begin.body,{subject,device:subject,identityFingerprint:d.fingerprint});const confirmed=await request('/device-proof/confirm',{response},client);assert.equal(confirmed.status,200);return begin.body;}
 return {base,file,authority,transport,tls,identities,request,login,invite,directory,devices,prove};
}
check('HTTPS verified local certificate, host cookie and full durable invitation scope cycle',async t=>{
 const f=await fixture(t),owner=await f.login('owner'),editor=await f.login('editor'),other=await f.login('other');
 assert.match(owner.complete.headers['set-cookie'][0],/^__Host-wroom_synthetic=.*; Path=\/; Secure; HttpOnly; SameSite=Lax$/);
 assert.equal(owner.complete.headers['cache-control'],'no-store');assert.equal(owner.complete.headers['access-control-allow-origin'],undefined);
 const created=await f.request('/invitations/create',f.invite,owner);assert.equal(created.status,200);const token=created.body.token;
 assert.equal((await f.request('/invitations/preview',{token},other)).status,403);
 assert.deepEqual((await f.request('/invitations/preview',{token},editor)).body.scope,['one']);
 const accepted=await f.request('/invitations/accept',{token,explicit:true},editor);assert.equal(accepted.status,200);
 assert.equal((await f.request('/invitations/accept',{token,explicit:true},editor)).status,403);
 for(const action of ['read','propose'])assert.equal((await f.request('/access/check',{projectId:'book',sceneId:'one',action},editor)).status,200);
 for(const input of [{projectId:'book',sceneId:'private',action:'read'},{projectId:'otherbook',sceneId:'one',action:'read'},{projectId:'book',sceneId:'one',action:'manage'}])assert.equal((await f.request('/access/check',input,editor)).status,403);
 assert.deepEqual(f.authority.summary().receipts,[accepted.body.grantId]);
 await f.request('/invitations/revoke',{projectId:'book',invitationId:created.body.invitationId},owner);
 assert.equal((await f.request('/access/check',{projectId:'book',sceneId:'one',action:'read'},editor)).status,403);
});
check('HTTP Origin, Host, CSRF, spoofed subject, query and issuer routes fail closed',async t=>{
 const f=await fixture(t),owner=await f.login('owner'),editor=await f.login('editor');
 for(const headers of [{origin:'https://evil.invalid'},{origin:'null'},{origin:''},{host:'evil.invalid'},{'sec-fetch-site':'cross-site'},{'x-csrf-token':editor.csrf},{'x-csrf-token':''}])assert.equal((await f.request('/invitations/create',f.invite,owner,{headers})).status,403);
 assert.equal((await f.request('/invitations/create',{...f.invite,actor:'owner'},editor)).status,400);
 for(const route of ['/issueSyntheticCode','/synthetic/issue','/api/projects','/invitations/accept?token=secret'])assert.equal((await f.request(route,{},owner)).status,403);
 assert.equal((await f.request('/invitations/accept',{},owner,{method:'GET'})).status,403);
});
check('HTTP rejects malformed, duplicate, oversized, encoded and non-object JSON without events',async t=>{
 const f=await fixture(t),before=f.authority.summary().events;
 for(const raw of ['{','[]','null','{"device":"a","device":"b"}','{"device":"a","dev\\u0069ce":"b"}'])assert.equal((await f.request('/synthetic/login/start',{}, {},{raw})).status,400);
 assert.equal((await f.request('/synthetic/login/start',{}, {},{raw:'x'.repeat(17000)})).status,413);
 assert.equal((await f.request('/synthetic/login/start',{}, {},{raw:'x'.repeat(17000),chunked:true})).status,413);
 assert.equal((await f.request('/synthetic/login/start',{}, {},{headers:{'content-type':'text/plain'}})).status,415);
 assert.equal((await f.request('/synthetic/login/start',{}, {},{headers:{'content-encoding':'gzip'}})).status,415);
 assert.equal((await f.request('/synthetic/login/start',{}, {},{raw:Buffer.from([0xff])})).status,400);
 assert.equal(f.authority.summary().events,before);
});
check('HTTP duplicate security headers and cookies are refused',async t=>{
 const f=await fixture(t),owner=await f.login('owner');
 for(const name of ['Origin','Cookie','X-CSRF-Token']){
  const headers=['Host',new URL(f.transport.origin).host,'Origin',f.transport.origin,'Content-Type','application/json','Cookie',owner.cookie,'X-CSRF-Token',owner.csrf];
  headers.push(name,name==='Origin'?f.transport.origin:name==='Cookie'?owner.cookie:owner.csrf);
  assert.equal((await f.request('/logout',{},owner,{rawHeaders:headers})).status,400);
 }
 const combined=await f.request('/session',{}, {cookie:owner.cookie+'; '+owner.cookie},{method:'GET'});assert.equal(combined.status,403);
});
check('HTTP callback replay, logout and uniform unknown-session denial',async t=>{
 const f=await fixture(t),start=await f.request('/synthetic/login/start',{device:'laptop'});
 const code=f.transport.issueSyntheticCode({subject:'owner',device:'laptop',state:start.body.state});
 const body={state:start.body.state,code},first=await f.request('/synthetic/login/complete',body,{csrf:start.body.csrf});assert.equal(first.status,200);
 assert.equal((await f.request('/synthetic/login/complete',body,{csrf:start.body.csrf})).status,403);
 const client={cookie:first.headers['set-cookie'][0].split(';')[0],csrf:first.body.csrf};
 assert.equal((await f.request('/session',{},client,{method:'GET'})).status,200);
 assert.match((await f.request('/logout',{},client)).headers['set-cookie'][0],/Max-Age=0/);
 const stale=await f.request('/session',{},client,{method:'GET'}),unknown=await f.request('/session',{}, {},{method:'GET'});
 assert.equal(stale.status,403);assert.deepEqual(stale.body,unknown.body);
});
check('forwarded headers cannot evade the source rate bucket',async t=>{
 const f=await fixture(t);
 for(let n=0;n<5;n++)assert.equal((await f.request('/synthetic/login/start',{device:'a'},{},{headers:{'x-forwarded-for':'10.0.0.'+n}})).status,200);
 assert.equal((await f.request('/synthetic/login/start',{device:'a'},{},{headers:{'x-forwarded-for':'192.0.2.8'}})).status,403);
});
check('HTTP reboot drops cookies but retains receipts; restored snapshot cannot authorize old grants',async t=>{
 const f=await fixture(t),editor=await f.login('editor');const i=f.authority.invite('owner',f.invite);const receipt=f.authority.accept('editor',i.token,{explicit:true});
 await f.transport.close();f.authority.close();
 const authority=await openDurableSyntheticAuthority(f.file);t.after(()=>authority.close());
 const second=await startSyntheticHttpsTransport({authority,identities:f.identities,tls:f.tls});t.after(()=>second.close());
 const reply=await new Promise((resolve,reject)=>{const req=https.request(second.origin+'/session',{method:'GET',ca:f.tls.cert,agent:false,headers:{origin:second.origin,cookie:editor.cookie}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
 assert.equal(reply,403);assert.deepEqual(authority.summary().receipts,[receipt]);
 const backup=path.join(f.base,'backup.sqlite'),{checksum}=await authority.backup(backup);
 const restored=await restoreDurableSyntheticAuthority(backup,path.join(f.base,'restored.sqlite'),checksum);t.after(()=>restored.close());
 assert.throws(()=>restored.authorize('editor',{projectId:'book',sceneId:'one',action:'read'}),/DENIED/);
});
check('concurrent HTTPS accepts create exactly one durable receipt',async t=>{
 const f=await fixture(t),editor=await f.login('editor'),i=f.authority.invite('owner',f.invite);
 const replies=await Promise.all([1,2].map(()=>f.request('/invitations/accept',{token:i.token,explicit:true},editor)));
 assert.deepEqual(replies.map(r=>r.status).sort(),[200,403]);assert.equal(f.authority.summary().receipts.length,1);
});
check('busy writer returns generic denial without consuming invitation, then retry succeeds',async t=>{
 const f=await fixture(t),editor=await f.login('editor'),i=f.authority.invite('owner',f.invite);
 const blocker=new sqlite.DatabaseSync(f.file);blocker.exec('BEGIN IMMEDIATE');
 try{const reply=await f.request('/invitations/accept',{token:i.token,explicit:true},editor);assert.equal(reply.status,403);assert.deepEqual(reply.body,{error:'DENIED',mode:'SYNTHETIC_ONLY'});}
 finally{blocker.exec('ROLLBACK');blocker.close();}
 assert.equal(f.authority.summary().receipts.length,0);assert.equal((await f.request('/invitations/accept',{token:i.token,explicit:true},editor)).status,200);
});
check('global transport budget rejects excess requests before reading or mutating policy',async t=>{
 const f=await fixture(t),before=f.authority.summary().events;
 for(let n=0;n<120;n++)assert.equal((await f.request('/missing')).status,403);
 assert.equal((await f.request('/missing')).status,429);assert.equal(f.authority.summary().events,before);
});
check('browser-style GET requires same-origin Fetch Metadata when Origin is absent',async t=>{
 const f=await fixture(t),editor=await f.login('editor'),host=new URL(f.transport.origin).host;
 for(const [site,expected] of [['same-origin',200],['same-site',403],['cross-site',403],['none',403]]){
  const reply=await f.request('/session',{},editor,{method:'GET',rawHeaders:['Host',host,'Cookie',editor.cookie,'Sec-Fetch-Site',site]});assert.equal(reply.status,expected);
 }
 assert.equal((await f.request('/session',{},editor,{method:'GET',rawHeaders:['Host',host,'Cookie',editor.cookie]})).status,403);
 assert.equal((await f.request('/session',{},editor,{method:'GET',headers:{origin:'https://evil.invalid','sec-fetch-site':'same-origin'}})).status,403);
 assert.equal((await f.request('/_synthetic/browser',{},editor,{method:'GET'})).status,403);
});

check('HTTPS directory mode requires session-bound possession for owner and recipient operations',async t=>{
 const f=await fixture(t,{bound:true}),owner=await f.login('owner'),editor=await f.login('editor');
 assert.equal((await f.request('/invitations/create',f.invite,owner)).status,403);await f.prove(owner,'owner');
 const invitation=await f.request('/invitations/create',f.invite,owner);assert.equal(invitation.status,200);
 assert.equal((await f.request('/invitations/accept',{token:invitation.body.token,explicit:true},editor)).status,403);await f.prove(editor,'editor');
 assert.equal((await f.request('/invitations/accept',{token:invitation.body.token,explicit:true},editor)).status,200);
 assert.equal((await f.request('/access/check',{projectId:'book',sceneId:'one',action:'read'},editor)).status,200);
});
check('HTTPS revocation invalidates a proven device session without a public revocation controller',async t=>{
 const f=await fixture(t,{bound:true}),owner=await f.login('owner'),challenge=await f.prove(owner,'owner');
 f.directory.revokeBinding(challenge.binding_hash,{expectedRevision:f.directory.summary().revision});
 assert.equal((await f.request('/session',{},owner,{method:'GET'})).status,403);
 assert.equal((await f.request('/invitations/create',f.invite,owner)).status,403);
 for(const route of ['/directory/pin','/directory/revoke','/issueSyntheticCode'])assert.equal((await f.request(route,{},owner)).status,403);
});

check('browser script and stable restart port require explicit fixture mode',async t=>{
 const f=await fixture(t);
 assert.equal((await f.request('/_synthetic/proof.js',{}, {},{method:'GET'})).status,403);
 for(const fixturePort of [-1,65536,1.5,'0',12345])await assert.rejects(startSyntheticHttpsTransport({authority:f.authority,identities:f.identities,tls:f.tls,fixturePort}),/SYNTHETIC_FIXTURE_PORT_REQUIRED/);
 const browser=await startSyntheticHttpsTransport({authority:f.authority,identities:f.identities,tls:f.tls,enableBrowserFixture:true});t.after(()=>browser.close());
 const status=await new Promise((resolve,reject)=>{https.get(browser.origin+'/_synthetic/proof.js',{ca:f.tls.cert,agent:false},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject);});
 assert.equal(status,403); // Opt-in document without supplied test bundle still exposes no script.
});

check('HTTPS lost operation response reconciles durable commit and retry does not recreate its secret or event',async t=>{
 const f=await fixture(t,{bound:true,drop:true}),owner=await f.login('owner');await f.prove(owner,'owner');
 const domains=await f.request('/operations/context',{},owner);assert.equal(domains.status,200);
 const operation={operationId:randomUUID(),...domains.body,action:'invite',input:f.invite},before=f.authority.summary().events;
 await assert.rejects(f.request('/operations/execute',operation,owner));assert.equal(f.authority.summary().events,before+1);
 const reconciled=await f.request('/operations/reconcile',operation,owner);assert.equal(reconciled.status,200);assert.equal(reconciled.body.status,'committed');assert.equal(reconciled.body.token,undefined);
 const retried=await f.request('/operations/execute',operation,owner);assert.equal(retried.body.receipt.receiptId,reconciled.body.receipt.receiptId);assert.equal(retried.body.secretDelivery,'not-recoverable');assert.equal(f.authority.summary().events,before+1);
 assert.equal((await f.request('/operations/reconcile',{...operation,input:{...f.invite,scope:['private']}},owner)).status,403);
 assert.equal((await f.request('/operations/reconcile',operation,owner,{headers:{origin:'https://evil.invalid'}})).status,403);
 assert.equal((await f.request('/operations/reconcile',operation,owner,{headers:{'x-csrf-token':''}})).status,403);
});
check('HTTPS operation APIs require possession and never accept client-selected admission context',async t=>{
 const f=await fixture(t,{bound:true}),owner=await f.login('owner');assert.equal((await f.request('/operations/context',{},owner)).status,403);await f.prove(owner,'owner');
 const domains=(await f.request('/operations/context',{},owner)).body,operation={operationId:randomUUID(),...domains,action:'invite',input:f.invite};
 assert.equal((await f.request('/operations/execute',{...operation,bindingHash:'a'.repeat(64)},owner)).status,400);
 assert.equal((await f.request('/operations/context',{},owner,{method:'GET'})).status,403);
 const result=await f.request('/operations/execute',operation,owner);assert.equal(result.status,200);
 assert.equal((await f.request('/operations/reconcile',operation,owner)).body.receipt.receiptId,result.body.receipt.receiptId);
});
