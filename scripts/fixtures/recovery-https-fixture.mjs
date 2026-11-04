// Dedicated single-subject test fixture. All recovery/bootstrap/approval controls are private function calls.
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createDurableSyntheticAuthority,openDurableSyntheticAuthority} from '../../packages/sharing-spike/src/durable-authority.mjs';
import {createDurableDeviceDirectory} from '../../packages/sharing-spike/src/durable-device-directory.mjs';
import {createTrustWitness,openTrustWitness} from '../../packages/sharing-spike/src/trust-witness.mjs';
import {openWitnessedDeviceDirectory} from '../../packages/sharing-spike/src/witnessed-device-directory.mjs';
import {createRecoveryFixtureAuthority,createRecoveryFixtureCoordinator} from '../../packages/sharing-spike/src/recovery-fixture.mjs';
import {createProofSigner,proofSignerCard,signDeviceBinding} from '../../packages/sharing-spike/src/device-binding-proof.mjs';
import {startOidcFixtureHttpsProvider} from '../../packages/sharing-spike/src/oidc-fixture-https.mjs';
import {startSyntheticHttpsTransport} from '../../packages/sharing-spike/src/https-transport.mjs';
const reject=()=>{throw new Error('RECOVERY_CONTROL_DENIED');};
export async function startRecoveryHttpsFixture({base,tls,ca,browserFixtureScript,afterRecoveryCommit}={}){
 if(afterRecoveryCommit!==undefined&&typeof afterRecoveryCommit!=='function')reject();
 const resources=[],hold=r=>{resources.push(r);return r;};
 async function signer(){const pair=await createProofSigner();return {pair,card:await proofSignerCard(pair.publicKey)};}
 let identity=await signer(),candidate,review,authorization,snapshotFile,phase='original',transport;
 let directoryFile=path.join(base,'directory.sqlite'),journalFile=path.join(base,'journal.sqlite');
 const sourceFiles={directoryFile,journalFile},witnessFile=path.join(base,'witness.sqlite');
 let authority=hold(await createDurableSyntheticAuthority(journalFile,['owner','editor']));
 const raw=await createDurableDeviceDirectory(directoryFile,[{subject:'owner',fingerprint:identity.card.fingerprint}]);
 const root=await createRecoveryFixtureAuthority();
 let witness=hold(await createTrustWitness(witnessFile,{directory:raw,journal:authority,subject:'owner',expectedFingerprint:identity.card.fingerprint,recoveryKey:root.recoveryKey,expectedRecoveryThumbprint:root.thumbprint}));raw.close();
 let directory=hold(await openWitnessedDeviceDirectory(directoryFile,witness)),coordinator=hold(createRecoveryFixtureCoordinator({witness}));
 authority.createProject('owner',{id:'oldbook',scenes:[{id:'one',folder:'draft'}]});
 const invitation=authority.invite('owner',{projectId:'oldbook',recipient:'editor',scope:['one'],capabilities:['read'],expiresAt:Date.now()+3600000});authority.accept('editor',invitation.token,{explicit:true});
 const issuer=hold(await startOidcFixtureHttpsProvider({tls,ca}));
 async function start(fixturePort=0){transport=await startSyntheticHttpsTransport({authority,directory,identities:['owner'],tls,enableBrowserFixture:true,fixturePort,browserFixtureScript,oidcFixture:{issuer:issuer.issuer,accounts:[{sub:'owner-sub',subject:'owner'}],createProvider:origin=>issuer.configure(origin)}});return {origin:transport.origin,issuer:issuer.issuer};}
 const endpoints=await start();
 async function bind(which,card){return {binding:await signDeviceBinding(which.pair,card,{subject:'owner',device:'device',issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000}),fingerprint:which.card.fingerprint};}
 function summary(){let d;try{d=directory.summary();}catch{d={blocked:true};}const {recoveryKey,...record}=witness.read();return {phase,witness:record,journal:authority.summary(),directory:d};}
 async function control(c){
  if(c.action==='authorize')return issuer.authorize(c.input);
  if(c.action==='callback')return {url:issuer.callback(c.input)};
  if(c.action==='bind_current')return bind(identity,c.card);
  if(c.action==='summary')return summary();
  if(c.action==='prepare_candidate'){
   if(phase!=='original'||candidate)reject();const next=await signer(),file=path.join(base,'candidate-directory.sqlite'),jf=path.join(base,'candidate-journal.sqlite');
   const d=hold(await createDurableDeviceDirectory(file,[{subject:'owner',fingerprint:next.card.fingerprint}])),j=hold(await createDurableSyntheticAuthority(jf,['owner','editor'])),material=await bind(next,c.card);
   candidate={identity:next,directory:d,journal:j,file,jf,...material};return material;
  }
  if(c.action==='candidate_begin'){if(!candidate||phase!=='original')reject();return candidate.directory.begin(candidate.binding);}
  if(c.action==='candidate_confirm'){if(!candidate||phase!=='original')reject();return candidate.directory.confirm(c.response);}
  if(c.action==='begin_recovery'){
   if(!candidate||phase!=='original')reject();review=await coordinator.begin({candidateDirectory:candidate.directory,candidateJournal:candidate.journal,binding:candidate.binding,subject:'owner',expectedOldFingerprint:c.expectedOldFingerprint,expectedNewFingerprint:c.expectedNewFingerprint});authorization=undefined;return review;
  }
  if(c.action==='approve_recovery'){
   if(!review||phase!=='original')reject();authorization=await root.approve({challenge:review,expectedSubject:c.expectedSubject,expectedOldFingerprint:c.expectedOldFingerprint,expectedNewFingerprint:c.expectedNewFingerprint,expectedTargetDirectoryDomain:c.expectedTargetDirectoryDomain});return {ok:true};
  }
  if(c.action==='commit_recovery'){
   if(!review||!authorization||phase!=='original')reject();const result=await coordinator.confirm({challengeId:review.challengeId,authorization});afterRecoveryCommit?.();phase='committed';return {epoch:result.epoch,directoryDomain:result.checkpoint.domain,journalDomain:result.journalDomain};
  }
  if(c.action==='reconcile_recovery'){
   if(!review||!candidate||!['original','committed'].includes(phase))reject();const record=witness.read(),r=review.review;
   if(record.epoch!==r.sourceEpoch+1||record.sequence!==r.sourceSequence+1||record.fingerprint!==r.newFingerprint||record.journalDomain!==r.targetJournalDomain||record.checkpoint.domain!==r.targetCheckpoint.domain||record.checkpoint.hash!==r.targetCheckpoint.hash||record.checkpoint.revision!==r.targetCheckpoint.revision)reject();
   phase='committed';return {epoch:record.epoch,directoryDomain:record.checkpoint.domain,journalDomain:record.journalDomain};
  }
  if(c.action==='replay_recovery'){if(!review||!authorization)reject();await coordinator.confirm({challengeId:review.challengeId,authorization});return {ok:true};}
  if(c.action==='activate_recovered'){
   if(phase!=='committed')reject();const port=Number(new URL(transport.origin).port);await transport.close();directory.close();authority.close();candidate.directory.close();
   directoryFile=candidate.file;journalFile=candidate.jf;identity=candidate.identity;authority=candidate.journal;directory=hold(await openWitnessedDeviceDirectory(directoryFile,witness));phase='recovered';return start(port);
  }
  if(c.action==='restart_current'){
   if(phase==='committed')reject();directory.summary();
   const port=Number(new URL(transport.origin).port);await transport.close();directory.close();authority.close();coordinator.close();witness.close();
   witness=hold(await openTrustWitness(witnessFile));authority=hold(await openDurableSyntheticAuthority(journalFile));directory=hold(await openWitnessedDeviceDirectory(directoryFile,witness));coordinator=hold(createRecoveryFixtureCoordinator({witness}));review=undefined;authorization=undefined;return start(port);
  }
  if(c.action==='backup_current'){snapshotFile=path.join(base,'snapshot-'+randomUUID()+'.sqlite');await directory.backup(snapshotFile);return {ok:true};}
  if(c.action==='probe_snapshot'){
   if(!snapshotFile)reject();try{const opened=await openWitnessedDeviceDirectory(snapshotFile,witness);opened.close();return {refused:false};}catch{return {refused:true};}
  }
  if(c.action==='probe_source'){
   try{const opened=await openWitnessedDeviceDirectory(sourceFiles.directoryFile,witness);opened.close();return {refused:false};}catch{return {refused:true};}
  }
  if(c.action==='seed_new_project'){if(phase!=='recovered')reject();authority.createProject('owner',{id:'newbook',scenes:[{id:'one',folder:'draft'}]});return {ok:true};}
  reject();
 }
 return Object.freeze({endpoints,control,async close(){await transport.close().catch(()=>{});for(const r of resources.reverse()){try{await r.close();}catch{}}}});
}
