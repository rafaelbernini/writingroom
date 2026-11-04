import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createDurableSyntheticAuthority,openDurableSyntheticAuthority} from '../../sharing-spike/src/durable-authority.mjs';
import {createDurableDeviceDirectory,openDurableDeviceDirectory,restoreDurableDeviceDirectory} from '../../sharing-spike/src/durable-device-directory.mjs';
import {createTrustWitness,openTrustWitness} from '../../sharing-spike/src/trust-witness.mjs';
import {openWitnessedDeviceDirectory} from '../../sharing-spike/src/witnessed-device-directory.mjs';
import {createRecoveryFixtureAuthority,createRecoveryFixtureCoordinator} from '../../sharing-spike/src/recovery-fixture.mjs';
import {directoryCheckpoint} from '../../sharing-spike/src/directory-checkpoint.mjs';
import {createProofSigner,proofSignerCard,signDeviceBinding,answerDeviceChallenge} from '../../sharing-spike/src/device-binding-proof.mjs';
import {createProofRecipient,publicProofCard} from '../../sharing-spike/src/hpke-proof.mjs';
import {createDeviceBoundSessionHarness} from '../../sharing-spike/src/device-bound-session.mjs';
let Database;try{Database=(await import('node:sqlite')).DatabaseSync;}catch{}
const check=(name,fn)=>test(name,{skip:!Database&&'SQLite nativo indisponível.'},fn);
async function fixture(t){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-recovery-'));t.after(()=>rm(base,{recursive:true,force:true}));let time=Date.now();const now=()=>time;
 const resources=[];t.after(()=>{for(const r of resources.reverse()){try{r.close();}catch{}}});
 async function material(subject='owner',device='device'){
  const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();
  const binding=await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject,device,issuedAt:now()-1000,expiresAt:now()+3600000});return {signer,card,recipient,binding,subject,device};
 }
 async function activate(dir,m){const challenge=await dir.begin(m.binding),response=await answerDeviceChallenge(m.recipient,m.binding,challenge,{subject:m.subject,device:m.device,identityFingerprint:m.card.fingerprint,now:now()});await dir.confirm(response);return challenge;}
 const old=await material(),directoryFile=path.join(base,'directory.sqlite'),journalFile=path.join(base,'journal.sqlite'),witnessFile=path.join(base,'witness.sqlite');
 const raw=await createDurableDeviceDirectory(directoryFile,[{subject:'owner',fingerprint:old.card.fingerprint}]);
 const journal=await createDurableSyntheticAuthority(journalFile,['owner','editor']);resources.push(journal);
 const root=await createRecoveryFixtureAuthority({now});
 const witness=await createTrustWitness(witnessFile,{directory:raw,journal,subject:'owner',expectedFingerprint:old.card.fingerprint,recoveryKey:root.recoveryKey,expectedRecoveryThumbprint:root.thumbprint});resources.push(witness);raw.close();
 const directory=await openWitnessedDeviceDirectory(directoryFile,witness,{now});resources.push(directory);await activate(directory,old);
 journal.createProject('owner',{id:'oldbook',scenes:[{id:'one',folder:'draft'}]});
 const invitation=journal.invite('owner',{projectId:'oldbook',recipient:'editor',scope:['one'],capabilities:['read'],expiresAt:now()+3600000});journal.accept('editor',invitation.token,{explicit:true});
 const coordinator=createRecoveryFixtureCoordinator({witness,now});resources.push(coordinator);
 async function candidate({subject='owner',active=true}={}){
  const m=await material(subject,'replacement'),file=path.join(base,'candidate-'+randomUUID()+'.sqlite'),initial=await createDurableDeviceDirectory(file,[{subject,fingerprint:m.card.fingerprint}]);initial.close();const dir=await openDurableDeviceDirectory(file,{now});resources.push(dir);
  const jf=path.join(base,'new-journal-'+randomUUID()+'.sqlite'),j=await createDurableSyntheticAuthority(jf,['owner','editor']);resources.push(j);if(active)await activate(dir,m);
  return {m,file,directory:dir,journal:j,journalFile:jf};
 }
 const request=c=>({candidateDirectory:c.directory,candidateJournal:c.journal,binding:c.m.binding,subject:'owner',expectedOldFingerprint:old.card.fingerprint,expectedNewFingerprint:c.m.card.fingerprint});
 async function approve(challenge,rootAuthority=root){return rootAuthority.approve({challenge,expectedSubject:'owner',expectedOldFingerprint:old.card.fingerprint,expectedNewFingerprint:challenge.review.newFingerprint,expectedTargetDirectoryDomain:challenge.review.targetCheckpoint.domain});}
 async function recover(c){const challenge=await coordinator.begin(request(c)),authorization=await approve(challenge);return coordinator.confirm({challengeId:challenge.challengeId,authorization});}
 return {base,now,advance:n=>{time+=n;},resources,old,directoryFile,journalFile,witnessFile,journal,witness,directory,root,coordinator,material,activate,candidate,request,approve,recover};
}
check('witness advances with proven activation and revocation, survives reopen and never stores private keys',async t=>{
 const f=await fixture(t),before=f.witness.read();assert.equal(before.checkpoint.revision,f.directory.summary().revision);assert.equal(before.epoch,0);
 const current=directoryCheckpoint(f.directory.summary());assert.deepEqual(current,before.checkpoint);
 f.directory.revokeBinding((await f.directory.authorize(f.old.binding)).binding_hash,{expectedRevision:f.directory.summary().revision});
 assert.equal(f.witness.read().sequence,before.sequence+1);await assert.rejects(f.directory.authorize(f.old.binding));
 const reopened=await openTrustWitness(f.witnessFile);f.resources.push(reopened);assert.deepEqual(reopened.read(),f.witness.read());assert.equal((await stat(f.witnessFile)).mode&0o777,0o600);
 const db=new Database(f.witnessFile,{readOnly:true}),rows=JSON.stringify(db.prepare('SELECT * FROM witness').all());db.close();assert.equal(rows.includes('privateKey'),false);assert.equal(rows.includes('oldbook'),false);
});
check('independent reconfirmation plus fresh possession advances trust epoch without inheriting old grants',async t=>{
 const f=await fixture(t),c=await f.candidate(),source=f.witness.read(),result=await f.recover(c);
 assert.equal(result.epoch,source.epoch+1);assert.notEqual(result.checkpoint.domain,source.checkpoint.domain);assert.notEqual(result.journalDomain,source.journalDomain);assert.equal(result.fingerprint,c.m.card.fingerprint);
 assert.throws(()=>f.directory.summary(),/DIRECTORY_WITNESS_MISMATCH/);
 const recovered=await openWitnessedDeviceDirectory(c.file,f.witness,{now:f.now});f.resources.push(recovered);assert.equal((await recovered.authorize(c.m.binding)).subject,'owner');
 assert.equal(c.journal.summary().events,0);assert.deepEqual(c.journal.summary().receipts,[]);assert.throws(()=>c.journal.authorize('editor',{projectId:'oldbook',sceneId:'one',action:'read'}),/DENIED/);
 assert.equal(f.journal.authorize('editor',{projectId:'oldbook',sceneId:'one',action:'read'}),true); // Old data remains separate, never imported.
});
check('session composition rejects pairing recovered directory with old journal and requires fresh session possession',async t=>{
 const f=await fixture(t),c=await f.candidate();await f.recover(c);const directory=await openWitnessedDeviceDirectory(c.file,f.witness,{now:f.now});f.resources.push(directory);
 async function login(authority){const h=createDeviceBoundSessionHarness({authority,directory,identities:['owner','editor'],now:f.now});const send=(route,body={},client={},extra={})=>h.dispatch({method:'POST',origin:h.origin,source:'fixture',path:route,body,...client,...extra});const start=await send('/synthetic/login/start',{device:c.m.device}),code=h.issueSyntheticCode({subject:'owner',device:c.m.device,state:start.body.state}),done=await send('/synthetic/login/complete',{state:start.body.state,code},{csrf:start.body.csrf});return {send,client:{cookie:done.headers['Set-Cookie'].split(';')[0],csrf:done.body.csrf}};}
 const old=await login(f.journal);assert.equal((await old.send('/device-proof/begin',{binding:c.m.binding},old.client)).status,403);
 const fresh=await login(c.journal);assert.equal((await fresh.send('/operations/context',{},fresh.client)).status,403);
 const begin=await fresh.send('/device-proof/begin',{binding:c.m.binding},fresh.client);assert.equal(begin.status,200);const response=await answerDeviceChallenge(c.m.recipient,c.m.binding,begin.body,{subject:'owner',device:c.m.device,identityFingerprint:c.m.card.fingerprint,now:f.now()});assert.equal((await fresh.send('/device-proof/confirm',{response},fresh.client)).status,200);assert.equal((await fresh.send('/operations/context',{},fresh.client)).body.journalDomain,c.journal.sessionEpoch);
});
check('candidate signature or login alone cannot recover; active new-key possession and explicit fingerprints are mandatory',async t=>{
 const f=await fixture(t),unproven=await f.candidate({active:false});await assert.rejects(f.coordinator.begin(f.request(unproven)));
 const c=await f.candidate();await assert.rejects(f.coordinator.begin({...f.request(c),expectedOldFingerprint:'a'.repeat(64)}));await assert.rejects(f.coordinator.begin({...f.request(c),expectedNewFingerprint:f.old.card.fingerprint}));
 const challenge=await f.coordinator.begin(f.request(c));await assert.rejects(f.root.approve({challenge,expectedSubject:'owner',expectedOldFingerprint:f.old.card.fingerprint,expectedNewFingerprint:'b'.repeat(64),expectedTargetDirectoryDomain:challenge.review.targetCheckpoint.domain}));
 assert.equal(f.witness.read().epoch,0);
});
check('same name/subject cannot silently replace recovery authority or pin and signed payload tampering is denied',async t=>{
 const f=await fixture(t),c=await f.candidate(),challenge=await f.coordinator.begin(f.request(c)),alien=await createRecoveryFixtureAuthority({now:f.now});
 const token=await f.approve(challenge,alien);await assert.rejects(f.coordinator.confirm({challengeId:challenge.challengeId,authorization:token}));
 const next=await f.coordinator.begin(f.request(c)),valid=await f.approve(next),parts=valid.split('.');parts[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(parts[1],'base64url').toString()),aud:randomUUID()})).toString('base64url');
 await assert.rejects(f.coordinator.confirm({challengeId:next.challengeId,authorization:parts.join('.')}));assert.equal(f.witness.read().epoch,0);
});
check('reconfirmation is single-use, expires and is invalid after coordinator restart',async t=>{
 const f=await fixture(t),c=await f.candidate(),challenge=await f.coordinator.begin(f.request(c)),authorization=await f.approve(challenge);
 const restarted=createRecoveryFixtureCoordinator({witness:f.witness,now:f.now});f.resources.push(restarted);await assert.rejects(restarted.confirm({challengeId:challenge.challengeId,authorization}));
 f.advance(60000);await assert.rejects(f.coordinator.confirm({challengeId:challenge.challengeId,authorization}));assert.equal(f.witness.read().epoch,0);
});
check('two approved recoveries compete by witness CAS; old approval cannot restore prior identity',async t=>{
 const f=await fixture(t),a=await f.candidate(),b=await f.candidate(),one=await f.coordinator.begin(f.request(a)),two=await f.coordinator.begin(f.request(b)),tokenOne=await f.approve(one),tokenTwo=await f.approve(two);
 const replies=await Promise.allSettled([f.coordinator.confirm({challengeId:one.challengeId,authorization:tokenOne}),f.coordinator.confirm({challengeId:two.challengeId,authorization:tokenTwo})]);assert.equal(replies.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.witness.read().epoch,1);
 await assert.rejects(f.coordinator.confirm({challengeId:one.challengeId,authorization:tokenOne}));assert.equal(f.witness.read().sequence,2);
});
check('revocation or new journal content after approval prevents recovery commit',async t=>{
 for(const change of ['revoke','journal']){const f=await fixture(t),c=await f.candidate(),challenge=await f.coordinator.begin(f.request(c)),authorization=await f.approve(challenge);
  if(change==='revoke')c.directory.revokeBinding((await c.directory.authorize(c.m.binding)).binding_hash,{expectedRevision:c.directory.summary().revision});else c.journal.createProject('owner',{id:'injected',scenes:[{id:'one',folder:'draft'}]});
  await assert.rejects(f.coordinator.confirm({challengeId:challenge.challengeId,authorization}));assert.equal(f.witness.read().epoch,0);
 }
});
check('older directory snapshot and coherent same-revision substitution are rejected against current witness',async t=>{
 for(const change of ['old','same-revision']){const f=await fixture(t),backup=path.join(f.base,'old.sqlite');await f.directory.backup(backup);f.directory.revokeBinding((await f.directory.authorize(f.old.binding)).binding_hash,{expectedRevision:f.directory.summary().revision});
  if(change==='same-revision'){const db=new Database(backup);db.prepare('UPDATE directory SET revision=?').run(f.witness.read().checkpoint.revision);db.close();}
  await assert.rejects(openWitnessedDeviceDirectory(backup,f.witness),/DIRECTORY_WITNESS_MISMATCH/);assert.equal(f.witness.read().epoch,0);
 }
});
check('restored suspended domain stays blocked and is never automatically enrolled or reactivated',async t=>{
 const f=await fixture(t),backup=path.join(f.base,'backup.sqlite'),{checksum}=await f.directory.backup(backup),file=path.join(f.base,'restored.sqlite'),restored=await restoreDurableDeviceDirectory(backup,file,checksum);f.resources.push(restored);
 await assert.rejects(openWitnessedDeviceDirectory(file,f.witness),/DIRECTORY_WITNESS_MISMATCH/);
 await assert.rejects(f.coordinator.begin({candidateDirectory:restored,candidateJournal:f.journal,binding:f.old.binding,subject:'owner',expectedOldFingerprint:f.old.card.fingerprint,expectedNewFingerprint:f.old.card.fingerprint}));
});
check('directory commit followed by witness failure blocks every operation rather than accepting a newer revision',async t=>{
 const f=await fixture(t),broken=await openWitnessedDeviceDirectory(f.directoryFile,f.witness,{now:f.now,beforeWitnessCommit(){throw new Error('CRASH_GAP');}});f.resources.push(broken);
 const checkpoint=f.witness.read().checkpoint;assert.throws(()=>broken.revokeBinding((f.directory.summary().bindings[0]).hash,{expectedRevision:f.directory.summary().revision}),/CRASH_GAP/);
 assert.deepEqual(f.witness.read().checkpoint,checkpoint);assert.throws(()=>f.directory.summary(),/DIRECTORY_WITNESS_MISMATCH/);await assert.rejects(openWitnessedDeviceDirectory(f.directoryFile,f.witness),/DIRECTORY_WITNESS_MISMATCH/);
 // Independent reconfirmation into fresh domains is still available without trusting the mismatched source file.
 const c=await f.candidate();assert.equal((await f.recover(c)).epoch,1);
});
check('bootstrap refuses wrong independently checked pin/root and missing witness is never silently recreated',async t=>{
 const f=await fixture(t),c=await f.candidate({active:false});
 await assert.rejects(createTrustWitness(path.join(f.base,'bad.sqlite'),{directory:c.directory,journal:c.journal,subject:'owner',expectedFingerprint:'0'.repeat(64),recoveryKey:f.root.recoveryKey,expectedRecoveryThumbprint:f.root.thumbprint}));
 await assert.rejects(createTrustWitness(path.join(f.base,'bad-root.sqlite'),{directory:c.directory,journal:c.journal,subject:'owner',expectedFingerprint:c.m.card.fingerprint,recoveryKey:f.root.recoveryKey,expectedRecoveryThumbprint:'wrong'}));
 await assert.rejects(openTrustWitness(path.join(f.base,'absent.sqlite')));
 const bytes=await readFile(f.witnessFile);assert.ok(bytes.length>0);assert.equal(f.witness.read().epoch,0);
});
check('coherent replacement pin and signed binding at the same domain/revision do not match the witness',async t=>{
 const f=await fixture(t),c=await f.candidate(),source=f.witness.read();c.directory.close();
 const db=new Database(c.file);db.prepare('UPDATE directory SET domain=?,revision=?').run(source.checkpoint.domain,source.checkpoint.revision);db.close();
 const raw=await openDurableDeviceDirectory(c.file,{now:f.now});f.resources.push(raw);assert.equal((await raw.authorize(c.m.binding)).subject,'owner');
 await assert.rejects(openWitnessedDeviceDirectory(c.file,f.witness,{now:f.now}),/DIRECTORY_WITNESS_MISMATCH/);
});
check('rolling back both directory and local witness remains outside the independent-witness guarantee',async t=>{
 const f=await fixture(t),directoryBackup=path.join(f.base,'both-directory.sqlite'),witnessBackup=path.join(f.base,'both-witness.sqlite');await f.directory.backup(directoryBackup);
 const db=new Database(f.witnessFile);db.prepare('VACUUM INTO ?').run(witnessBackup);db.close();
 f.directory.revokeBinding((await f.directory.authorize(f.old.binding)).binding_hash,{expectedRevision:f.directory.summary().revision});
 await assert.rejects(openWitnessedDeviceDirectory(directoryBackup,f.witness,{now:f.now}));
 const rolledWitness=await openTrustWitness(witnessBackup);f.resources.push(rolledWitness);const rolledDirectory=await openWitnessedDeviceDirectory(directoryBackup,rolledWitness,{now:f.now});f.resources.push(rolledDirectory);
 assert.equal((await rolledDirectory.authorize(f.old.binding)).subject,'owner'); // Explicit limitation: no external hardware/service counter in this fixture.
});
check('two processes cannot advance the same witnessed directory revision twice',async t=>{
 const f=await fixture(t),before=f.witness.read(),hash=f.directory.summary().bindings[0].hash,witnessModule=new URL('../../sharing-spike/src/trust-witness.mjs',import.meta.url).href,wrapperModule=new URL('../../sharing-spike/src/witnessed-device-directory.mjs',import.meta.url).href;
 const script=`import {openTrustWitness} from ${JSON.stringify(witnessModule)};import {openWitnessedDeviceDirectory} from ${JSON.stringify(wrapperModule)};const w=await openTrustWitness(process.argv[1]);let d;try{d=await openWitnessedDeviceDirectory(process.argv[2],w);d.revokeBinding(process.argv[3],{expectedRevision:Number(process.argv[4])});process.send('committed');}catch{process.send('denied');}finally{d?.close();w.close();}`;
 const results=await Promise.all([1,2].map(()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',script,f.witnessFile,f.directoryFile,hash,String(before.checkpoint.revision)],{stdio:['ignore','ignore','ignore','ipc']});let out;child.on('message',m=>out=m);child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error('child failed')));} )));
 assert.deepEqual(results.sort(),['committed','denied']);assert.equal(f.witness.read().sequence,before.sequence+1);assert.equal(f.directory.summary().revision,before.checkpoint.revision+1);
});
check('SIGKILL between directory and witness commit preserves fail-closed mismatch on reopen',async t=>{
 const f=await fixture(t),before=f.witness.read(),hash=f.directory.summary().bindings[0].hash,witnessModule=new URL('../../sharing-spike/src/trust-witness.mjs',import.meta.url).href,wrapperModule=new URL('../../sharing-spike/src/witnessed-device-directory.mjs',import.meta.url).href;
 const script=`import {openTrustWitness} from ${JSON.stringify(witnessModule)};import {openWitnessedDeviceDirectory} from ${JSON.stringify(wrapperModule)};const w=await openTrustWitness(process.argv[1]),d=await openWitnessedDeviceDirectory(process.argv[2],w,{beforeWitnessCommit(){process.send('directory-committed');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});d.revokeBinding(process.argv[3],{expectedRevision:Number(process.argv[4])});`;
 const child=spawn(process.execPath,['--input-type=module','-e',script,f.witnessFile,f.directoryFile,hash,String(before.checkpoint.revision)],{stdio:['ignore','ignore','ignore','ipc']});t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});const timer=setTimeout(()=>child.kill('SIGKILL'),10000);t.after(()=>clearTimeout(timer));
 const [message]=await once(child,'message');assert.equal(message,'directory-committed');child.kill('SIGKILL');await once(child,'exit');clearTimeout(timer);
 assert.deepEqual(f.witness.read(),before);await assert.rejects(openWitnessedDeviceDirectory(f.directoryFile,f.witness,{now:f.now}),/DIRECTORY_WITNESS_MISMATCH/);
});
check('authorized callback reserves the witness so another process cannot transition trust mid-operation',async t=>{
 const f=await fixture(t),record=f.witness.read(),module=new URL('../../sharing-spike/src/trust-witness.mjs',import.meta.url).href;
 const script=`import {openTrustWitness} from ${JSON.stringify(module)};const w=await openTrustWitness(process.argv[1]);try{const r=w.reserve(JSON.parse(process.argv[2]));r.rollback();process.stdout.write('entered');}catch{process.stdout.write('locked');}finally{w.close();}`;
 const result=await f.directory.withAuthorizedBinding(f.old.binding,()=>execFileSync(process.execPath,['--input-type=module','-e',script,f.witnessFile,JSON.stringify(record)],{encoding:'utf8',timeout:3000}));
 assert.equal(result,'locked');assert.deepEqual(f.witness.read(),record);
});
check('recovery cannot bind a subject absent from the supposedly fresh target journal',async t=>{
 const f=await fixture(t),c=await f.candidate(),other=await createDurableSyntheticAuthority(path.join(f.base,'other-identities.sqlite'),['editor']);f.resources.push(other);c.journal=other;
 const challenge=await f.coordinator.begin(f.request(c)),authorization=await f.approve(challenge);
 await assert.rejects(f.coordinator.confirm({challengeId:challenge.challengeId,authorization}));assert.equal(f.witness.read().epoch,0);
});
check('witnessed authorization snapshots caller binding before awaits and cannot relabel the authenticated subject',async t=>{
 const f=await fixture(t),binding=structuredClone(f.old.binding),promise=f.directory.authorize(binding);binding.payload.subject='editor';binding.payload.device='other';
 const result=await promise;assert.equal(result.subject,'owner');assert.equal(result.device,f.old.device);
});
