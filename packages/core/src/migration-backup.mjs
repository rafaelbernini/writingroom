import {randomUUID,createHash} from 'node:crypto';
import {mkdir,lstat,open,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {validate} from './core.mjs';
import {projectBackup} from './workspace.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
async function syncFile(file){const handle=await open(file,'r');try{await handle.sync();}finally{await handle.close();}}
async function write(file,data){const handle=await open(file,'wx',0o600);try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}}
async function directory(dir){await mkdir(dir,{recursive:true,mode:0o700});const info=await lstat(dir);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Diretório de backup inválido');}
export async function verifyMigrationBackup(dir){
 const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
 if(manifest.format!=='writingroom-migration-backup'||manifest.version!==1||![2,3,4,5,6,7].includes(manifest.target_schema)||manifest.target_schema<=manifest.source_schema||manifest.files?.length!==2||manifest.files[0].path!=='project.json'||manifest.files[1].path!=='backup.json')throw new Error('Manifesto de migração inválido');
 const raw=await readFile(path.join(dir,'project.json')),envelope=await readFile(path.join(dir,'backup.json'));
 for(const [index,bytes] of [raw,envelope].entries())if(bytes.length!==manifest.files[index].bytes||hash(bytes)!==manifest.files[index].sha256)throw new Error('Checksum do backup de migração incompatível');
 const project=JSON.parse(raw),backup=JSON.parse(envelope);validate(project);
 if(project.id!==manifest.project_id||project.schema_version!==manifest.source_schema||backup.format!=='writingroom-json-backup'||backup.version!==1||JSON.stringify(backup.project)!==JSON.stringify(project)||backup.checksum!==hash(JSON.stringify(project)))throw new Error('Backup de migração incompatível');
 return manifest;
}
export async function createMigrationBackup(root,raw,{targetSchema=2}={}){
 const source=Buffer.isBuffer(raw)?raw:Buffer.from(raw),project=JSON.parse(source);validate(project);
 if(![2,3,4,5,6,7].includes(targetSchema)||targetSchema<=project.schema_version)throw new Error('Destino de migração inválido');
 const parent=path.join(root,project.id);await directory(root);await directory(parent);
 const id=randomUUID(),dir=path.join(parent,id);let owned=false;
 try{
  await mkdir(dir,{mode:0o700});owned=true;
  const backup=Buffer.from(JSON.stringify(projectBackup(project),null,2)),manifest={format:'writingroom-migration-backup',version:1,id,project_id:project.id,created_at:new Date().toISOString(),source_schema:project.schema_version,target_schema:targetSchema,files:[{path:'project.json',bytes:source.length,sha256:hash(source)},{path:'backup.json',bytes:backup.length,sha256:hash(backup)}]};
  await write(path.join(dir,'project.json'),source);await write(path.join(dir,'backup.json'),backup);await write(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));
  await verifyMigrationBackup(dir);await syncFile(dir);await syncFile(parent);await syncFile(root);
  return {id,project_id:project.id};
 }catch(error){if(owned)await rm(dir,{recursive:true,force:true});throw error;}
}
