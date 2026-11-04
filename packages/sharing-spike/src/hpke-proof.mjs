// Offline, synthetic-only experiment. No production key directory, storage or transport.
import { CipherSuite, KEM_DHKEM_X25519_HKDF_SHA256, KDF_HKDF_SHA256, AEAD_AES_256_GCM } from 'hpke';
const suite = new CipherSuite(KEM_DHKEM_X25519_HKDF_SHA256, KDF_HKDF_SHA256, AEAD_AES_256_GCM);
const text = new TextEncoder();
const MAX = 65536;
const fail = () => { throw new Error('HPKE_PROOF_REJECTED'); };
const bytes = value => {if (!(value instanceof Uint8Array)) fail();return value;};
const encode = value => btoa(Array.from(bytes(value), b => String.fromCharCode(b)).join(''));
function decode(value,length,max=length){
 if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))fail();
 const result=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 if(result.length<length||result.length>max||encode(result)!==value)fail();return result;
}
const hex = value => Array.from(value,b=>b.toString(16).padStart(2,'0')).join('');
const digest = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',value)));
export async function createProofRecipient(){return suite.GenerateKeyPair();}
export async function publicProofCard(publicKey){
 const raw=await suite.SerializePublicKey(publicKey);
 return {format:'writingroom-synthetic-hpke-key',version:1,public_key:encode(raw),fingerprint:await digest(raw)};
}
async function checkedCard(card){
 if(!card||typeof card!=='object'||Object.keys(card).sort().join(',')!=='fingerprint,format,public_key,version'||card.format!=='writingroom-synthetic-hpke-key'||card.version!==1)fail();
 const raw=decode(card.public_key,32);if(await digest(raw)!==card.fingerprint)fail();return suite.DeserializePublicKey(raw);
}
function context(value){
 if(!value||Object.keys(value).sort().join(',')!=='device,project,recipient,transfer')fail();
 for(const k of ['device','project','recipient','transfer'])if(typeof value[k]!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(value[k]))fail();
 return {device:value.device,project:value.project,recipient:value.recipient,transfer:value.transfer};
}
function header(card,scope){return {format:'writingroom-synthetic-hpke-proof',version:1,mode:'base',suite:'X25519-HKDF-SHA256-AES256GCM',recipient_fingerprint:card.fingerprint,context:context(scope)};}
const info = h => text.encode('WritingRoom synthetic HPKE proof v1\n'+JSON.stringify(h));
export async function sealProof(card,plaintext,scope){
 try{
  bytes(plaintext);if(plaintext.length>MAX)fail();const content=plaintext.slice(),cardCopy=structuredClone(card),scopeCopy=context(scope);const key=await checkedCard(cardCopy),h=header(cardCopy,scopeCopy);
  const {encapsulatedSecret,ciphertext}=await suite.Seal(key,content,{info:info(h),aad:text.encode('synthetic-content-v1')});
  return {...h,enc:encode(encapsulatedSecret),ciphertext:encode(ciphertext)};
 }catch{fail();}
}
export async function openProof(recipient,envelope,expectedScope){
 try{
  envelope=structuredClone(envelope);const expected=context(expectedScope),pair={publicKey:recipient.publicKey,privateKey:recipient.privateKey};
  if(!envelope||Object.keys(envelope).sort().join(',')!=='ciphertext,context,enc,format,mode,recipient_fingerprint,suite,version')fail();
  const card=await publicProofCard(pair.publicKey),h=header(card,expected);
  for(const k of ['format','version','mode','suite','recipient_fingerprint'])if(envelope[k]!==h[k])fail();
  if(JSON.stringify(context(envelope.context))!==JSON.stringify(h.context))fail();
  const enc=decode(envelope.enc,32),ciphertext=decode(envelope.ciphertext,16,MAX+16);
  return await suite.Open(pair,enc,ciphertext,{info:info(h),aad:text.encode('synthetic-content-v1')});
 }catch{fail();}
}
