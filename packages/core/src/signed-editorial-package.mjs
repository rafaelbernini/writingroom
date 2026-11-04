import {createHash,sign,verify} from 'node:crypto';
import {previewEditorialPackage,encryptEditorialPackage,decryptEditorialPackage,canonicalPackageEnvelope,parsePackageJSON,MAX_PACKAGE_FILE} from './editorial-package.mjs';
import {identityError,identityConflict,exactIdentity,isFingerprint,identityBase64,keyFingerprint,signingPublicKey,identityStateHash,localIdentity,trustedContact,unlockSigningIdentity} from './editorial-identities.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function signingSelection(state,input){if(input.identity_hash!==identityStateHash(state))identityConflict();const sender=localIdentity(state,input.sender_fingerprint,{active:true}),recipient=trustedContact(state,input.recipient_fingerprint);return {sender,recipient};}
export function previewSignedEditorialPackage(project,input,state){
 const preview=previewEditorialPackage(project,input),{sender,recipient}=signingSelection(state,input),signing={sender_fingerprint:sender.fingerprint,recipient_fingerprint:recipient.card.fingerprint,identity_hash:input.identity_hash};return {...preview,hash:digest({hash:preview.hash,...signing}),signing:{...signing,sender_name:sender.name,recipient_name:recipient.card.name}};
}
function signedHeader(p){return {format:p.format,version:p.version,algorithm:p.algorithm,sender_public_key:p.sender_public_key,sender_fingerprint:p.sender_fingerprint,recipient_fingerprint:p.recipient_fingerprint,envelope:canonicalPackageEnvelope(p.envelope)};}
const signedBytes=p=>Buffer.from('WritingRoom signed editorial package v2\n'+JSON.stringify(signedHeader(p)));
export async function encryptSignedEditorialPackage(project,input,state){
 const preview=previewSignedEditorialPackage(project,input,state);if(input.preview_hash!==preview.hash)identityConflict('A seleção ou as chaves mudaram. Confira uma nova prévia.');const {sender}=signingSelection(state,input),privateKey=await unlockSigningIdentity(sender,input.key_passphrase),plainPreview=previewEditorialPackage(project,input),envelope=await encryptEditorialPackage(project,{...input,preview_hash:plainPreview.hash});
 const record={format:'writingroom-signed-editorial-package',version:2,algorithm:'ed25519',sender_public_key:sender.public_key,sender_fingerprint:sender.fingerprint,recipient_fingerprint:input.recipient_fingerprint,envelope},signature=sign(null,signedBytes(record),privateKey).toString('base64'),result={...record,signature};if(Buffer.byteLength(JSON.stringify(result))>MAX_PACKAGE_FILE)identityError('Pacote assinado excede 11 MB.');return result;
}
export function verifySignedEditorialPackage(file,state){
 const p=parsePackageJSON(file);exactIdentity(p,['format','version','algorithm','sender_public_key','sender_fingerprint','recipient_fingerprint','envelope','signature']);if(p.format!=='writingroom-signed-editorial-package'||p.version!==2||p.algorithm!=='ed25519'||!isFingerprint(p.sender_fingerprint)||!isFingerprint(p.recipient_fingerprint)||keyFingerprint(p.sender_public_key)!==p.sender_fingerprint)identityError('Assinatura ou chave do pacote inválida.');
 const contact=trustedContact(state,p.sender_fingerprint);if(contact.card.public_key!==p.sender_public_key)identityError('A chave não coincide com o pin conferido.');localIdentity(state,p.recipient_fingerprint);const valid=verify(null,signedBytes(p),signingPublicKey(p.sender_public_key),identityBase64(p.signature,64));if(!valid)identityError('Assinatura inválida. O pacote não foi aberto.');return {envelope:p.envelope,verification:{kind:'pinned-key',contact_name:contact.card.name,sender_fingerprint:p.sender_fingerprint,recipient_fingerprint:p.recipient_fingerprint}};
}
export function recheckPackageIdentityPolicy(state,policy){if(policy?.kind!=='pinned-key')return;trustedContact(state,policy.sender_fingerprint);localIdentity(state,policy.recipient_fingerprint);}
export async function openEditorialPackage(file,passphrase,recipient,state,{requireSignature=false}={}){
 const parsed=parsePackageJSON(file);if(parsed?.format==='writingroom-signed-editorial-package'){const checked=verifySignedEditorialPackage(file,state),content=await decryptEditorialPackage(JSON.stringify(checked.envelope),passphrase,recipient);return {content,verification:checked.verification};}
 if(requireSignature)identityError('Este pacote não tem assinatura. Exigir assinatura está ativado.');return {content:await decryptEditorialPackage(file,passphrase,recipient),verification:{kind:'unsigned'}};
}
