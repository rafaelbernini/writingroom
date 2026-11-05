import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, stat, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createSubjectRecoveryMap,openSubjectRecoveryMap} from '../../sharing-spike/src/subject-recovery-map.mjs';
import {randomUUID} from 'node:crypto';
import {createDurableSyntheticAuthority} from '../../sharing-spike/src/durable-authority.mjs';
import {createDurableDeviceDirectory} from '../../sharing-spike/src/durable-device-directory.mjs';
import {createTrustWitness, openTrustWitness} from '../../sharing-spike/src/trust-witness.mjs';
import {openWitnessedDeviceDirectory} from '../../sharing-spike/src/witnessed-device-directory.mjs';
import {createRecoveryFixtureAuthority, createRecoveryFixtureCoordinator} from '../../sharing-spike/src/recovery-fixture.mjs';
import {createProofSigner, proofSignerCard, signDeviceBinding, answerDeviceChallenge} from '../../sharing-spike/src/device-binding-proof.mjs';
import {createProofRecipient, publicProofCard} from '../../sharing-spike/src/hpke-proof.mjs';
import {createDeviceBoundSessionHarness} from '../../sharing-spike/src/device-bound-session.mjs';

// Private control only: separate domains per opaque account, never a shared journal reset.
async function fixture(t) {
 const base=await mkdtemp(path.join(tmpdir(),'wroom-subjects-'));
 const resources=[];
 t.after(async()=>{for(const r of resources.reverse()){try{r.close();}catch{}}await rm(base,{recursive:true,force:true});});
 const now=Date.now;
 const keep=r=>(resources.push(r),r);
 const file=()=>path.join(base,randomUUID()+'.sqlite');
 async function device(subject,signer,card,name) {
  const recipient=await createProofRecipient();
  const binding=await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject,device:name,issuedAt:now()-1000,expiresAt:now()+3600000});
  return {subject,signer,card,recipient,binding,name};
 }
 async function activate(directory,m) {
  const challenge=await directory.begin(m.binding);
  await directory.confirm(await answerDeviceChallenge(m.recipient,m.binding,challenge,{subject:m.subject,device:m.name,identityFingerprint:m.card.fingerprint,now:now()}));
 }
 async function account(subject) {
  const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey);
  const first=await device(subject,signer,card,'first'),second=await device(subject,signer,card,'second');
  const directoryFile=file(),witnessFile=file();
  const raw=keep(await createDurableDeviceDirectory(directoryFile,[{subject,fingerprint:card.fingerprint}]));
  const journalFile=file(),journal=keep(await createDurableSyntheticAuthority(journalFile,['alice','bob']));
  const root=await createRecoveryFixtureAuthority();
  const witness=keep(await createTrustWitness(witnessFile,{directory:raw,journal,subject,expectedFingerprint:card.fingerprint,recoveryKey:root.recoveryKey,expectedRecoveryThumbprint:root.thumbprint}));
  const directory=keep(await openWitnessedDeviceDirectory(directoryFile,witness));
  await activate(directory,first);await activate(directory,second);
  journal.createProject(subject,{id:'book',scenes:[{id:'one',folder:'draft'}]});
  const coordinator=keep(createRecoveryFixtureCoordinator({witness}));
  return {subject,first,second,card,directoryFile,witnessFile,journalFile,directory,journal,root,witness,coordinator};
 }
 async function candidate(a) {
  const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),m=await device(a.subject,signer,card,'replacement');
  const directoryFile=file(),directory=keep(await createDurableDeviceDirectory(directoryFile,[{subject:a.subject,fingerprint:card.fingerprint}]));
  const journalFile=file(),journal=keep(await createDurableSyntheticAuthority(journalFile,['alice','bob']));
  await activate(directory,m);
  return {directoryFile,journalFile,directory,journal,m};
 }
 function request(a,c) {return {subject:a.subject,candidateDirectory:c.directory,candidateJournal:c.journal,binding:c.m.binding,expectedOldFingerprint:a.card.fingerprint,expectedNewFingerprint:c.m.card.fingerprint};}
 async function prepare(a,c) {
  const challenge=await a.coordinator.begin(request(a,c));
  const authorization=await a.root.approve({challenge,expectedSubject:a.subject,expectedOldFingerprint:a.card.fingerprint,expectedNewFingerprint:c.m.card.fingerprint,expectedTargetDirectoryDomain:challenge.review.targetCheckpoint.domain});
  return {challengeId:challenge.challengeId,authorization};
 }
 async function session(a,m,{proofStatus=200}={}) {
  const h=createDeviceBoundSessionHarness({authority:a.journal,directory:a.directory,identities:['alice','bob']});
  const send=(route,body={},client={})=>h.dispatch({method:'POST',origin:h.origin,source:'fixture',path:route,body,...client});
  const start=await send('/synthetic/login/start',{device:m.name});
  const code=h.issueSyntheticCode({subject:a.subject,device:m.name,state:start.body.state});
  const done=await send('/synthetic/login/complete',{state:start.body.state,code},{csrf:start.body.csrf});
  assert.equal(done.status,200);
  const client={cookie:done.headers['Set-Cookie'].split(';')[0],csrf:done.body.csrf};
  const begin=await send('/device-proof/begin',{binding:m.binding},client);assert.equal(begin.status,proofStatus);
  if(proofStatus!==200)return {send:(route,body={})=>send(route,body,client)};
  const response=await answerDeviceChallenge(m.recipient,m.binding,begin.body,{subject:a.subject,device:m.name,identityFingerprint:m.card.fingerprint,now:now()});
  assert.equal((await send('/device-proof/confirm',{response},client)).status,200);
  return {send:(route,body={})=>send(route,body,client)};
 }
 return {base,alice:await account('alice'),bob:await account('bob'),candidate,prepare,request,activate,session,keep};
}

