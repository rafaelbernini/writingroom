import * as proof from '../../packages/sharing-spike/src/hpke-proof.mjs';
import { CipherSuite, KEM_DHKEM_X25519_HKDF_SHA256, KDF_HKDF_SHA256, AEAD_AES_256_GCM } from 'hpke';
import fixture from '../../packages/sharing-spike/test-vectors/rfc9180-x25519-aes256-base.json';
window.proof=proof;
window.scope={device:'device-1',project:'book-1',recipient:'editor-1',transfer:'transfer-1'};
window.runVectors=async()=>{
 const s=new CipherSuite(KEM_DHKEM_X25519_HKDF_SHA256,KDF_HKDF_SHA256,AEAD_AES_256_GCM),v=fixture.vector;
 const bytes=h=>Uint8Array.from(h.match(/../g)||[],c=>parseInt(c,16));
 const pair=await s.DeriveKeyPair(bytes(v.ikmR)),ctx=await s.SetupRecipient(pair,bytes(v.enc),{info:bytes(v.info)});
 for(const e of v.encryptions){const opened=await ctx.Open(bytes(e.ct),bytes(e.aad));if(opened.length!==bytes(e.pt).length||opened.some((b,i)=>b!==bytes(e.pt)[i]))throw new Error('VECTOR_FAILED');}
 return v.encryptions.length;
};
import * as bindingProof from '../../packages/sharing-spike/src/device-binding-proof.mjs';
window.bindingProof=bindingProof;
