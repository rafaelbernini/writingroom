import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID,scrypt} from 'node:crypto';
import {promisify} from 'node:util';
import {makeProject,addNode,validate} from './core.mjs';
import {normalizeRichDocument,richText} from '../../editor/src/schema.mjs';
export const MAX_PACKAGE_PLAIN=8_000_000,MAX_PACKAGE_FILE=11_000_000;
const derive=promisify(scrypt),digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
function invalid(message='Pacote editorial inválido ou incompatível.'){const e=new Error(message);e.code='VALIDATION';throw e;}
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))invalid();}
function label(value,max){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/u.test(value))invalid('Confira título e identificações declaradas.');return value.trim();}
function secret(value){if(typeof value!=='string'||value.length<16||value.length>256||Buffer.byteLength(value)>1024||Buffer.from(value).toString('utf8')!==value)invalid('Use uma frase secreta de 16 a 256 caracteres.');return value;}
export function parsePackageJSON(text,max=MAX_PACKAGE_FILE){
 if(typeof text!=='string'||Buffer.byteLength(text)>max)invalid('Pacote excede o limite de tamanho.');
 const stack=[];let quoted=false,escaped=false,stringStart=0;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"'){quoted=false;const frame=stack.at(-1);if(frame?.object&&frame.key){let key;try{key=JSON.parse(text.slice(stringStart,i+1));}catch{invalid();}if(frame.keys.has(key))invalid();frame.keys.add(key);frame.key=false;}}}
 else if(c==='"'){quoted=true;stringStart=i;}else if(c==='{'||c==='['){if(stack.length>=48)invalid();stack.push(c==='{'?{object:true,key:true,keys:new Set()}:{object:false});}else if(c==='}'||c===']'){if(!stack.length)invalid();stack.pop();}else if(c===','&&stack.at(-1)?.object)stack.at(-1).key=true;}

 try{return JSON.parse(text);}catch{invalid();}
}
function cleanRich(value){const copy=normalizeRichDocument(value);function visit(n){if(n.marks)n.marks=n.marks.filter(m=>m.type!=='comment');for(const child of n.content||[])visit(child);}visit(copy.doc);return normalizeRichDocument(copy);}
export function packageCandidates(project){
 validate(project);const result=[],stack=[project.roots.draft];while(stack.length){const id=stack.pop(),n=project.nodes.find(n=>n.id===id);if(n.deleted)continue;if(n.kind==='text'&&!n.source)result.push({id:n.id,title:n.title});const children=project.nodes.filter(n=>n.parent_id===id).sort((a,b)=>b.sort_key-a.sort_key);stack.push(...children.map(n=>n.id));}return result;
}
export function previewEditorialPackage(project,input){
 const title=label(input.title,180),sender=label(input.sender,100),recipient=label(input.recipient,100),ids=input.node_ids;
 if(!Array.isArray(ids)||!ids.length||ids.length>200||new Set(ids).size!==ids.length||ids.some(id=>!uuid(id)))invalid('Selecione de 1 a 200 cenas do Manuscrito.');
 const candidates=packageCandidates(project),selected=candidates.filter(n=>ids.includes(n.id));if(selected.length!==ids.length)invalid('Seleção fora do Manuscrito disponível.');
 const scenes=selected.map(n=>{const text=project.documents[n.id];if(Buffer.byteLength(text)>1_500_000)invalid('Uma cena excede 1,5 MB.');if(n.title.length>180)invalid('Um título de cena excede 180 caracteres.');return {id:n.id,title:n.title,text,...(project.rich_documents?.[n.id]?{rich_document:cleanRich(project.rich_documents[n.id])}:{})};});
 const content={title,sender,recipient,scenes},bytes=Buffer.byteLength(JSON.stringify(content));if(bytes>MAX_PACKAGE_PLAIN-1000)invalid('Seleção excede 8 MB.');
 const hash=digest({content,visual:selected.map(n=>project.rich_documents?.[n.id]??null)});
 return {hash,bytes,content,omitted:'Pesquisa, anexos, lixeira, comentários privados, notas do inspetor, sinopses, metadados, acompanhamento, perfil, versões e propostas não entram. Notas de publicação e links das cenas selecionadas entram.'};
}
function validateContent(p){
 exact(p,['format','version','id','created_at','kind','sender','recipient','title','scenes']);if(p.format!=='writingroom-editorial-content'||p.version!==1||p.kind!=='reading-copy'||!uuid(p.id)||typeof p.created_at!=='string'||!Number.isFinite(Date.parse(p.created_at)))invalid();
 for(const [key,max] of [['title',180],['sender',100],['recipient',100]])if(label(p[key],max)!==p[key])invalid();
 if(!Array.isArray(p.scenes)||!p.scenes.length||p.scenes.length>200)invalid();const ids=new Set();
 for(const s of p.scenes){exact(s,s.rich_document===undefined?['id','title','text']:['id','title','text','rich_document']);if(!uuid(s.id)||ids.has(s.id)||typeof s.title!=='string'||!s.title.trim()||s.title.length>180||typeof s.text!=='string'||Buffer.byteLength(s.text)>1_500_000)invalid();ids.add(s.id);if(s.rich_document!==undefined){const cleaned=cleanRich(s.rich_document);if(JSON.stringify(cleaned)!==JSON.stringify(normalizeRichDocument(s.rich_document))||richText(cleaned)!==s.text)invalid();}}
 if(Buffer.byteLength(JSON.stringify(p))>MAX_PACKAGE_PLAIN)invalid();return p;
}
function header(salt,iv){return {format:'writingroom-encrypted-package',version:1,cipher:'aes-256-gcm',kdf:{name:'scrypt',N:131072,r:8,p:1,salt},iv};}
function base64(value,size,max=size){if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||!value.length||value.length%4!==0||/[^A-Za-z0-9+/=]/.test(value))invalid();const b=Buffer.from(value,'base64');if(b.length<size||b.length>max||b.toString('base64')!==value)invalid();return b;}
export function canonicalPackageEnvelope(p){
 exact(p,['format','version','cipher','kdf','iv','ciphertext','tag']);exact(p.kdf,['name','N','r','p','salt']);
 if(p.format!=='writingroom-encrypted-package'||p.version!==1||p.cipher!=='aes-256-gcm'||p.kdf.name!=='scrypt'||p.kdf.N!==131072||p.kdf.r!==8||p.kdf.p!==1)invalid();
 base64(p.kdf.salt,16);base64(p.iv,12);base64(p.tag,16);base64(p.ciphertext,1,MAX_PACKAGE_PLAIN);return {...header(p.kdf.salt,p.iv),ciphertext:p.ciphertext,tag:p.tag};
}
async function keyFor(passphrase,salt){return derive(secret(passphrase),salt,32,{N:131072,r:8,p:1,maxmem:192*1024*1024});}
export async function encryptEditorialPackage(project,input){
 const preview=previewEditorialPackage(project,input);if(typeof input.preview_hash!=='string'||input.preview_hash!==preview.hash){const e=new Error('A seleção mudou. Atualize e confira a prévia antes de cifrar.');e.code='CONFLICT';throw e;}
 secret(input.passphrase);if(input.passphrase!==input.confirm_passphrase)invalid('As frases secretas não coincidem.');
 const content=validateContent({format:'writingroom-editorial-content',version:1,id:randomUUID(),created_at:new Date().toISOString(),kind:'reading-copy',sender:preview.content.sender,recipient:preview.content.recipient,title:preview.content.title,scenes:preview.content.scenes.map(s=>({...s,id:randomUUID()}))});
 return encryptPackagePayload(content,input.passphrase);
}
export async function encryptPackagePayload(content,passphrase){
 const plain=Buffer.from(JSON.stringify(content));if(plain.length>MAX_PACKAGE_PLAIN){plain.fill(0);invalid('Conteúdo excede 8 MB.');}const salt=randomBytes(16),iv=randomBytes(12),h=header(salt.toString('base64'),iv.toString('base64'));let key;
 try{key=await keyFor(passphrase,salt);const cipher=createCipheriv('aes-256-gcm',key,iv,{authTagLength:16});cipher.setAAD(Buffer.from(JSON.stringify(h)));const ciphertext=Buffer.concat([cipher.update(plain),cipher.final()]);return {...h,ciphertext:ciphertext.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}finally{key?.fill(0);plain.fill(0);}
}
export async function decryptPackagePayload(file,passphrase){
 const p=canonicalPackageEnvelope(parsePackageJSON(file)),salt=base64(p.kdf.salt,16),iv=base64(p.iv,12),tag=base64(p.tag,16),ciphertext=base64(p.ciphertext,1,MAX_PACKAGE_PLAIN),h=header(p.kdf.salt,p.iv),key=await keyFor(passphrase,salt);let parts=[],plain;
 try{const decipher=createDecipheriv('aes-256-gcm',key,iv,{authTagLength:16});decipher.setAAD(Buffer.from(JSON.stringify(h)));decipher.setAuthTag(tag);try{parts.push(decipher.update(ciphertext));parts.push(decipher.final());plain=Buffer.concat(parts);}catch{invalid('Não foi possível abrir: frase incorreta ou pacote adulterado.');}
 return parsePackageJSON(new TextDecoder('utf-8',{fatal:true}).decode(plain),MAX_PACKAGE_PLAIN);
 }catch(error){if(error.code==='VALIDATION')throw error;invalid();}finally{key.fill(0);plain?.fill(0);for(const part of parts)part.fill(0);}
}
export async function decryptEditorialPackage(file,passphrase,expectedRecipient){
 const expected=label(expectedRecipient,100),content=validateContent(await decryptPackagePayload(file,passphrase));if(content.recipient!==expected)invalid('O destinatário declarado não coincide. Confira a identificação combinada com o remetente.');return content;
}
export function projectFromEditorialPackage(content){
 validateContent(content);const p=makeProject(content.title+' (pacote)');for(const scene of content.scenes){const id=addNode(p,p.roots.draft,scene.title);p.documents[id]=scene.text;if(scene.rich_document){p.schema_version=2;p.rich_documents??={};p.rich_documents[id]=structuredClone(scene.rich_document);}}validate(p);return p;
}
export function createPackageStaging({ttlMs=300000,maxEntries=4,now=()=>Date.now()}={}){
 const entries=new Map();function prune(){for(const [key,value] of entries)if(value.expires<=now())entries.delete(key);}
 function lookup(token){prune();const entry=entries.get(token);if(!entry)invalid('Prévia expirada ou cancelada. Abra o pacote novamente.');return entry;}
 return {prune,clear(){entries.clear();},add(content){prune();if(entries.size>=maxEntries)invalid('Há muitas prévias abertas. Cancele uma ou aguarde cinco minutos.');validateContent(content);const token=randomBytes(32).toString('hex');entries.set(token,{content:structuredClone(content),expires:now()+ttlMs});return token;},get:lookup,cancel(token){entries.delete(token);},async commit(token,save){const entry=lookup(token);if(entry.result)return entry.result;if(!entry.project)entry.project=projectFromEditorialPackage(entry.content);await save(entry.project);entry.result={id:entry.project.id};delete entry.content;delete entry.project;return entry.result;}};
}
