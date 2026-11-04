import {createHash,randomUUID} from 'node:crypto';
import {lstat,mkdir,readFile,open,rename,rm} from 'node:fs/promises';
import path from 'node:path';
const fields=['real_name','pseudonym','address','phone','email','bio'];
export const emptyProfile=()=>({version:1,real_name:'',pseudonym:'',use_pseudonym:false,address:'',phone:'',email:'',bio:''});
function invalid(){const error=new Error('Perfil inválido. Confira campos, limites e pseudônimo.');error.code='VALIDATION';throw error;}
export function normalizeProfile(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||Object.keys(value).some(k=>!['version','use_pseudonym',...fields].includes(k))||typeof value.use_pseudonym!=='boolean')invalid();
 const result=emptyProfile();for(const field of fields){const v=value[field];if(typeof v!=='string'||v.length>(field==='bio'?4000:field==='address'?1000:field==='phone'?100:300)||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(v))invalid();result[field]=v.trim();}
 result.use_pseudonym=value.use_pseudonym;if(result.use_pseudonym&&!result.pseudonym)invalid();return result;
}
export const profileHash=p=>createHash('sha256').update(JSON.stringify(normalizeProfile(p))).digest('hex');
export const publicationName=p=>{const valid=normalizeProfile(p);return valid.use_pseudonym?valid.pseudonym:valid.real_name;};
async function directory(dir,create=false){if(create)await mkdir(dir,{recursive:true,mode:0o700});const info=await lstat(dir);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Pasta de preferências inválida');}
async function checkedFile(file){try{const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile())throw new Error('Perfil local indisponível');return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
export async function readProfile(base){const dir=path.join(base,'.settings');try{await directory(base);await directory(dir);}catch(error){if(error.code==='ENOENT'){const profile=emptyProfile();return {profile,hash:profileHash(profile)};}throw error;}const file=path.join(dir,'author-profile.json'),profile=await checkedFile(file)?normalizeProfile(JSON.parse(await readFile(file,'utf8'))):emptyProfile();return {profile,hash:profileHash(profile)};}
export async function saveProfile(base,input,baseHash){
 const profile=normalizeProfile(input),current=await readProfile(base);if(current.hash!==baseHash){const error=new Error('O perfil mudou em outra sessão. Seus campos foram mantidos; baixe uma cópia antes de reabrir.');error.code='CONFLICT';throw error;}
 await directory(base,true);const dir=path.join(base,'.settings');await directory(dir,true);const file=path.join(dir,'author-profile.json');await checkedFile(file);const temp=path.join(dir,randomUUID()+'.tmp');let handle;
 try{handle=await open(temp,'wx',0o600);await handle.writeFile(JSON.stringify(profile,null,2));await handle.sync();await handle.close();handle=null;await rename(temp,file);}finally{if(handle)await handle.close();await rm(temp,{force:true});}return {profile,hash:profileHash(profile)};
}
export function profileBackup(profile){profile=normalizeProfile(profile);return {format:'writingroom-private-profile',version:1,checksum:profileHash(profile),profile};}
export function readProfileBackup(bundle){if(!bundle||bundle.format!=='writingroom-private-profile'||bundle.version!==1||profileHash(bundle.profile)!==bundle.checksum)invalid();return normalizeProfile(bundle.profile);}
