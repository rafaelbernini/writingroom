import {createHash,randomUUID} from 'node:crypto';
import {mkdir,lstat,readFile,readdir,open,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {validate} from './core.mjs';
import {projectBackup} from './workspace.mjs';
export const MAX_BACKUP_BYTES=32_000_000;
const hash=data=>createHash('sha256').update(data).digest('hex');
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
function invalid(message='Configuração de backup inválida'){const error=new Error(message);error.code='VALIDATION';throw error;}
async function directory(dir,create=false){if(create)await mkdir(dir,{recursive:true,mode:0o700});const info=await lstat(dir);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Destino de backup indisponível');}
async function fileBytes(file,max){const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile()||info.size>max)throw new Error('Arquivo de backup inválido ou grande demais');return readFile(file);}
async function syncDirectory(dir){const handle=await open(dir,'r');try{await handle.sync();}finally{await handle.close();}}
async function writeExclusive(file,data){const handle=await open(file,'wx',0o600);try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}}
async function readSetting(base,name,fallback){const dir=path.join(base,'.settings');try{await directory(base);await directory(dir);return JSON.parse(await fileBytes(path.join(dir,name),1_000_000));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
async function writeSetting(base,name,value){await directory(base,true);const dir=path.join(base,'.settings');await directory(dir,true);const file=path.join(dir,name);try{await fileBytes(file,1_000_000);}catch(error){if(error.code!=='ENOENT')throw error;}const data=JSON.stringify(value,null,2);if(Buffer.byteLength(data)>1000000)throw new Error('Estado de backup grande demais');const temp=path.join(dir,randomUUID()+'.tmp');try{await writeExclusive(temp,data);await rename(temp,file);await syncDirectory(dir);}finally{await rm(temp,{force:true});}}
export function backupDestinations(values,defaultRoot){
 const input=values??{local:defaultRoot};if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length||Object.keys(input).length>8)invalid('Destinos de backup inválidos');
 return Object.entries(input).map(([id,root])=>{if(!/^[a-z][a-z0-9-]{0,30}$/.test(id)||typeof root!=='string'||!path.isAbsolute(root))invalid('Destino deve ter ID válido e pasta absoluta');if(path.resolve(root).split(path.sep).some(part=>/\.wroom$/i.test(part)))invalid('Destino não pode ficar dentro de uma pasta de projeto');return {id,label:id==='local'?'Pasta local padrão':id,root:path.resolve(root)};});
}
export const defaultBackupSettings=id=>({version:1,enabled:false,interval_minutes:60,retain_automatic:10,destination:id});
export function normalizeBackupSettings(value,destinations){
 if(!value||value.version!==1||Object.keys(value).some(k=>!['version','enabled','interval_minutes','retain_automatic','destination'].includes(k))||typeof value.enabled!=='boolean'||![15,30,60,180,1440].includes(value.interval_minutes)||!Number.isSafeInteger(value.retain_automatic)||value.retain_automatic<2||value.retain_automatic>50||!destinations.some(d=>d.id===value.destination))invalid();
 return {version:1,enabled:value.enabled,interval_minutes:value.interval_minutes,retain_automatic:value.retain_automatic,destination:value.destination};
}
export const backupSettingsHash=settings=>hash(JSON.stringify(settings));
export async function readBackupSettings(base,destinations){const settings=normalizeBackupSettings(await readSetting(base,'backup-settings.json',defaultBackupSettings(destinations[0].id)),destinations);return {settings,hash:backupSettingsHash(settings)};}
export async function saveBackupSettings(base,destinations,value,baseHash){const settings=normalizeBackupSettings(value,destinations),current=await readBackupSettings(base,destinations);if(current.hash!==baseHash){const error=new Error('A configuração mudou em outra sessão. Reabra a central antes de salvar.');error.code='CONFLICT';throw error;}await writeSetting(base,'backup-settings.json',settings);return {settings,hash:backupSettingsHash(settings)};}
export async function readBackupState(base){const value=await readSetting(base,'backup-state.json',{version:1,projects:{}});if(!value||value.version!==1||!value.projects||typeof value.projects!=='object'||Array.isArray(value.projects)||Object.keys(value.projects).length>5000)throw new Error('Estado de backup inválido');return value;}
export const saveBackupState=(base,state)=>writeSetting(base,'backup-state.json',state);
function manifestCheck(m,projectId,backupId){if(!m||m.format!=='writingroom-managed-backup'||m.version!==1||m.project_id!==projectId||m.id!==backupId||!['manual','automatic'].includes(m.kind)||typeof m.project_name!=='string'||m.project_name.length>500||typeof m.created_at!=='string'||!Number.isFinite(Date.parse(m.created_at))||!Number.isSafeInteger(m.bytes)||m.bytes<1||m.bytes>MAX_BACKUP_BYTES||!/^[a-f0-9]{64}$/.test(m.sha256)||!/^[a-f0-9]{64}$/.test(m.project_checksum))throw new Error('Manifesto de backup inválido');return m;}
async function checkedGeneration(root,projectId,backupId){if(!uuid(projectId)||!uuid(backupId))invalid('Identidade de backup inválida');await directory(root);const parent=path.join(root,projectId);await directory(parent);const dir=path.join(parent,backupId);await directory(dir);return dir;}
async function verifyAt(dir,projectId,backupId){
 const manifest=manifestCheck(JSON.parse(await fileBytes(path.join(dir,'manifest.json'),10000)),projectId,backupId),bytes=await fileBytes(path.join(dir,'backup.json'),MAX_BACKUP_BYTES);
 if(bytes.length!==manifest.bytes||hash(bytes)!==manifest.sha256)throw new Error('Checksum externo incompatível');const bundle=JSON.parse(bytes);if(bundle.format!=='writingroom-json-backup'||bundle.version!==1||bundle.project?.id!==projectId||bundle.checksum!==manifest.project_checksum||hash(JSON.stringify(bundle.project))!==bundle.checksum)throw new Error('Envelope de backup incompatível');validate(bundle.project);return {manifest,bundle,bytes};
}
export async function verifyManagedBackup(root,projectId,backupId){return verifyAt(await checkedGeneration(root,projectId,backupId),projectId,backupId);}
export async function listManagedBackups(root,{projectId,limit=200}={}){
 if(projectId&&!uuid(projectId))invalid('Projeto inválido');try{await directory(root);}catch(error){if(error.code==='ENOENT')return {items:[],truncated:false};throw error;}
 const items=[];let projectEntries=projectId?[{name:projectId,isDirectory:()=>true,isSymbolicLink:()=>false}]:await readdir(root,{withFileTypes:true});
 for(const parent of projectEntries){if(!uuid(parent.name)||!parent.isDirectory()||parent.isSymbolicLink())continue;const parentDir=path.join(root,parent.name);try{await directory(parentDir);}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const entry of await readdir(parentDir,{withFileTypes:true})){if(!uuid(entry.name))continue;try{if(entry.isSymbolicLink()||!entry.isDirectory())throw new Error('Geração inválida');const dir=path.join(parentDir,entry.name);const m=manifestCheck(JSON.parse(await fileBytes(path.join(dir,'manifest.json'),10000)),parent.name,entry.name);items.push({...m,state:'created-verified'});}catch{items.push({id:entry.name,project_id:parent.name,project_name:'Cópia indisponível',state:'unavailable',created_at:null});}}
 }
 items.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')||b.id.localeCompare(a.id));return {items:items.slice(0,limit),truncated:items.length>limit};
}
export async function createManagedBackup(root,project,{kind='manual',now=new Date().toISOString(),retain=10}={}){
 validate(project);if(!['manual','automatic'].includes(kind)||!Number.isFinite(Date.parse(now))||!Number.isSafeInteger(retain)||retain<2||retain>50)invalid();
 const id=randomUUID(),bundle=projectBackup(project),bytes=Buffer.from(JSON.stringify(bundle));if(bytes.length>MAX_BACKUP_BYTES)invalid('A cópia excede 32 MB; preserve o projeto por outro meio antes de continuar.');
 await directory(root,true);const parent=path.join(root,project.id);await directory(parent,true);const pending=path.join(parent,'.pending-'+id),final=path.join(parent,id);let owned=false,published=false;
 try{await mkdir(pending,{mode:0o700});owned=true;const manifest={format:'writingroom-managed-backup',version:1,id,project_id:project.id,project_name:project.name.slice(0,500),created_at:now,kind,bytes:bytes.length,sha256:hash(bytes),project_checksum:bundle.checksum};await writeExclusive(path.join(pending,'backup.json'),bytes);await writeExclusive(path.join(pending,'manifest.json'),JSON.stringify(manifest,null,2));await verifyAt(pending,project.id,id);await syncDirectory(pending);await rename(pending,final);published=true;await syncDirectory(parent);await syncDirectory(root);
  let removed=0,retention_warning=false;
  if(kind==='automatic')try{const history=await listManagedBackups(root,{projectId:project.id,limit:10000});const others=history.items.filter(m=>m.kind==='automatic'&&m.id!==id);const verified=[];for(const old of others){try{await verifyManagedBackup(root,project.id,old.id);verified.push(old);}catch{/* Corrupt/incomplete backups are preserved for inspection. */}}
   for(const old of verified.slice(retain-1)){const oldDir=await checkedGeneration(root,project.id,old.id);const names=await readdir(oldDir);if(names.some(name=>!['backup.json','manifest.json'].includes(name)))continue;await rm(oldDir,{recursive:true});removed++;}if(removed)await syncDirectory(parent);
  }catch{retention_warning=true;}
  return {manifest,removed,retention_warning};
 }catch(error){if(owned&&!published)await rm(pending,{recursive:true,force:true});throw error;}
}
export const isBackupDue=(entry,settings,now)=>!entry?.last_attempt||!Number.isFinite(Date.parse(entry.last_attempt))||now<Date.parse(entry.last_attempt)||now-Date.parse(entry.last_attempt)>=settings.interval_minutes*60000;