const {DatabaseSync:Database}=await import('node:sqlite');
const digest=s=>createHash('sha256').update(s).digest('hex');
async function mapped(t,options={}){
 const f=await fixture(t),mapFile=path.join(f.base,'map.sqlite');
 const anchors=[f.alice,f.bob].map(a=>({subject:a.subject,witness:a.witness,anchorId:a.witness.read().anchorId}));
 const settings={root:f.base,anchors,...options};
 const map=f.keep(await createSubjectRecoveryMap(mapFile,settings));
 const locators=a=>({directoryFile:path.basename(a.directoryFile),journalFile:path.basename(a.journalFile)});
 for(const a of [f.alice,f.bob])await map.rememberCurrent(a.subject,locators(a));
 const reopen=async(file=mapFile,opts={})=>f.keep(await openSubjectRecoveryMap(file,{...settings,...opts}));
 const resolved=async(subject,source=map)=>f.keep(await source.resolve(subject));
 const prepare=async(a,c,source=map)=>{
  const challenge=await a.coordinator.begin(f.request(a,c));
  await source.prepareTarget(a.subject,{review:challenge.review,...locators(c)});
  const authorization=await a.root.approve({challenge,expectedSubject:a.subject,expectedOldFingerprint:a.card.fingerprint,expectedNewFingerprint:c.m.card.fingerprint,expectedTargetDirectoryDomain:challenge.review.targetCheckpoint.domain});
  return {challengeId:challenge.challengeId,authorization};
 };
 const snapshot=async name=>{const file=path.join(f.base,name+'.sqlite'),db=new Database(mapFile);try{db.prepare('VACUUM INTO ?').run(file);}finally{db.close();}return file;};
 return {...f,map,mapFile,anchors,locators,reopen,resolved,prepare,snapshot};
}

test('public locator index reopens current accounts without persisting keys or approval tokens',async t=>{
 const f=await mapped(t);f.map.close();const map=await f.reopen();
 for(const a of [f.alice,f.bob]){const r=await f.resolved(a.subject,map);assert.equal((await r.directory.authorize(a.first.binding)).subject,a.subject);assert.equal(r.journal.authorize(a.subject,{projectId:'book',sceneId:'one',action:'read'}),true);assert.equal((await map.rememberCurrent(a.subject,f.locators(a))).remembered,false);}
 const db=new Database(f.mapFile,{readOnly:true}),rows=db.prepare('SELECT payload FROM locators').all();db.close();
 for(const {payload}of rows)assert.deepEqual(Object.keys(JSON.parse(payload)).sort(),['anchorId','directoryDomain','directoryFile','epoch','fingerprint','journalDomain','journalFile','subject']);
 assert.equal((await stat(f.mapFile)).mode&0o777,0o600);
});

