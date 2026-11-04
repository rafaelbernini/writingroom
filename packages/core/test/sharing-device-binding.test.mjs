import test from 'node:test';
import assert from 'node:assert/strict';
import { createProofRecipient,publicProofCard } from '../../sharing-spike/src/hpke-proof.mjs';
import { createProofSigner,proofSignerCard,signDeviceBinding,verifyDeviceBinding,createDeviceBindingVerifier,answerDeviceChallenge } from '../../sharing-spike/src/device-binding-proof.mjs';
async function fixture(){let clock=1000;const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();
 const binding=await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject:'editor',device:'laptop',issuedAt:1000,expiresAt:601000});
 const verifier=createDeviceBindingVerifier({pins:[{subject:'editor',fingerprint:card.fingerprint}],now:()=>clock});
 const answer=c=>answerDeviceChallenge(recipient,binding,c,{subject:'editor',device:'laptop',identityFingerprint:card.fingerprint,now:clock});
 return {signer,card,recipient,binding,verifier,answer,tick:n=>clock=n};}
test('device binding signature alone cannot authorize; encrypted possession activates only the pinned subject/device',async()=>{
 const f=await fixture();await assert.rejects(()=>f.verifier.authorize(f.binding));
 const c=await f.verifier.begin(f.binding),response=await f.answer(c);const accepted=await f.verifier.confirm(response);
 assert.equal(accepted.subject,'editor');assert.equal((await f.verifier.authorize(f.binding)).device,'laptop');
 assert.equal(f.signer.privateKey.extractable,false);assert.equal(f.recipient.privateKey.extractable,false);
 await assert.rejects(()=>f.verifier.confirm(response));
});
test('unknown identity, substituted public key, wrong subject/device and signature mutations fail',async()=>{
 const f=await fixture();const trust={subject:'editor',device:'laptop',identityFingerprint:f.card.fingerprint,now:1000};
 for(const change of [{subject:'other'},{device:'other'},{subject:'editor',device:'laptop',identityFingerprint:'0'.repeat(64)}])await assert.rejects(()=>verifyDeviceBinding(f.binding,{...trust,...change}));
 for(const field of ['subject','device','binding_id'])await assert.rejects(()=>f.verifier.begin({...f.binding,payload:{...f.binding.payload,[field]:'changed'}}));
 const wrong=await createProofRecipient();await assert.rejects(async()=>f.verifier.begin({...f.binding,payload:{...f.binding.payload,encryption_key:await publicProofCard(wrong.publicKey)}}));
 const altered={...f.binding,signature:f.binding.signature.replace(/^./,c=>c==='A'?'B':'A')};await assert.rejects(()=>f.verifier.begin(altered));
 await assert.rejects(async()=>answerDeviceChallenge(wrong,f.binding,await f.verifier.begin(f.binding),{subject:'editor',device:'laptop',identityFingerprint:f.card.fingerprint,now:1000}));
});
test('challenge nonce, binding hash, expiry and opaque context cannot be substituted',async()=>{
 const f=await fixture(),challenge=await f.verifier.begin(f.binding);
 await assert.rejects(()=>answerDeviceChallenge(f.recipient,f.binding,challenge,{subject:'editor',device:'other',identityFingerprint:f.card.fingerprint,now:1000}));
 await assert.rejects(()=>f.answer({...challenge,binding_hash:'0'.repeat(64)}));
 await assert.rejects(()=>f.answer({...challenge,expires_at:challenge.expires_at-1}));
 await assert.rejects(()=>f.answer({...challenge,challenge_id:'other'}));
 const response=await f.answer(challenge);await assert.rejects(()=>f.verifier.confirm({...response,proof:'A'.repeat(43)+'='}));
 await assert.rejects(()=>f.verifier.confirm(response)); // Wrong answer consumes the challenge.
});
test('clock expiration and revocation after preview prevent activation',async()=>{
 const f=await fixture(),c=await f.verifier.begin(f.binding),response=await f.answer(c);
 f.tick(c.expires_at);await assert.rejects(()=>f.verifier.confirm(response));
 f.tick(1000);const next=await f.verifier.begin(f.binding),r=await f.answer(next);f.verifier.revokeBinding(next.binding_hash);
 await assert.rejects(()=>f.verifier.confirm(r));await assert.rejects(()=>f.verifier.begin(f.binding));
 const g=await fixture(),gc=await g.verifier.begin(g.binding),gr=await g.answer(gc);g.verifier.revokeIdentity('editor');
 await assert.rejects(()=>g.verifier.confirm(gr));await assert.rejects(()=>g.verifier.begin(g.binding));
});
test('two confirmations race to exactly one acceptance',async()=>{
 const f=await fixture(),r=await f.answer(await f.verifier.begin(f.binding));
 const result=await Promise.allSettled([f.verifier.confirm(r),f.verifier.confirm(r)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
});
test('replacement cannot silently inherit active device; old binding must be revoked and new possession proven',async()=>{
 const f=await fixture(),c=await f.verifier.begin(f.binding);await f.verifier.confirm(await f.answer(c));
 const nextRecipient=await createProofRecipient(),next=await signDeviceBinding(f.signer,await publicProofCard(nextRecipient.publicKey),{subject:'editor',device:'laptop',issuedAt:1000,expiresAt:601000});
 await assert.rejects(()=>f.verifier.begin(next));f.verifier.revokeBinding(c.binding_hash);await assert.rejects(()=>f.verifier.authorize(f.binding));
 const challenge=await f.verifier.begin(next);await assert.rejects(()=>f.verifier.authorize(next));
 const response=await answerDeviceChallenge(nextRecipient,next,challenge,{subject:'editor',device:'laptop',identityFingerprint:f.card.fingerprint,now:1000});await f.verifier.confirm(response);
 assert.equal((await f.verifier.authorize(next)).binding_hash,challenge.binding_hash);await assert.rejects(()=>f.verifier.begin(f.binding));
});
test('competing device replacements cannot both activate after asynchronous checks',async()=>{
 const f=await fixture(),other=await createProofRecipient();const b=await signDeviceBinding(f.signer,await publicProofCard(other.publicKey),{subject:'editor',device:'laptop',issuedAt:1000,expiresAt:601000});
 const first=await f.verifier.begin(f.binding),second=await f.verifier.begin(b);
 const r1=await f.answer(first),r2=await answerDeviceChallenge(other,b,second,{subject:'editor',device:'laptop',identityFingerprint:f.card.fingerprint,now:1000});
 const result=await Promise.allSettled([f.verifier.confirm(r1),f.verifier.confirm(r2)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
});
test('restart does not restore trust or activation; no email/key recovery is inferred',async()=>{
 const f=await fixture(),c=await f.verifier.begin(f.binding),r=await f.answer(c);await f.verifier.confirm(r);
 const next=createDeviceBindingVerifier({pins:[{subject:'editor',fingerprint:f.card.fingerprint}],now:()=>1000});
 await assert.rejects(()=>next.authorize(f.binding));await assert.rejects(()=>next.confirm(r));
 f.tick(601000);await assert.rejects(()=>f.verifier.authorize(f.binding));
});
