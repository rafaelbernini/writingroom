// Two-account HTTPS/OIDC proof. All context, identity and recovery selection is pipe/private control.
import path from 'node:path';
import {createDurableSyntheticAuthority,openDurableSyntheticAuthority} from '../../packages/sharing-spike/src/durable-authority.mjs';
import {createDurableDeviceDirectory} from '../../packages/sharing-spike/src/durable-device-directory.mjs';
import {createTrustWitness,openTrustWitness} from '../../packages/sharing-spike/src/trust-witness.mjs';
import {openWitnessedDeviceDirectory} from '../../packages/sharing-spike/src/witnessed-device-directory.mjs';
import {createRecoveryFixtureAuthority,createRecoveryFixtureCoordinator} from '../../packages/sharing-spike/src/recovery-fixture.mjs';
import {createProofSigner,proofSignerCard,signDeviceBinding} from '../../packages/sharing-spike/src/device-binding-proof.mjs';
import {startOidcFixtureHttpsProvider} from '../../packages/sharing-spike/src/oidc-fixture-https.mjs';
import {startSyntheticHttpsTransport} from '../../packages/sharing-spike/src/https-transport.mjs';
const fail=()=>{throw new Error('SUBJECT_RECOVERY_CONTROL_DENIED');};
const subjects=['alice','bob'];
export async function startSubjectRecoveryHttpsFixture({base,tls,ca,browserFixtureScript,afterRecoveryCommit,afterTokenExchange}={}){
 const resources=[],hold=r=>(resources.push(r),r),accounts=new Map();let transport;
 async function identity(){const pair=await createProofSigner();return {pair,card:await proofSignerCard(pair.publicKey)};}
 async function bind(a,key,card,device='device'){return {binding:await signDeviceBinding(key.pair,card,{subject:a.subject,device,issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000}),fingerprint:key.card.fingerprint};}
 for(const subject of subjects){
  const a={subject,phase:'original',identity:await identity(),directoryFile:path.join(base,subject+'-directory.sqlite'),journalFile:path.join(base,subject+'-journal.sqlite'),witnessFile:path.join(base,subject+'-witness.sqlite')};
  a.sourceFile=a.directoryFile;
  a.authority=hold(await createDurableSyntheticAuthority(a.journalFile,[...subjects,'reviewer']));
  const raw=await createDurableDeviceDirectory(a.directoryFile,[{subject,fingerprint:a.identity.card.fingerprint}]);
  a.root=await createRecoveryFixtureAuthority();
  a.witness=hold(await createTrustWitness(a.witnessFile,{directory:raw,journal:a.authority,subject,expectedFingerprint:a.identity.card.fingerprint,recoveryKey:a.root.recoveryKey,expectedRecoveryThumbprint:a.root.thumbprint}));raw.close();
  a.directory=hold(await openWitnessedDeviceDirectory(a.directoryFile,a.witness));a.coordinator=hold(createRecoveryFixtureCoordinator({witness:a.witness}));
  a.authority.createProject(subject,{id:'book',scenes:[{id:'one',folder:'draft'}]});
  accounts.set(subject,a);
 }
 const issuer=hold(await startOidcFixtureHttpsProvider({tls,ca}));
 async function start(fixturePort=0){
  const first=accounts.get('alice');
  transport=await startSyntheticHttpsTransport({authority:first.authority,directory:first.directory,identities:subjects,tls,enableBrowserFixture:true,fixturePort,browserFixtureScript,
   oidcFixture:{issuer:issuer.issuer,accounts:subjects.map(subject=>({sub:subject+'-sub',subject})),subjectContexts:[...accounts.values()].map(a=>({subject:a.subject,authority:a.authority,directory:a.directory})),createProvider:async origin=>{const provider=await issuer.configure(origin);return {...provider,async exchange(input){const result=await provider.exchange(input);await afterTokenExchange?.();return result;}};}}});
  return {origin:transport.origin,issuer:issuer.issuer};
 }
 const endpoints=await start();
 async function control(c){
  if(c.action==='authorize')return issuer.authorize(c.input);
  if(c.action==='callback')return {url:issuer.callback(c.input)};
  if(c.action==='restart_current'){
   // No map fallback while any committed target is waiting for explicit activation/reconciliation.
   for(const a of accounts.values())a.directory.summary();
   const port=Number(new URL(transport.origin).port);await transport.close();
   for(const a of accounts.values()){
    a.directory.close();a.authority.close();a.coordinator.close();a.witness.close();
    a.witness=hold(await openTrustWitness(a.witnessFile));a.authority=hold(await openDurableSyntheticAuthority(a.journalFile));a.directory=hold(await openWitnessedDeviceDirectory(a.directoryFile,a.witness));a.coordinator=hold(createRecoveryFixtureCoordinator({witness:a.witness}));a.review=undefined;a.authorization=undefined;
   }
   return start(port);
  }
  const a=accounts.get(c.subject);if(!a)fail();
  if(c.action==='summary'){const {recoveryKey,...witness}=a.witness.read();let directory;try{directory=a.directory.summary();}catch{directory={blocked:true};}return {phase:a.phase,witness,directory,journal:a.authority.summary()};}
  if(c.action==='bind_current')return bind(a,a.identity,c.card,c.device);
  if(c.action==='prepare_candidate'){
   if(a.phase!=='original'||a.candidate)fail();const key=await identity(),file=path.join(base,a.subject+'-candidate-directory.sqlite'),jf=path.join(base,a.subject+'-candidate-journal.sqlite');
   a.candidate={identity:key,file,jf,directory:hold(await createDurableDeviceDirectory(file,[{subject:a.subject,fingerprint:key.card.fingerprint}])),journal:hold(await createDurableSyntheticAuthority(jf,[...subjects,'reviewer'])),...await bind(a,key,c.card,c.device)};
   return {binding:a.candidate.binding,fingerprint:a.candidate.fingerprint};
  }
  if(c.action==='candidate_begin'){if(!a.candidate||a.phase!=='original')fail();return a.candidate.directory.begin(a.candidate.binding);}
  if(c.action==='candidate_confirm'){if(!a.candidate||a.phase!=='original')fail();return a.candidate.directory.confirm(c.response);}
  if(c.action==='begin_recovery'){
   if(!a.candidate||a.phase!=='original')fail();a.review=await a.coordinator.begin({candidateDirectory:a.candidate.directory,candidateJournal:a.candidate.journal,binding:a.candidate.binding,subject:a.subject,expectedOldFingerprint:c.expectedOldFingerprint,expectedNewFingerprint:c.expectedNewFingerprint});a.authorization=undefined;return a.review;
  }
  if(c.action==='approve_recovery'){
   if(!a.review||a.phase!=='original')fail();a.authorization=await a.root.approve({challenge:a.review,expectedSubject:c.expectedSubject,expectedOldFingerprint:c.expectedOldFingerprint,expectedNewFingerprint:c.expectedNewFingerprint,expectedTargetDirectoryDomain:c.expectedTargetDirectoryDomain});return {ok:true};
  }
  if(c.action==='commit_recovery'){
   if(!a.review||!a.authorization||a.phase!=='original')fail();const record=await a.coordinator.confirm({challengeId:a.review.challengeId,authorization:a.authorization});afterRecoveryCommit?.(a.subject);a.phase='committed';return {epoch:record.epoch,directoryDomain:record.checkpoint.domain,journalDomain:record.journalDomain};
  }
  if(c.action==='reconcile_recovery'){
   if(!a.review||!a.candidate||!['original','committed'].includes(a.phase))fail();const record=a.witness.read(),r=a.review.review;
   if(record.anchorId!==r.anchorId||record.subject!==a.subject||record.sequence!==r.sourceSequence+1||record.epoch!==r.sourceEpoch+1||record.fingerprint!==r.newFingerprint||record.journalDomain!==r.targetJournalDomain||JSON.stringify(record.checkpoint)!==JSON.stringify(r.targetCheckpoint))fail();
   a.phase='committed';return {epoch:record.epoch,directoryDomain:record.checkpoint.domain,journalDomain:record.journalDomain};
  }
  if(c.action==='activate_recovered'){
   if(a.phase!=='committed')fail();const next=hold(await openWitnessedDeviceDirectory(a.candidate.file,a.witness));
   transport.replaceSubjectContext(a.subject,{authority:a.candidate.journal,directory:next});
   a.directory.close();a.authority.close();a.candidate.directory.close();
   a.directoryFile=a.candidate.file;a.journalFile=a.candidate.jf;a.identity=a.candidate.identity;a.authority=a.candidate.journal;a.directory=next;a.phase='recovered';return endpoints;
  }
  if(c.action==='probe_source'){try{const d=await openWitnessedDeviceDirectory(a.sourceFile,a.witness);d.close();return {refused:false};}catch{return {refused:true};}}
  if(c.action==='seed_new_project'){if(a.phase!=='recovered')fail();a.authority.createProject(a.subject,{id:'newbook',scenes:[{id:'one',folder:'draft'}]});return {ok:true};}
  fail();
 }
 return Object.freeze({endpoints,control,async close(){await transport?.close().catch(()=>{});for(const r of resources.reverse()){try{await r.close();}catch{}}}});
}