test('prepared target cannot supersede witness; after commit it resolves without finalizing a map pointer',async t=>{
 const f=await mapped(t),a=f.alice,c=await f.candidate(a),approval=await f.prepare(a,c),before=f.bob.witness.read();
 const old=await f.resolved('alice');assert.equal(old.trust.epoch,0);assert.equal(old.journal.summary().events,1);
 await a.coordinator.confirm(approval);
 await assert.rejects(old.directory.authorize(a.first.binding));
 const current=await f.resolved('alice',await f.reopen());assert.equal(current.trust.epoch,1);assert.equal(current.journal.summary().events,0);assert.equal((await current.directory.authorize(c.m.binding)).subject,'alice');
 assert.deepEqual(f.bob.witness.read(),before);assert.equal((await (await f.resolved('bob')).directory.authorize(f.bob.first.binding)).subject,'bob');
});

test('old map snapshot blocks only the recovered account and explicit repair validates witness-selected files',async t=>{
 const f=await mapped(t),a=f.alice,c=await f.candidate(a),backup=await f.snapshot('old-map');
 await a.coordinator.confirm(await f.prepare(a,c));const old=await f.reopen(backup);
 await assert.rejects(old.resolve('alice'),/SUBJECT_RECOVERY_MAP_REJECTED/);
 assert.equal((await (await f.resolved('bob',old)).directory.authorize(f.bob.second.binding)).subject,'bob');
 await assert.rejects(old.rememberCurrent('alice',f.locators(a)));
 await assert.rejects(old.rememberCurrent('alice',f.locators(f.bob)));
 assert.equal((await old.rememberCurrent('alice',f.locators(c))).remembered,true);
 assert.equal((await f.resolved('alice',old)).trust.epoch,1);
});

test('coherent checksum tampering cannot relabel an account, swap files or revive an old epoch',async t=>{
 for(const change of ['subject','anchor','epoch','files','journal']){
  const f=await mapped(t),copy=await f.snapshot('tampered-'+change),db=new Database(copy),row=db.prepare('SELECT * FROM locators WHERE subject=?').get('alice'),r=JSON.parse(row.payload);
  if(change==='subject')r.subject='bob';if(change==='anchor')r.anchorId=f.bob.witness.read().anchorId;if(change==='epoch')r.epoch++;
  if(change==='files'){r.directoryFile=path.basename(f.bob.directoryFile);r.journalFile=path.basename(f.bob.journalFile);}if(change==='journal')r.journalFile=path.basename(f.bob.journalFile);
  const payload=JSON.stringify(r);db.prepare('UPDATE locators SET payload=?,checksum=? WHERE subject=?').run(payload,digest(payload),'alice');db.close();
  const map=await f.reopen(copy);await assert.rejects(map.resolve('alice'));assert.equal((await f.resolved('bob',map)).trust.epoch,0);
 }
});

test('map file cannot choose its own witness or bootstrap a missing map/anchor',async t=>{
 const f=await mapped(t);await assert.rejects(openSubjectRecoveryMap(path.join(f.base,'missing.sqlite'),{root:f.base,anchors:f.anchors}));
 await assert.rejects(f.reopen(f.mapFile,{anchors:[{subject:'alice',anchorId:f.alice.witness.read().anchorId,witness:f.bob.witness}]}));
 const absent=await createSubjectRecoveryMap(path.join(f.base,'empty.sqlite'),{root:f.base,anchors:f.anchors});f.keep(absent);await assert.rejects(absent.resolve('alice'));
 await assert.rejects(f.map.resolve('unknown'));
});

