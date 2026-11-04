// Isolated experiment: never imported by the web application or legacy CLI.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,rename,copyFile,lstat,readdir,realpath,open,chmod} from 'node:fs/promises';
import path from 'node:path';
import {validate} from '../../core/src/core.mjs';

const STORAGE_SCHEMA=1;
const hash=value=>createHash('sha256').update(value).digest('hex');
export class StorageError extends Error {
 constructor(code,message){super(message);this.code=code;}
}
function fail(code,message){throw new StorageError(code,message);}
async function sqlite(){
 try{return (await import('node:sqlite')).DatabaseSync;}catch{fail('UNSUPPORTED','Esta prova exige Node com SQLite nativo.');}
}
async function regular(file,{directory=false,optional=false}={}){
 try{const info=await lstat(file);if(info.isSymbolicLink()||(directory?!info.isDirectory():!info.isFile()))fail('UNSAFE_PATH','Caminho não é um arquivo/diretório regular.');return info;}
 catch(error){if(optional&&error.code==='ENOENT')return null;throw error;}
}
async function syncFile(file){const handle=await open(file,'r');try{await handle.sync();}finally{await handle.close();}}
async function destinationPath(destination){
 const absolute=path.resolve(destination),parent=await realpath(path.dirname(absolute));
 return path.join(parent,path.basename(absolute));
}
async function publish(stage,destination,files){
 let owned=false;
 try{
  await mkdir(destination,{mode:0o700});owned=true;
  for(const file of files)await rename(path.join(stage,file),path.join(destination,file));
  await syncFile(destination);await syncFile(path.dirname(destination));
 }catch(error){if(owned)await rm(destination,{recursive:true,force:true});throw error;}
}
function configure(db){db.exec('PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=500; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');}
function schema(db){if(db.prepare('PRAGMA user_version').get().user_version!==STORAGE_SCHEMA)fail('SCHEMA','Versão de storage incompatível; origem preservada.');}
function aggregate(db){
 schema(db);
 const rows=db.prepare('SELECT * FROM project').all();if(rows.length!==1)fail('INVALID','Projeto inválido.');
 const project=JSON.parse(rows[0].metadata_json),documents={},revisions={};
 for(const doc of db.prepare('SELECT * FROM document').all()){
  if(doc.project_id!==project.id)fail('INVALID','Identidade incompatível.');
  documents[doc.node_id]=doc.content;revisions[doc.node_id]=doc.revision;
 }
 project.documents=documents;validate(project);
 if(project.id!==rows[0].id)fail('INVALID','Identidade incompatível.');
 return {project,revisions};
}
function inspect(db){
 schema(db);
 if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)fail('INTEGRITY','Banco inválido.');
 const view=aggregate(db),docs=db.prepare('SELECT * FROM document').all();
 for(const doc of docs){
  const history=db.prepare('SELECT * FROM revision WHERE node_id=? ORDER BY sequence').all(doc.node_id);
  if(history.length!==doc.revision+1)fail('INTEGRITY','Histórico incompleto.');
  for(let i=0;i<history.length;i++)if(history[i].sequence!==i||hash(history[i].content)!==history[i].checksum)fail('INTEGRITY','Revisão inválida.');
  if(history.at(-1).content!==doc.content)fail('INTEGRITY','Texto diverge do histórico.');
 }
 return {project_id:view.project.id,node_count:view.project.nodes.length,document_count:docs.length,snapshot_count:view.project.snapshots.length,revision_count:db.prepare('SELECT COUNT(*) AS total FROM revision').get().total,revisions:view.revisions};
}

