import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {mkdtemp,readFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {startSubjectRecoveryHttpsFixture} from '../../../scripts/fixtures/subject-recovery-https-fixture.mjs';
import {createProofRecipient,publicProofCard} from '../../sharing-spike/src/hpke-proof.mjs';
import {answerDeviceChallenge} from '../../sharing-spike/src/device-binding-proof.mjs';
let sqlite,openssl;try{sqlite=await import('node:sqlite');execFileSync('openssl',['version'],{stdio:'ignore'});openssl=true;}catch{}
const check=(name,fn)=>test(name,{skip:(!sqlite||!openssl)&&'SQLite e openssl necessários.'},fn);
async function fixture(t,options={}){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-subject-https-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const key=path.join(base,'key.pem'),cert=path.join(base,'cert.pem');execFileSync('openssl',['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=WritingRoom recovery fixture','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});await chmod(key,0o600);
 const tls={key:await readFile(key),cert:await readFile(cert)},f=await startSubjectRecoveryHttpsFixture({base,tls,ca:tls.cert,...options});t.after(()=>f.close());
 const {origin,issuer}=f.endpoints,control=(action,args={})=>f.control({action,...args});
 function request(url,body,client={},extra={}){
  return new Promise((resolve,reject)=>{
   const req=https.request(url,{method:body===undefined?'GET':'POST',ca:tls.cert,agent:false,lookup:(_h,o,cb)=>cb(null,o.all?[{address:'127.0.0.1',family:4}]:'127.0.0.1',4),headers:{...(body===undefined?{'sec-fetch-site':'same-origin'}:{origin,'content-type':'application/json'}),...(client.cookie?{cookie:client.cookie}:{}),...(client.csrf?{'x-csrf-token':client.csrf}:{}),...extra}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,body:text&&res.headers['content-type']?.includes('application/json')?JSON.parse(text):null});});res.on('error',reject);});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
 }
 const send=(route,body,client={},extra={})=>request(origin+route,body,client,extra);
 async function prelogin(subject){const start=await send('/oidc/login/start',{device:'device'});assert.equal(start.status,200);await control('authorize',{input:{authorizationUrl:start.body.authorizationUrl,sub:subject+'-sub'}});const authorization=await request(start.body.authorizationUrl);assert.equal(authorization.status,302);return {url:authorization.headers.location,cookie:start.headers['set-cookie'][0].split(';')[0]};}
 async function complete(p,expected=303,consume=true){const done=await request(p.url,undefined,{cookie:p.cookie},{'sec-fetch-mode':'navigate','sec-fetch-dest':'document','sec-fetch-site':'cross-site'});if(expected!==303){assert.equal(done.status,expected);return done;}assert.equal(done.status,303);const cookie=done.headers['set-cookie'].find(c=>c.startsWith('__Host-wroom_synthetic=')).split(';')[0];if(!consume)return {cookie};const result=await send('/oidc/result',undefined,{cookie});assert.equal(result.status,200);return {cookie,csrf:result.body.csrf};}
 async function login(subject){return complete(await prelogin(subject));}
 async function material(subject,action){const recipient=await createProofRecipient(),result=await control(action,{subject,card:await publicProofCard(recipient.publicKey)});return {...result,recipient};}
 const answer=(m,c)=>answerDeviceChallenge(m.recipient,m.binding,c,{subject:m.binding.payload.subject,device:m.binding.payload.device,identityFingerprint:m.fingerprint});
 async function prove(client,m){const begin=await send('/device-proof/begin',{binding:m.binding},client);assert.equal(begin.status,200);assert.equal((await send('/device-proof/confirm',{response:await answer(m,begin.body)},client)).status,200);}
 async function setup(subject){const client=await login(subject),m=await material(subject,'bind_current');await prove(client,m);const domains=(await send('/operations/context',{},client)).body;const operation={operationId:randomUUID(),...domains,action:'invite',input:{projectId:'book',recipient:'reviewer',scope:['one'],capabilities:['read'],expiresAt:Date.now()+3600000}};const receipt=await send('/operations/execute',operation,client);assert.equal(receipt.status,200);return {subject,client,m,domains,operation,receipt};}
 async function prepare(a){const m=await material(a.subject,'prepare_candidate'),challenge=await control('candidate_begin',{subject:a.subject});await control('candidate_confirm',{subject:a.subject,response:await answer(m,challenge)});const r=await control('begin_recovery',{subject:a.subject,expectedOldFingerprint:a.m.fingerprint,expectedNewFingerprint:m.fingerprint});await control('approve_recovery',{subject:a.subject,expectedSubject:a.subject,expectedOldFingerprint:a.m.fingerprint,expectedNewFingerprint:m.fingerprint,expectedTargetDirectoryDomain:r.review.targetCheckpoint.domain});return m;}
 return {f,origin,issuer,send,request,control,login,prelogin,complete,material,prove,setup,prepare,answer};
}
check('HTTPS account recovery preserves other account sessions, domains and receipts on the same origin',async t=>{
 const f=await fixture(t),a=await f.setup('alice'),b=await f.setup('bob'),before=await f.control('summary',{subject:'bob'}),m=await f.prepare(a);
 const committed=await f.control('commit_recovery',{subject:'alice'});
 assert.equal((await f.send('/session',undefined,a.client)).status,403);
 assert.equal((await f.send('/operations/reconcile',b.operation,b.client)).body.receipt.receiptId,b.receipt.body.receipt.receiptId);
 assert.deepEqual(await f.control('activate_recovered',{subject:'alice'}),f.f.endpoints);
 assert.equal((await f.send('/session',undefined,b.client)).body.subject,'bob');
 assert.deepEqual((await f.send('/operations/context',{},b.client)).body,b.domains);
 assert.deepEqual(await f.control('summary',{subject:'bob'}),before);
 const fresh=await f.login('alice');assert.equal((await f.send('/operations/context',{},fresh)).status,403);
 assert.equal((await f.send('/device-proof/begin',{binding:a.m.binding},fresh)).status,403);await f.prove(fresh,m);
 const domains=(await f.send('/operations/context',{},fresh)).body;
 assert.equal(domains.journalDomain,committed.journalDomain);assert.equal(domains.directoryDomain,committed.directoryDomain);
 assert.equal((await f.send('/operations/reconcile',a.operation,fresh)).status,403);
 assert.equal((await f.send('/operations/reconcile',{...a.operation,...domains},fresh)).body.status,'not_found');
 assert.equal((await f.send('/access/check',{projectId:'book',sceneId:'one',action:'read'},fresh)).status,403);
 assert.equal((await f.control('summary',{subject:'alice'})).journal.events,0);
});
check('OIDC callbacks pending before recovery are invalidated only for the recovered subject',async t=>{
 const f=await fixture(t),a=await f.setup('alice'),pa=await f.prelogin('alice'),pb=await f.prelogin('bob');
 await f.prepare(a);await f.control('commit_recovery',{subject:'alice'});await f.control('activate_recovered',{subject:'alice'});
 await f.complete(pa,403);const bob=await f.complete(pb);assert.equal((await f.send('/session',undefined,bob)).body.subject,'bob');
 assert.equal((await f.send('/operations/context',{},bob)).status,403);
});
check('HTTPS rejects cross-account bindings, proof responses, CSRF, domains and caller-selected account',async t=>{
 const f=await fixture(t),a=await f.setup('alice'),b=await f.setup('bob');
 assert.equal((await f.send('/device-proof/begin',{binding:a.m.binding},b.client)).status,403);
 const challenge=await f.send('/device-proof/begin',{binding:a.m.binding},a.client);
 const response=await f.answer(a.m,challenge.body);
 assert.equal((await f.send('/device-proof/confirm',{response},b.client)).status,403);
 assert.equal((await f.send('/device-proof/confirm',{response},a.client)).status,200);
 assert.equal((await f.send('/operations/context',{}, {...b.client,csrf:a.client.csrf})).status,403);
 assert.equal((await f.send('/operations/reconcile',a.operation,b.client)).status,403);
 for(const body of [{subject:'alice'},{actor:'alice'},{directoryDomain:a.domains.directoryDomain}])assert.equal((await f.send('/operations/context',body,b.client)).status,400);
 for(const route of ['/recovery/confirm','/witness/bootstrap','/directory/pin','/synthetic/login/start'])assert.equal((await f.send(route,{},b.client)).status,403);
 for(const headers of [{origin:f.issuer},{'sec-fetch-site':'cross-site'},{'x-csrf-token':''}])assert.equal((await f.send('/operations/context',{},b.client,headers)).status,403);
 assert.equal((await f.send('/operations/context',{},b.client)).status,200);
});
check('HTTPS full restart reopens each current domain and requires fresh possession for both accounts',async t=>{
 const f=await fixture(t),a=await f.setup('alice'),b=await f.setup('bob'),m=await f.prepare(a);
 await f.control('commit_recovery',{subject:'alice'});await f.control('activate_recovered',{subject:'alice'});await f.control('seed_new_project',{subject:'alice'});
 const alice=await f.login('alice');await f.prove(alice,m);const domains=(await f.send('/operations/context',{},alice)).body;
 const op={...a.operation,...domains,operationId:randomUUID(),input:{...a.operation.input,projectId:'newbook'}},result=await f.send('/operations/execute',op,alice);assert.equal(result.status,200);
 const before=await Promise.all(['alice','bob'].map(subject=>f.control('summary',{subject})));
 await f.control('restart_current');
 assert.equal((await f.send('/session',undefined,alice)).status,403);assert.equal((await f.send('/session',undefined,b.client)).status,403);
 for(const [i,subject]of ['alice','bob'].entries()){const current=await f.control('summary',{subject});assert.deepEqual(current.witness,before[i].witness);assert.deepEqual(current.journal,before[i].journal);}
 for(const [subject,material,operation,receipt]of [['alice',m,op,result],['bob',b.m,b.operation,b.receipt]]){
  const client=await f.login(subject);assert.equal((await f.send('/operations/reconcile',operation,client)).status,403);await f.prove(client,material);
  assert.equal((await f.send('/operations/reconcile',operation,client)).body.receipt.receiptId,receipt.body.receipt.receiptId);
 }
});
check('lost recovery acknowledgment is reconciled privately without resetting the other HTTPS account',async t=>{
 const f=await fixture(t,{afterRecoveryCommit(){throw new Error('ACK_LOST');}}),a=await f.setup('alice'),b=await f.setup('bob');await f.prepare(a);
 await assert.rejects(f.control('commit_recovery',{subject:'alice'}),/ACK_LOST/);await assert.rejects(f.control('restart_current'));
 assert.equal((await f.send('/operations/context',{},b.client)).status,200);
 await assert.rejects(f.control('reconcile_recovery',{subject:'bob'}));
 assert.equal((await f.control('reconcile_recovery',{subject:'alice'})).epoch,1);await f.control('activate_recovered',{subject:'alice'});
 assert.equal((await f.send('/operations/reconcile',b.operation,b.client)).body.receipt.receiptId,b.receipt.body.receipt.receiptId);
});
check('logout invalidates only its accounts pending OIDC callbacks and results',async t=>{
 const f=await fixture(t),a=await f.setup('alice'),pa=await f.prelogin('alice'),pb=await f.prelogin('bob');
 assert.equal((await f.send('/logout',{},a.client)).status,200);
 await f.complete(pa,403);const bob=await f.complete(pb);assert.equal((await f.send('/session',undefined,bob)).body.subject,'bob');
});
check('recovery during asynchronous token exchange invalidates only the callback for that subject',async t=>{
 for(const subject of ['alice','bob']){
  let pause=false,entered,release;const waiting=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
  const f=await fixture(t,{async afterTokenExchange(){if(pause){entered();await gate;}}});
  const a=await f.setup('alice'),b=await f.setup('bob');await f.prepare(a);const p=await f.prelogin(subject);
  pause=true;const callback=f.complete(p,subject==='alice'?403:303);
  try{await waiting;await f.control('commit_recovery',{subject:'alice'});await f.control('activate_recovered',{subject:'alice'});}finally{release();}
  const result=await callback;if(subject==='bob')assert.equal((await f.send('/session',undefined,result)).body.subject,'bob');
  assert.equal((await f.send('/operations/context',{},b.client)).status,200);
 }
});
check('unconsumed OIDC result for bob survives alice activation while alice old result is refused',async t=>{
 const f=await fixture(t),a=await f.setup('alice');
 const alice=await f.complete(await f.prelogin('alice'),303,false),bob=await f.complete(await f.prelogin('bob'),303,false);
 await f.prepare(a);await f.control('commit_recovery',{subject:'alice'});await f.control('activate_recovered',{subject:'alice'});
 assert.equal((await f.send('/oidc/result',undefined,alice)).status,403);
 assert.equal((await f.send('/oidc/result',undefined,bob)).status,200);
 assert.equal((await f.send('/oidc/result',undefined,bob)).status,403);
});