test('locator paths reject traversal, absolute paths and symlinks without modifying target files',async t=>{
 const f=await mapped(t),a=f.alice,before=digest(await readFile(a.directoryFile));
 for(const directoryFile of ['../'+path.basename(a.directoryFile),a.directoryFile,'nested/file.sqlite'])await assert.rejects(f.map.rememberCurrent('alice',{...f.locators(a),directoryFile}));
 await symlink(a.directoryFile,path.join(f.base,'linked.sqlite'));
 await assert.rejects(f.map.rememberCurrent('alice',{...f.locators(a),directoryFile:'linked.sqlite'}));
 assert.equal(digest(await readFile(a.directoryFile)),before);assert.equal((await f.resolved('bob')).trust.epoch,0);
});

test('a fresh controller session from mapped files still requires fresh per-session possession',async t=>{
 const f=await mapped(t),a=f.alice,c=await f.candidate(a);await a.coordinator.confirm(await f.prepare(a,c));
 const current=await f.resolved('alice',await f.reopen()),h=createDeviceBoundSessionHarness({authority:current.journal,directory:current.directory,identities:['alice']});
 const send=(route,body={},client={})=>h.dispatch({method:'POST',origin:h.origin,source:'fixture',path:route,body,...client});
 const start=await send('/synthetic/login/start',{device:c.m.name}),code=h.issueSyntheticCode({subject:'alice',device:c.m.name,state:start.body.state});
 const done=await send('/synthetic/login/complete',{state:start.body.state,code},{csrf:start.body.csrf}),client={cookie:done.headers['Set-Cookie'].split(';')[0],csrf:done.body.csrf};
 assert.equal((await send('/operations/context',{},client)).status,403);const challenge=await send('/device-proof/begin',{binding:c.m.binding},client);assert.equal(challenge.status,200);
 const response=await answerDeviceChallenge(c.m.recipient,c.m.binding,challenge.body,{subject:'alice',device:c.m.name,identityFingerprint:c.m.card.fingerprint});
 assert.equal((await send('/device-proof/confirm',{response},client)).status,200);assert.equal((await send('/operations/context',{},client)).body.journalDomain,current.trust.journalDomain);
});

const moduleUrl=name=>new URL('../../sharing-spike/src/'+name,import.meta.url).href;
const childImports=`import {openTrustWitness} from ${JSON.stringify(moduleUrl('trust-witness.mjs'))};import {openSubjectRecoveryMap} from ${JSON.stringify(moduleUrl('subject-recovery-map.mjs'))};import {openDurableDeviceDirectory} from ${JSON.stringify(moduleUrl('durable-device-directory.mjs'))};import {openDurableSyntheticAuthority} from ${JSON.stringify(moduleUrl('durable-authority.mjs'))};import {createRecoveryFixtureCoordinator} from ${JSON.stringify(moduleUrl('recovery-fixture.mjs'))};import {once} from 'node:events';`;
function config(f){return {root:f.base,mapFile:f.mapFile,anchors:[f.alice,f.bob].map(a=>({subject:a.subject,anchorId:a.witness.read().anchorId,file:a.witnessFile}))};}
const childSetup=`const input=JSON.parse(process.argv[1]),anchors=[];for(const a of input.anchors)anchors.push({subject:a.subject,anchorId:a.anchorId,witness:await openTrustWitness(a.file)});`;
function stopAt(t,script,input){
 const child=spawn(process.execPath,['--input-type=module','-e',childImports+childSetup+script,JSON.stringify(input)],{stdio:['ignore','ignore','ignore','ipc']});
 const timer=setTimeout(()=>child.kill('SIGKILL'),10000);t.after(()=>{clearTimeout(timer);if(child.exitCode===null)child.kill('SIGKILL');});
 return child;
}
async function kill(child){const exited=once(child,'exit');child.kill('SIGKILL');const [code,signal]=await exited;assert.equal(code,null);assert.equal(signal,'SIGKILL');}

