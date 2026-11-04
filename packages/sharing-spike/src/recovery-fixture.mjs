// Private synthetic reconfirmation only. No recovery method is exposed over HTTP.
import {randomUUID,randomBytes} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT,jwtVerify,createLocalJWKSet,calculateJwkThumbprint} from 'jose';
import {directoryCheckpoint} from './directory-checkpoint.mjs';
const fail=()=>{throw new Error('RECOVERY_FIXTURE_REJECTED');};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ISSUER='https://trust-reconfirmation.invalid',TYPE='writingroom-trust-recovery+jwt';
export async function createRecoveryFixtureAuthority({now=Date.now}={}){
 const pair=await generateKeyPair('ES256'),key={...await exportJWK(pair.publicKey),kid:randomUUID(),alg:'ES256',use:'sig'};
 return Object.freeze({recoveryKey:structuredClone(key),thumbprint:await calculateJwkThumbprint(key),
  async approve({challenge,expectedSubject,expectedOldFingerprint,expectedNewFingerprint,expectedTargetDirectoryDomain}={}){
   challenge=structuredClone(challenge);const r=challenge?.review;
   if(!r||r.subject!==expectedSubject||r.oldFingerprint!==expectedOldFingerprint||r.newFingerprint!==expectedNewFingerprint||r.targetCheckpoint?.domain!==expectedTargetDirectoryDomain||r.oldFingerprint===r.newFingerprint||now()>=r.expiresAt)fail();
   const seconds=Math.floor(now()/1000);
   return new SignJWT({review:r}).setProtectedHeader({alg:'ES256',typ:TYPE,kid:key.kid}).setIssuer(ISSUER).setAudience(r.anchorId).setIssuedAt(seconds).setExpirationTime(seconds+60).setJti(challenge.challengeId).sign(pair.privateKey);
  }
 });
}
export function createRecoveryFixtureCoordinator({witness,now=Date.now}={}){
 if(witness?.mode!=='SYNTHETIC_TRUST_WITNESS')fail();const initial=witness.read(),key=structuredClone(initial.recoveryKey),jwks=createLocalJWKSet({keys:[key]}),pending=new Map();let closed=false;
 function prune(){if(closed)fail();for(const [id,p]of pending)if(now()>=p.review.expiresAt)pending.delete(id);}
 function target(directory,journal,binding,subject,newFingerprint){
  const d=directory.summary(),j=journal.summary();
  if(d.suspended||d.revision!==1||d.pins.length!==1||d.pins[0].subject!==subject||d.pins[0].fingerprint!==newFingerprint||d.pins[0].revoked||d.revokedHashes.length||d.bindings.length!==1||d.bindings[0].status!=='active'||d.bindings[0].subject!==subject||binding?.payload?.subject!==subject||binding.payload.identity_fingerprint!==newFingerprint||j.suspended||j.events!==0)fail();
  return {checkpoint:directoryCheckpoint(d),journalDomain:j.domain,bindingHash:d.bindings[0].hash};
 }
 return Object.freeze({mode:'SYNTHETIC_RECOVERY_ONLY',
  async begin({candidateDirectory,candidateJournal,binding,subject,expectedOldFingerprint,expectedNewFingerprint}={}){
   prune();if(pending.size>=20)fail();binding=structuredClone(binding);const source=witness.read();
   if(source.anchorId!==initial.anchorId||!same(source.recoveryKey,key)||source.subject!==subject||source.fingerprint!==expectedOldFingerprint||source.fingerprint===expectedNewFingerprint)fail();
   const t=target(candidateDirectory,candidateJournal,binding,subject,expectedNewFingerprint);
   if(t.checkpoint.domain===source.checkpoint.domain||t.journalDomain===source.journalDomain)fail();
   const proof=await candidateDirectory.authorize(binding);prune();if(proof.binding_hash!==t.bindingHash||!same(witness.read(),source)||!same(target(candidateDirectory,candidateJournal,binding,subject,expectedNewFingerprint),t)||pending.size>=20)fail();
   const challengeId=randomUUID(),review={anchorId:source.anchorId,sourceSequence:source.sequence,sourceEpoch:source.epoch,subject,oldFingerprint:source.fingerprint,newFingerprint:expectedNewFingerprint,sourceCheckpoint:source.checkpoint,targetCheckpoint:t.checkpoint,targetJournalDomain:t.journalDomain,bindingHash:t.bindingHash,nonce:randomBytes(32).toString('base64url'),expiresAt:now()+300000};
   pending.set(challengeId,{review,source,candidateDirectory,candidateJournal,binding});return {challengeId,review:structuredClone(review)};
  },
  async confirm({challengeId,authorization}={}){
   prune();const p=pending.get(challengeId);if(!p)fail();pending.delete(challengeId);
   if(typeof authorization!=='string'||authorization.length>8192)fail();
   try{
    const {payload,protectedHeader}=await jwtVerify(authorization,jwks,{algorithms:['ES256'],typ:TYPE,issuer:ISSUER,audience:initial.anchorId,requiredClaims:['iss','aud','iat','exp','jti','review'],maxTokenAge:60,clockTolerance:0,currentDate:new Date(now())});
    prune();if(protectedHeader.kid!==key.kid||Object.keys(protectedHeader).some(k=>!['alg','typ','kid'].includes(k))||payload.jti!==challengeId||payload.aud!==initial.anchorId||!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||payload.exp<=payload.iat||payload.exp-payload.iat>60||payload.iat>Math.floor(now()/1000)||!same(payload.review,p.review)||now()>=p.review.expiresAt||!same(witness.read(),p.source))fail();
    return await p.candidateDirectory.withAuthorizedBinding(p.binding,admission=>{
     prune();
     // Directory is reserved: use the admitted checkpoint instead of opening a nested directory snapshot.
     if(admission.domain!==p.review.targetCheckpoint.domain||admission.revision!==p.review.targetCheckpoint.revision||admission.checkpointHash!==p.review.targetCheckpoint.hash||admission.bindingHash!==p.review.bindingHash)fail();
     const lease=witness.reserve(p.source);
     try{return p.candidateJournal.withEmptyDomain(p.review.targetJournalDomain,p.review.subject,()=>lease.recover({checkpoint:p.review.targetCheckpoint,fingerprint:p.review.newFingerprint,journalDomain:p.review.targetJournalDomain}));}catch(e){lease.rollback();throw e;}
    });
   }catch{fail();}
  },
  close(){closed=true;pending.clear();}
 });
}
