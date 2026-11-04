import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {mkdtemp,readFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {startRecoveryHttpsFixture} from '../../../scripts/fixtures/recovery-https-fixture.mjs';
import {createProofRecipient,publicProofCard} from '../../sharing-spike/src/hpke-proof.mjs';
import {answerDeviceChallenge} from '../../sharing-spike/src/device-binding-proof.mjs';
let sqlite,openssl;try{sqlite=await import('node:sqlite');execFileSync('openssl',['version'],{stdio:'ignore'});openssl=true;}catch{}
const check=(name,fn)=>test(name,{skip:(!sqlite||!openssl)&&'SQLite e openssl necessários.'},fn);
async function fixture(t,options={}){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-recovery-https-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const key=path.join(base,'key.pem'),cert=path.join(base,'cert.pem');execFileSync('openssl',['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=WritingRoom recovery fixture','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});await chmod(key,0o600);
 const tls={key:await readFile(key),cert:await readFile(cert)},f=await startRecoveryHttpsFixture({base,tls,ca:tls.cert,...options});t.after(()=>f.close());
 const {origin,issuer}=f.endpoints,control=(action,args={})=>f.control({action,...args});
 function request(url,body,client={},extra={}){
  return new Promise((resolve,reject)=>{
   const req=https.request(url,{method:body===undefined?'GET':'POST',ca:tls.cert,agent:false,lookup:(_h,o,cb)=>cb(null,o.all?[{address:'127.0.0.1',family:4}]:'127.0.0.1',4),headers:{...(body===undefined?{'sec-fetch-site':'same-origin'}:{origin,'content-type':'application/json'}),...(client.cookie?{cookie:client.cookie}:{}),...(client.csrf?{'x-csrf-token':client.csrf}:{}),...extra}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,body:text&&res.headers['content-type']?.includes('application/json')?JSON.parse(text):null});});res.on('error',reject);});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
 }
 const send=(route,body,client={},extra={})=>request(origin+route,body,client,extra);
 async function login(){const start=await send('/oidc/login/start',{device:'device'});assert.equal(start.status,200);await control('authorize',{input:{authorizationUrl:start.body.authorizationUrl,sub:'owner-sub'}});const authorization=await request(start.body.authorizationUrl);assert.equal(authorization.status,302);const done=await request(authorization.headers.location,undefined,{cookie:start.headers['set-cookie'][0].split(';')[0]},{'sec-fetch-mode':'navigate','sec-fetch-dest':'document','sec-fetch-site':'cross-site'});assert.equal(done.status,303);const cookie=done.headers['set-cookie'].find(c=>c.startsWith('__Host-wroom_synthetic=')).split(';')[0],result=await send('/oidc/result',undefined,{cookie});assert.equal(result.status,200);return {cookie,csrf:result.body.csrf};}
 async function material(action){const recipient=await createProofRecipient(),result=await control(action,{card:await publicProofCard(recipient.publicKey)});return {...result,recipient};}
 const answer=(m,c)=>answerDeviceChallenge(m.recipient,m.binding,c,{subject:'owner',device:'device',identityFingerprint:m.fingerprint});
 async function prove(client,m){const begin=await send('/device-proof/begin',{binding:m.binding},client);assert.equal(begin.status,200);assert.equal((await send('/device-proof/confirm',{response:await answer(m,begin.body)},client)).status,200);}
 const owner=await login(),old=await material('bind_current');await prove(owner,old);
 const domains=(await send('/operations/context',{},owner)).body,operation={operationId:randomUUID(),...domains,action:'invite',input:{projectId:'oldbook',recipient:'editor',scope:['one'],capabilities:['read'],expiresAt:Date.now()+3600000}};
 const receipt=await send('/operations/execute',operation,owner);assert.equal(receipt.status,200);
 async function candidate({provePossession=true}={}){const m=await material('prepare_candidate');if(provePossession){const begin=await control('candidate_begin');await control('candidate_confirm',{response:await answer(m,begin)});}return m;}
 async function review(m){return control('begin_recovery',{expectedOldFingerprint:old.fingerprint,expectedNewFingerprint:m.fingerprint});}
 async function approve(r){return control('approve_recovery',{expectedSubject:'owner',expectedOldFingerprint:old.fingerprint,expectedNewFingerprint:r.review.newFingerprint,expectedTargetDirectoryDomain:r.review.targetCheckpoint.domain});}
 async function recover(m){const r=await review(m);await approve(r);return control('commit_recovery');}
 return {f,origin,issuer,send,request,control,login,material,prove,owner,old,domains,operation,receipt,candidate,review,approve,recover,answer};
}
check('HTTPS witness transition fences the old runtime before cutover and recovered identity inherits no scope or receipts',async t=>{
 const f=await fixture(t),m=await f.candidate(),record=await f.recover(m);
 assert.equal((await f.send('/session',undefined,f.owner)).status,403);assert.equal((await f.send('/operations/reconcile',f.operation,f.owner)).status,403);assert.equal((await f.send('/access/check',{projectId:'oldbook',sceneId:'one',action:'read'},f.owner)).status,403);
 assert.equal((await f.control('probe_source')).refused,true);await assert.rejects(f.control('restart_current'));assert.equal((await f.send('/session',undefined,f.owner)).status,403);await f.control('activate_recovered');assert.equal((await f.send('/session',undefined,f.owner)).status,403);
 const summary=await f.control('summary');assert.equal(summary.journal.events,0);assert.deepEqual(summary.journal.receipts,[]);
 const fresh=await f.login();assert.equal((await f.send('/operations/context',{},fresh)).status,403);assert.equal((await f.send('/device-proof/begin',{binding:f.old.binding},fresh)).status,403);await f.prove(fresh,m);
 const domains=(await f.send('/operations/context',{},fresh)).body;assert.equal(domains.journalDomain,record.journalDomain);assert.equal(domains.directoryDomain,record.directoryDomain);
 assert.equal((await f.send('/operations/reconcile',f.operation,fresh)).status,403);
 assert.equal((await f.send('/operations/reconcile',{...f.operation,...domains},fresh)).body.status,'not_found');
 assert.equal((await f.send('/access/check',{projectId:'oldbook',sceneId:'one',action:'read'},fresh)).status,403);
});
check('HTTPS offers no recovery/bootstrap/approval route even to a valid proven session',async t=>{
 const f=await fixture(t);for(const route of ['/recovery/begin','/recovery/approve','/recovery/confirm','/witness/bootstrap','/witness/recover','/directory/pin','/control?action=approve_recovery'])assert.equal((await f.send(route,{},f.owner)).status,403);
 assert.equal((await f.send('/session',undefined,f.owner)).status,200);
});
check('bad private reconfirmation or missing candidate possession cannot alter the live HTTPS trust epoch',async t=>{
 const f=await fixture(t),m=await f.candidate({provePossession:false}),before=(await f.control('summary')).witness;
 await assert.rejects(f.review(m));const challenge=await f.control('candidate_begin');await f.control('candidate_confirm',{response:await f.answer(m,challenge)});const r=await f.review(m);
 await assert.rejects(f.control('approve_recovery',{expectedSubject:'owner',expectedOldFingerprint:f.old.fingerprint,expectedNewFingerprint:'0'.repeat(64),expectedTargetDirectoryDomain:r.review.targetCheckpoint.domain}));await assert.rejects(f.control('commit_recovery'));
 assert.deepEqual((await f.control('summary')).witness,before);assert.equal((await f.send('/operations/reconcile',f.operation,f.owner)).body.receipt.receiptId,f.receipt.body.receipt.receiptId);
});
check('recovered HTTPS restart retains witness and new receipts but discards session proof',async t=>{
 const f=await fixture(t),m=await f.candidate();await f.recover(m);await f.control('activate_recovered');let client=await f.login();await f.prove(client,m);await f.control('seed_new_project');
 const domains=(await f.send('/operations/context',{},client)).body,operation={...f.operation,...domains,operationId:randomUUID(),input:{...f.operation.input,projectId:'newbook'}};
 const result=await f.send('/operations/execute',operation,client);assert.equal(result.status,200);const record=(await f.control('summary')).witness;
 await f.control('restart_current');assert.deepEqual((await f.control('summary')).witness,record);assert.equal((await f.send('/session',undefined,client)).status,403);
 client=await f.login();assert.equal((await f.send('/operations/reconcile',operation,client)).status,403);await f.prove(client,m);
 assert.equal((await f.send('/operations/reconcile',operation,client)).body.receipt.receiptId,result.body.receipt.receiptId);
});
check('older checkpoint cannot replace witnessed HTTPS directory and failed probe leaves current session intact',async t=>{
 const f=await fixture(t);await f.control('backup_current');await f.prove(f.owner,f.old);assert.equal((await f.control('probe_snapshot')).refused,true);
 assert.equal((await f.send('/session',undefined,f.owner)).status,200);assert.equal((await f.send('/operations/reconcile',f.operation,f.owner)).body.receipt.receiptId,f.receipt.body.receipt.receiptId);
});
check('witnessed HTTPS operation guards retain exact Origin and CSRF after recovery',async t=>{
 const f=await fixture(t),m=await f.candidate();await f.recover(m);await f.control('activate_recovered');const client=await f.login();await f.prove(client,m);
 for(const headers of [{origin:f.issuer},{'x-csrf-token':''},{'sec-fetch-site':'cross-site'}])assert.equal((await f.send('/operations/context',{},client,headers)).status,403);
 assert.equal((await f.send('/operations/context',{},client)).status,200);
});
check('private commit acknowledgment failure is reconciled from witness without replaying recovery or re-enrolling',async t=>{
 const f=await fixture(t,{afterRecoveryCommit(){throw new Error('ACK_LOST');}}),m=await f.candidate(),r=await f.review(m);await f.approve(r);await assert.rejects(f.control('commit_recovery'),/ACK_LOST/);
 assert.equal((await f.send('/session',undefined,f.owner)).status,403);assert.equal((await f.control('summary')).witness.epoch,1);
 await assert.rejects(f.control('replay_recovery'));const result=await f.control('reconcile_recovery');assert.equal(result.epoch,1);await f.control('activate_recovered');
 const client=await f.login();await f.prove(client,m);assert.equal((await f.send('/operations/context',{},client)).body.journalDomain,result.journalDomain);
});