test('a separate controller process resolves both accounts from public configuration without private keys',async t=>{
 const f=await mapped(t),script=childImports+childSetup+`const map=await openSubjectRecoveryMap(input.mapFile,{root:input.root,anchors});const out=[];for(const a of input.anchors){const r=await map.resolve(a.subject);out.push({subject:(await r.directory.authorize(input.bindings[a.subject])).subject,epoch:r.trust.epoch});r.close();}map.close();for(const a of anchors)a.witness.close();process.stdout.write(JSON.stringify(out));`;
 const out=execFileSync(process.execPath,['--input-type=module','-e',script,JSON.stringify({...config(f),bindings:{alice:f.alice.first.binding,bob:f.bob.first.binding}})],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','ignore']});
 assert.deepEqual(JSON.parse(out),[{subject:'alice',epoch:0},{subject:'bob',epoch:0}]);
});

test('SIGKILL after witness recovery resumes prepared target or blocks only its missing locator',async t=>{
 for(const prepared of [true,false]){
  const f=await mapped(t),a=f.alice,c=await f.candidate(a);
  if(prepared)await f.prepare(a,c); // Public locator prepared; its unused approval is not passed to the child.
  const child=stopAt(t,`const witness=anchors.find(a=>a.subject==='alice').witness,d=await openDurableDeviceDirectory(input.directoryFile),j=await openDurableSyntheticAuthority(input.journalFile),coordinator=createRecoveryFixtureCoordinator({witness});const challenge=await coordinator.begin({candidateDirectory:d,candidateJournal:j,binding:input.binding,subject:'alice',expectedOldFingerprint:input.oldFingerprint,expectedNewFingerprint:input.newFingerprint});process.send({kind:'review',challenge});const [reply]=await once(process,'message');await coordinator.confirm({challengeId:challenge.challengeId,authorization:reply.authorization});process.send({kind:'witness-committed'});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);`,{...config(f),directoryFile:c.directoryFile,journalFile:c.journalFile,binding:c.m.binding,oldFingerprint:a.card.fingerprint,newFingerprint:c.m.card.fingerprint});
  const [message]=await once(child,'message');assert.equal(message.kind,'review');
  const authorization=await a.root.approve({challenge:message.challenge,expectedSubject:'alice',expectedOldFingerprint:a.card.fingerprint,expectedNewFingerprint:c.m.card.fingerprint,expectedTargetDirectoryDomain:message.challenge.review.targetCheckpoint.domain});
  const committed=once(child,'message');child.send({authorization});assert.equal((await committed)[0].kind,'witness-committed');await kill(child);
  assert.equal(a.witness.read().epoch,1);const map=await f.reopen();
  if(prepared)assert.equal((await f.resolved('alice',map)).trust.epoch,1);
  else {await assert.rejects(map.resolve('alice'));await map.rememberCurrent('alice',f.locators(c));assert.equal((await f.resolved('alice',map)).trust.epoch,1);}
  assert.equal((await (await f.resolved('bob',map)).directory.authorize(f.bob.second.binding)).subject,'bob');
 }
});

test('SIGKILL before or after locator commit leaves an atomic map and preserves the other account',async t=>{
 for(const point of ['beforeLocatorCommit','afterLocatorCommit']){
  const f=await mapped(t),a=f.alice,c=await f.candidate(a);
  await a.coordinator.confirm(await f.prepare(a,c)); // Remove only the prepared locator to model lost/stale map state.
  const db=new Database(f.mapFile);db.prepare('DELETE FROM locators WHERE directory_domain=?').run(a.witness.read().checkpoint.domain);db.close();
  const child=stopAt(t,`const map=await openSubjectRecoveryMap(input.mapFile,{root:input.root,anchors,[input.point](){process.send({kind:'map-boundary'});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});await map.rememberCurrent('alice',input.locators);`,{...config(f),point,locators:f.locators(c)});
  assert.equal((await once(child,'message'))[0].kind,'map-boundary');await kill(child);
  const map=await f.reopen();if(point==='beforeLocatorCommit')await assert.rejects(map.resolve('alice'));else assert.equal((await f.resolved('alice',map)).trust.epoch,1);
  assert.equal((await f.resolved('bob',map)).trust.epoch,0);
 }
});

test('newer locator hint after failed approval never changes witness-selected account',async t=>{
 const f=await mapped(t),a=f.alice,c=await f.candidate(a),approval=await f.prepare(a,c),before=a.witness.read();
 await assert.rejects(a.coordinator.confirm({...approval,authorization:'invalid'}));
 const map=await f.reopen();assert.equal((await f.resolved('alice',map)).trust.epoch,0);assert.deepEqual(a.witness.read(),before);
});

test('a substituted locator can be repaired into a separate map without rewriting its evidence or either witness',async t=>{
 const f=await mapped(t),a=f.alice,c=await f.candidate(a);await a.coordinator.confirm(await f.prepare(a,c));
 const copy=await f.snapshot('substituted'),db=new Database(copy),row=db.prepare('SELECT * FROM locators WHERE directory_domain=?').get(a.witness.read().checkpoint.domain),r=JSON.parse(row.payload);
 r.directoryFile=path.basename(a.directoryFile);const payload=JSON.stringify(r);db.prepare('UPDATE locators SET payload=?,checksum=? WHERE directory_domain=?').run(payload,digest(payload),row.directory_domain);db.close();
 const bad=await f.reopen(copy);await assert.rejects(bad.resolve('alice'));const evidence=digest(await readFile(copy)),before=[a.witness.read(),f.bob.witness.read()];
 const repaired=f.keep(await createSubjectRecoveryMap(path.join(f.base,'repaired.sqlite'),{root:f.base,anchors:f.anchors}));
 await repaired.rememberCurrent('alice',f.locators(c));await repaired.rememberCurrent('bob',f.locators(f.bob));
 assert.equal((await f.resolved('alice',repaired)).trust.epoch,1);assert.equal((await f.resolved('bob',repaired)).trust.epoch,0);
 assert.deepEqual([a.witness.read(),f.bob.witness.read()],before);assert.equal(digest(await readFile(copy)),evidence);
});

test('matching locator domains do not bypass the live directory checkpoint after revocation',async t=>{
 const f=await mapped(t),a=f.alice,backup=path.join(f.base,'old-directory.sqlite');await a.directory.backup(backup);
 a.directory.revokeBinding((await a.directory.authorize(a.first.binding)).binding_hash,{expectedRevision:a.directory.summary().revision});
 const copy=await f.snapshot('old-directory-map'),db=new Database(copy),row=db.prepare('SELECT * FROM locators WHERE subject=?').get('alice'),r=JSON.parse(row.payload);r.directoryFile=path.basename(backup);
 const payload=JSON.stringify(r);db.prepare('UPDATE locators SET payload=?,checksum=? WHERE subject=?').run(payload,digest(payload),'alice');db.close();
 const map=await f.reopen(copy);await assert.rejects(map.resolve('alice'),/DIRECTORY_WITNESS_MISMATCH/);
 assert.equal((await f.resolved('bob',map)).trust.epoch,0);assert.equal((await (await f.resolved('alice')).directory.authorize(a.second.binding)).subject,'alice');
});

test('unsupported map schema, additional triggers and absent locator files fail without silent recreation',async t=>{
 const f=await mapped(t);
 for(const mutation of ['PRAGMA user_version=99',"CREATE TRIGGER corrupt AFTER INSERT ON locators BEGIN DELETE FROM locators WHERE subject='bob';END"]){
  const copy=await f.snapshot('bad-'+randomUUID()),db=new Database(copy);db.exec(mutation);db.close();const before=digest(await readFile(copy));
  await assert.rejects(f.reopen(copy),/SUBJECT_RECOVERY_MAP_REJECTED/);assert.equal(digest(await readFile(copy)),before);
 }
 const missing=path.join(f.base,'absent-directory.sqlite');await assert.rejects(f.map.rememberCurrent('alice',{...f.locators(f.alice),directoryFile:path.basename(missing)}));await assert.rejects(stat(missing),{code:'ENOENT'});
 const linked=path.join(f.base,'map-link.sqlite');await symlink(f.mapFile,linked);await assert.rejects(f.reopen(linked));
 assert.equal((await f.resolved('bob')).trust.epoch,0);
});