export async function createRepository(destination,project){
 project=structuredClone(project);validate(project);const Database=await sqlite(),target=await destinationPath(destination);
 const stage=await mkdtemp(path.join(path.dirname(target),'.writingroom-create-'));let db;
 try{
  const file=path.join(stage,'project.sqlite');db=new Database(file);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL; BEGIN IMMEDIATE;');
  try{
   db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
   const metadata=structuredClone(project);delete metadata.documents;
   db.prepare('INSERT INTO project VALUES (?,?)').run(project.id,JSON.stringify(metadata));
   const doc=db.prepare('INSERT INTO document VALUES (?,?,?,0)'),revision=db.prepare('INSERT INTO revision VALUES (?,0,?,?,?)');
   for(const [id,text] of Object.entries(project.documents)){doc.run(id,project.id,text);revision.run(id,text,hash(text),project.created_at);}
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  inspect(db);db.close();db=null;await chmod(file,0o600);await syncFile(file);
  await publish(stage,target,['project.sqlite']);
 }finally{if(db)db.close();await rm(stage,{recursive:true,force:true});}
 return openRepository(target);
}

export async function openRepository(directory,{readOnly=false}={}){
 const Database=await sqlite();await regular(directory,{directory:true});const dir=await realpath(directory),file=path.join(dir,'project.sqlite');await regular(file);
 // Probe before opening any writer or changing journal mode, including unknown versions.
 const probe=new Database(file,{readOnly:true});try{probe.exec('PRAGMA trusted_schema=OFF; BEGIN');inspect(probe);probe.exec('COMMIT');}finally{probe.close();}
 let lock,db;
 try{
  if(!readOnly){
   const lockFile=path.join(dir,'.writer.sqlite');await regular(lockFile,{optional:true});
   lock=new Database(lockFile);await chmod(lockFile,0o600);
   try{lock.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE;');}catch{fail('LOCKED','Projeto já aberto para escrita.');}
  }
  db=new Database(file,{readOnly});if(!readOnly)configure(db);else db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=500;');
  schema(db);let closed=false;
  function active(){if(closed)fail('CLOSED','Sessão encerrada.');}
  function writable(){active();if(readOnly)fail('READONLY','Sessão somente leitura.');}
  return {
   read(){
    active();db.exec('BEGIN');try{const result=aggregate(db);db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
   },
   writeText({nodeId,baseRevision,operationId,text}){
    writable();
    if(typeof nodeId!=='string'||typeof text!=='string'||!Number.isSafeInteger(baseRevision)||baseRevision<0||typeof operationId!=='string'||!operationId.trim()||operationId.length>200)fail('VALIDATION','Comando inválido.');
    const fingerprint=hash(JSON.stringify({nodeId,baseRevision,text}));db.exec('BEGIN IMMEDIATE');
    try{
     const previous=db.prepare('SELECT * FROM command WHERE operation_id=?').get(operationId);
     if(previous){if(previous.fingerprint!==fingerprint)fail('OPERATION_REUSED','Identificador reutilizado com outro comando.');db.exec('COMMIT');return JSON.parse(previous.result_json);}
     const doc=db.prepare('SELECT * FROM document WHERE node_id=?').get(nodeId);
     if(!doc)fail('NOT_FOUND','Documento não encontrado.');
     if(JSON.parse(db.prepare('SELECT metadata_json FROM project').get().metadata_json).rich_documents?.[nodeId])fail('UNSUPPORTED','Edição visual não é suportada por esta prova de storage.');
     if(doc.revision!==baseRevision)fail('CONFLICT','Revisão desatualizada; conteúdo preservado.');
     const revision=doc.revision+1;if(!Number.isSafeInteger(revision))fail('VALIDATION','Limite de revisão excedido.');
     const checksum=hash(text),timestamp=new Date().toISOString(),result={revision,hash:checksum};
     db.prepare('UPDATE document SET content=?,revision=? WHERE node_id=?').run(text,revision,nodeId);
     db.prepare('INSERT INTO revision VALUES (?,?,?,?,?)').run(nodeId,revision,text,checksum,timestamp);
     const row=db.prepare('SELECT * FROM project').get(),metadata=JSON.parse(row.metadata_json);metadata.updated_at=timestamp;
     db.prepare('UPDATE project SET metadata_json=? WHERE id=?').run(JSON.stringify(metadata),row.id);
     db.prepare('INSERT INTO command VALUES (?,?,?)').run(operationId,fingerprint,JSON.stringify(result));
     db.exec('COMMIT');return result;
    }catch(error){db.exec('ROLLBACK');throw error;}
   },
   async backup(destination){
    writable();const target=await destinationPath(destination);
    if(target===dir||target.startsWith(dir+path.sep))fail('DESTINATION','Backup deve ficar fora do projeto.');
    const stage=await mkdtemp(path.join(path.dirname(target),'.writingroom-backup-'));let image;
    try{
     active();db.prepare('VACUUM INTO ?').run(path.join(stage,'project.sqlite'));
     image=new Database(path.join(stage,'project.sqlite'));image.exec('PRAGMA journal_mode=DELETE;');
     const summary=inspect(image);image.close();image=null;
     const data=await readFile(path.join(stage,'project.sqlite'));
     const manifest={format:'writingroom-storage-spike-backup',version:1,storage_schema:STORAGE_SCHEMA,algorithm:'sha256',created_at:new Date().toISOString(),...summary,files:[{path:'project.sqlite',bytes:data.length,sha256:hash(data)}]};
     await chmod(path.join(stage,'project.sqlite'),0o600);
     await writeFile(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
     await syncFile(path.join(stage,'project.sqlite'));await syncFile(path.join(stage,'manifest.json'));
     await verifyBackup(stage);await publish(stage,target,['project.sqlite','manifest.json']);return manifest;
    }finally{if(image)image.close();await rm(stage,{recursive:true,force:true});}
   },
   close(){if(closed)return;closed=true;try{db.close();}finally{if(lock)lock.close();}}
  };
 }catch(error){if(db)db.close();if(lock)lock.close();throw error;}
}

export async function verifyBackup(directory){
 const Database=await sqlite();await regular(directory,{directory:true});
 const entries=(await readdir(directory)).sort();
 if(entries.length!==2||entries[0]!=='manifest.json'||entries[1]!=='project.sqlite')fail('MANIFEST','Backup contém arquivos não declarados.');
 const manifestFile=path.join(directory,'manifest.json'),databaseFile=path.join(directory,'project.sqlite');
 if((await regular(manifestFile)).size>65536)fail('MANIFEST','Manifesto grande demais.');
 let manifest;try{manifest=JSON.parse(await readFile(manifestFile,'utf8'));}catch{fail('MANIFEST','Manifesto inválido.');}
 if(!manifest||manifest.format!=='writingroom-storage-spike-backup'||manifest.version!==1||manifest.storage_schema!==1||manifest.algorithm!=='sha256'||!Array.isArray(manifest.files)||manifest.files.length!==1||manifest.files[0]?.path!=='project.sqlite')fail('MANIFEST','Formato de backup incompatível.');
 const entry=manifest.files[0],info=await regular(databaseFile);
 if(!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>256*1024*1024||info.size!==entry.bytes)fail('CHECKSUM','Tamanho do backup incompatível.');
 const bytes=await readFile(databaseFile);if(hash(bytes)!==entry.sha256)fail('CHECKSUM','Checksum do backup incompatível.');
 const db=new Database(databaseFile,{readOnly:true});
 try{
  db.exec('PRAGMA trusted_schema=OFF;');
  if(db.prepare('PRAGMA journal_mode').get().journal_mode!=='delete')fail('MANIFEST','Backup não é uma imagem independente do journal.');
  const summary=inspect(db);
  for(const key of ['project_id','node_count','document_count','snapshot_count','revision_count'])if(summary[key]!==manifest[key])fail('MANIFEST','Contagens do manifesto incompatíveis.');
  if(JSON.stringify(Object.entries(summary.revisions).sort())!==JSON.stringify(Object.entries(manifest.revisions??{}).sort()))fail('MANIFEST','Revisões do manifesto incompatíveis.');
 }finally{db.close();}
 return manifest;
}
export async function restoreBackup(source,destination){
 await verifyBackup(source);const target=await destinationPath(destination),stage=await mkdtemp(path.join(path.dirname(target),'.writingroom-restore-'));
 try{
  await copyFile(path.join(source,'project.sqlite'),path.join(stage,'project.sqlite'));
  await copyFile(path.join(source,'manifest.json'),path.join(stage,'manifest.json'));
  const manifest=await verifyBackup(stage);await chmod(path.join(stage,'project.sqlite'),0o600);await syncFile(path.join(stage,'project.sqlite'));
  await publish(stage,target,['project.sqlite']);return manifest;
 }finally{await rm(stage,{recursive:true,force:true});}
}
