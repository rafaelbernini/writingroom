import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
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
 t.after(async()=>{for(const r of resources.reverse())r.close();await rm(base,{recursive:true,force:true});});
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
  const journal=keep(await createDurableSyntheticAuthority(file(),['alice','bob']));
  const root=await createRecoveryFixtureAuthority();
  const witness=keep(await createTrustWitness(witnessFile,{directory:raw,journal,subject,expectedFingerprint:card.fingerprint,recoveryKey:root.recoveryKey,expectedRecoveryThumbprint:root.thumbprint}));
  const directory=keep(await openWitnessedDeviceDirectory(directoryFile,witness));
  await activate(directory,first);await activate(directory,second);
  journal.createProject(subject,{id:'book',scenes:[{id:'one',folder:'draft'}]});
  const coordinator=keep(createRecoveryFixtureCoordinator({witness}));
  return {subject,first,second,card,directoryFile,witnessFile,directory,journal,root,witness,coordinator};
 }
 async function candidate(a) {
  const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),m=await device(a.subject,signer,card,'replacement');
  const directoryFile=file(),directory=keep(await createDurableDeviceDirectory(directoryFile,[{subject:a.subject,fingerprint:card.fingerprint}]));
  const journal=keep(await createDurableSyntheticAuthority(file(),['alice','bob']));
  await activate(directory,m);
  return {directoryFile,directory,journal,m};
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
 return {alice:await account('alice'),bob:await account('bob'),candidate,prepare,request,activate,session,keep};
}

test('recovering alice fences both old devices while bob keeps trust, journal and proven sessions',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob;
 const a1=await f.session(a,a.first),a2=await f.session(a,a.second),b1=await f.session(b,b.first),b2=await f.session(b,b.second);
 const before={witness:b.witness.read(),journal:b.journal.summary(),context:(await b1.send('/operations/context')).body};
 const c=await f.candidate(a);await a.coordinator.confirm(await f.prepare(a,c));
 for(const s of [a1,a2])assert.equal((await s.send('/operations/context')).status,403);
 for(const s of [b1,b2]){const result=await s.send('/operations/context');assert.equal(result.status,200);assert.deepEqual(result.body,before.context);}
 assert.deepEqual(b.witness.read(),before.witness);assert.deepEqual(b.journal.summary(),before.journal);
 assert.equal(b.journal.authorize('bob',{projectId:'book',sceneId:'one',action:'read'}),true);
 const recovered=f.keep(await openWitnessedDeviceDirectory(c.directoryFile,a.witness));
 await assert.rejects(recovered.authorize(a.first.binding));await assert.rejects(recovered.authorize(a.second.binding));
 assert.equal((await recovered.authorize(c.m.binding)).subject,'alice');
 assert.equal(c.journal.summary().events,0);
 assert.throws(()=>c.journal.authorize('alice',{projectId:'book',sceneId:'one',action:'read'}));
});

test('approval for another account cannot confirm or consume that accounts pending recovery',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob,ca=await f.candidate(a),cb=await f.candidate(b);
 const pa=await f.prepare(a,ca),pb=await f.prepare(b,cb),before=b.witness.read();
 await assert.rejects(a.coordinator.confirm({challengeId:pa.challengeId,authorization:pb.authorization}));
 assert.equal(a.witness.read().epoch,0);assert.deepEqual(b.witness.read(),before);
 assert.equal((await b.coordinator.confirm(pb)).epoch,1);
 assert.equal((await a.coordinator.confirm(await f.prepare(a,ca))).epoch,1);
});

test('parallel independent recoveries each advance their own anchor exactly once',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob,ca=await f.candidate(a),cb=await f.candidate(b);
 const pa=await f.prepare(a,ca),pb=await f.prepare(b,cb);
 const results=await Promise.all([a.coordinator.confirm(pa),b.coordinator.confirm(pb)]);
 assert.deepEqual(results.map(r=>r.epoch),[1,1]);assert.notEqual(results[0].anchorId,results[1].anchorId);
 assert.notEqual(results[0].journalDomain,results[1].journalDomain);
 for(const x of [a,b]){const reopened=f.keep(await openTrustWitness(x.witnessFile));assert.deepEqual(reopened.read(),x.witness.read());}
 await assert.rejects(a.coordinator.confirm(pa));await assert.rejects(b.coordinator.confirm(pb));
});

test('cross-account candidate, binding and directory/witness pairing are refused',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob,cb=await f.candidate(b),before=[a.witness.read(),b.witness.read()];
 await assert.rejects(a.coordinator.begin({...f.request(a,cb),expectedNewFingerprint:cb.m.card.fingerprint}));
 await assert.rejects(a.directory.authorize(b.first.binding));
 await assert.rejects(openWitnessedDeviceDirectory(a.directoryFile,b.witness));
 assert.deepEqual([a.witness.read(),b.witness.read()],before);
});

test('revoking one device preserves the second device and the other accounts pending recovery',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob,cb=await f.candidate(b),pb=await f.prepare(b,cb);
 const before=b.witness.read(),hash=(await a.directory.authorize(a.first.binding)).binding_hash;
 a.directory.revokeBinding(hash,{expectedRevision:a.directory.summary().revision});
 await assert.rejects(a.directory.authorize(a.first.binding));assert.equal((await a.directory.authorize(a.second.binding)).subject,'alice');
 assert.deepEqual(b.witness.read(),before);assert.equal((await b.coordinator.confirm(pb)).epoch,1);
 assert.equal((await a.directory.authorize(a.second.binding)).subject,'alice');
});

test('a directory/witness commit gap for alice does not block bobs existing sessions or recovery',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob,session=await f.session(b,b.first);
 const cb=await f.candidate(b),approval=await f.prepare(b,cb),before=b.witness.read();
 const broken=f.keep(await openWitnessedDeviceDirectory(a.directoryFile,a.witness,{beforeWitnessCommit(){throw new Error('CRASH_GAP');}}));
 const hash=(await a.directory.authorize(a.first.binding)).binding_hash;
 assert.throws(()=>broken.revokeBinding(hash,{expectedRevision:a.directory.summary().revision}),/CRASH_GAP/);
 assert.throws(()=>a.directory.summary(),/DIRECTORY_WITNESS_MISMATCH/);
 assert.deepEqual(b.witness.read(),before);assert.equal((await session.send('/operations/context')).status,200);
 assert.equal((await b.coordinator.confirm(approval)).epoch,1);
 assert.throws(()=>a.directory.summary(),/DIRECTORY_WITNESS_MISMATCH/);
});

test('recovering alice cannot pair her new directory with bobs unchanged journal',async t=>{
 const f=await fixture(t),a=f.alice,b=f.bob,c=await f.candidate(a),before=b.journal.summary();
 await a.coordinator.confirm(await f.prepare(a,c));
 const recovered=f.keep(await openWitnessedDeviceDirectory(c.directoryFile,a.witness));
 const mixed=await f.session({subject:'alice',directory:recovered,journal:b.journal},c.m,{proofStatus:403});
 assert.equal((await mixed.send('/operations/context')).status,403);
 assert.deepEqual(b.journal.summary(),before);
 assert.equal((await b.directory.authorize(b.second.binding)).subject,'bob');
});
