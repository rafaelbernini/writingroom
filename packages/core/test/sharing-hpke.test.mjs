import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CipherSuite, KEM_DHKEM_X25519_HKDF_SHA256, KDF_HKDF_SHA256, AEAD_AES_256_GCM } from 'hpke';
import { createProofRecipient, publicProofCard, sealProof, openProof } from '../../sharing-spike/src/hpke-proof.mjs';
const suite=new CipherSuite(KEM_DHKEM_X25519_HKDF_SHA256,KDF_HKDF_SHA256,AEAD_AES_256_GCM);
const scope={device:'device-1',project:'book-1',recipient:'editor-1',transfer:'transfer-1'},plain=new TextEncoder().encode('Somente conteúdo sintético 🌱');
const fromHex=value=>new Uint8Array(Buffer.from(value,'hex'));
test('HPKE RFC9180: recipient derives official X25519 public key and decrypts 257 sequential vectors',async()=>{
 const {vector:v}=JSON.parse(await readFile(new URL('../../sharing-spike/test-vectors/rfc9180-x25519-aes256-base.json',import.meta.url),'utf8'));
 const pair=await suite.DeriveKeyPair(fromHex(v.ikmR),true);
 assert.equal(Buffer.from(await suite.SerializePublicKey(pair.publicKey)).toString('hex'),v.pkRm);
 assert.equal(Buffer.from(await suite.SerializePrivateKey(pair.privateKey)).toString('hex'),v.skRm);
 const ctx=await suite.SetupRecipient(pair,fromHex(v.enc),{info:fromHex(v.info)});
 for(const e of v.encryptions)assert.deepEqual(await ctx.Open(fromHex(e.ct),fromHex(e.aad)),fromHex(e.pt));
});
test('HPKE proof: randomized envelopes decrypt only with intended private key',async()=>{
 const r=await createProofRecipient(),card=await publicProofCard(r.publicKey),wrong=await createProofRecipient();
 const a=await sealProof(card,plain,scope),b=await sealProof(card,plain,scope);
 assert.notEqual(a.enc,b.enc);assert.notEqual(a.ciphertext,b.ciphertext);
 assert.deepEqual(await openProof(r,a,scope),plain);await assert.rejects(()=>openProof(wrong,a,scope),/HPKE_PROOF_REJECTED/);
 assert.equal(JSON.stringify(a).includes('Somente'),false);assert.equal(r.privateKey.extractable,false);
});
test('HPKE proof: ciphertext, encapsulation, context, suite and recipient tampering reject',async()=>{
 const r=await createProofRecipient(),envelope=await sealProof(await publicProofCard(r.publicKey),plain,scope);
 for(const change of [{ciphertext:envelope.ciphertext.replace(/^./,c=>c==='A'?'B':'A')},{enc:'A'.repeat(43)+'='},{mode:'auth'},{version:2},{suite:'legacy'},{recipient_fingerprint:'0'.repeat(64)},{extra:true}])await assert.rejects(()=>openProof(r,{...envelope,...change},scope),/HPKE_PROOF_REJECTED/);
 for(const key of Object.keys(scope))await assert.rejects(()=>openProof(r,envelope,{...scope,[key]:'different'}),/HPKE_PROOF_REJECTED/);
 await assert.rejects(()=>openProof(r,{...envelope,context:{...scope,project:'other'}},scope),/HPKE_PROOF_REJECTED/);
});
test('HPKE proof: invalid public card, oversized input and noncanonical encodings fail closed',async()=>{
 const r=await createProofRecipient(),card=await publicProofCard(r.publicKey);
 await assert.rejects(()=>sealProof({...card,fingerprint:'0'.repeat(64)},plain,scope));
 await assert.rejects(()=>sealProof(card,new Uint8Array(65537),scope));
 const env=await sealProof(card,plain,scope);await assert.rejects(()=>openProof(r,{...env,enc:env.enc+'\n'},scope));
 assert.deepEqual(await openProof(r,await sealProof(card,new Uint8Array(),scope),scope),new Uint8Array());
});
test('HPKE base is not sender identity or replay prevention; same envelope opens twice',async()=>{
 const r=await createProofRecipient(),card=await publicProofCard(r.publicKey),a=await sealProof(card,plain,scope);
 assert.deepEqual(await openProof(r,a,scope),plain);assert.deepEqual(await openProof(r,a,scope),plain);
 // Anyone with the public card can create a valid new ciphertext; trust/signature is a separate gate.
 assert.deepEqual(await openProof(r,await sealProof(card,plain,scope),scope),plain);
});

test('HPKE proof snapshots caller inputs before asynchronous encryption',async()=>{
 const r=await createProofRecipient(),card=await publicProofCard(r.publicKey),content=plain.slice(),context={...scope};
 const operation=sealProof(card,content,context);content.fill(0);card.fingerprint='changed';context.device='changed';
 assert.deepEqual(await openProof(r,await operation,scope),plain);
});
