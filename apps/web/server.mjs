import {roundHash,previewRoundCreation,createEditorialRound,sealRoundPayload,openRoundPackage,projectFromRoundOffer,previewRoundTransfer,exportRoundTransfer,previewRoundReturn,importRoundReturn,closeEditorialRound,createRoundStaging} from '../../packages/core/src/editorial-rounds.mjs';
import {readIdentityState,identityPublicState,addLocalIdentity,previewTrustedCard,trustIdentity,revokeIdentity,localIdentity} from '../../packages/core/src/editorial-identities.mjs';
import {previewSignedEditorialPackage,encryptSignedEditorialPackage,openEditorialPackage,recheckPackageIdentityPolicy} from '../../packages/core/src/signed-editorial-package.mjs';
import {packageCandidates,previewEditorialPackage,encryptEditorialPackage,decryptEditorialPackage,createPackageStaging} from '../../packages/core/src/editorial-package.mjs';
import {editorialSummary,updateTracking,trackingHash} from '../../packages/core/src/editorial-tracking.mjs';
import {proposeReview,decideReview,reviewHash} from '../../packages/core/src/reviews.mjs';
import {compareVersions} from '../../packages/core/src/version-comparison.mjs';
import {readLexicon,saveLexicon,lookupLexicon} from '../../packages/core/src/lexicon.mjs';
import {extractAttachment,useExtractedText} from '../../packages/core/src/document-research.mjs';
import {localSynonyms,translatorConfig,machineTranslation} from '../../packages/core/src/language-service.mjs';
import {createTranslation,createGlossaryEntry,bilingualReview,translationSourceState,invalidateTranslationReviews} from '../../packages/core/src/translation.mjs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import {makeProject,listProjects,loadProject,saveProject,addNode,updateText,updateNode,moveNode,trashNode,restoreNode,snapshot,restoreSnapshot,compileProject,search} from '../../packages/core/src/core.mjs';

import {updateSettings,applyTemplate,inspectImport,importText,splitScene,compilation,exportHtml,projectBackup,restoreProjectBackup} from '../../packages/core/src/workspace.mjs';

import {previewReplace,applyReplace} from '../../packages/core/src/editorial.mjs';
import {createEntity,changeCollection,updateScratchpad,captureScratchpad} from '../../packages/core/src/notebook.mjs';

import {exportDocx,exportEpub} from '../../packages/core/src/book-export.mjs';

import {richHash,saveRichDocument,convertToRich,convertToPlain} from '../../packages/core/src/rich-service.mjs';

import {attachmentsHash} from '../../packages/core/src/assets.mjs';
import {previewAttachment,addAttachment} from '../../packages/core/src/attachment-service.mjs';

import {listLibraryProjects,archiveLibraryProject,checkedLibraryProject} from '../../packages/core/src/library-service.mjs';
import {structureHash,moveDocument,restoreStructure,duplicateDocument} from '../../packages/core/src/organization.mjs';

import {projectCatalog} from '../../packages/core/src/project-catalog.mjs';
import {readProfile,saveProfile,profileBackup,readProfileBackup} from '../../packages/core/src/profile.mjs';
import {changeSource,sourceHash} from '../../packages/core/src/research.mjs';

import {backupDestinations,readBackupSettings,saveBackupSettings,readBackupState,saveBackupState,listManagedBackups,createManagedBackup,verifyManagedBackup,isBackupDue} from '../../packages/core/src/backup-center.mjs';

import {createMigrationBackup} from '../../packages/core/src/migration-backup.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url));
const staticFiles=new Map([
 ['/', ['index.html','text/html; charset=utf-8']],
 ['/app.js', ['app.js','application/javascript; charset=utf-8']],
 ['/style.css', ['style.css','text/css; charset=utf-8']],
 ['/themes.css', ['themes.css','text/css; charset=utf-8']],
 ['/themes.js', ['themes.js','application/javascript; charset=utf-8']],
 ['/appearance.js', ['appearance.js','application/javascript; charset=utf-8']],
 ['/editor.bundle.js', ['editor.bundle.js','application/javascript; charset=utf-8']],
 ['/editor-licenses.txt', ['editor-licenses.txt','text/plain; charset=utf-8']]
]);
const actions=new Set(['nodes','text','metadata','move','trash','restore','snapshot','restore-snapshot','settings','inspect-import','import','split','replace-preview','replace-apply','entity','collection','scratchpad','capture','rich-save','rich-enable','rich-disable','attachment-preview','attachment-add','project-archive','project-unarchive','project-duplicate','duplicate-node','organize','undo-organize','source','translation','glossary','extract-attachment','use-extraction','compare-versions','review-propose','review-decide','editorial-tracking','package-preview','package-export','round-preview','round-create','round-offer-preview','round-offer-export','round-return-preview','round-return-export','round-close']);
const MAX_BODY=2_000_000;
class RequestError extends Error {
 constructor(status,message){super(message);this.status=status;}
}
const digest=text=>createHash('sha256').update(text).digest('hex');
function publicProject(project){
 return {...project,round_hashes:Object.fromEntries((project.editorial_rounds||[]).map(r=>[r.id,roundHash(r)])),tracking_hash:trackingHash(project),review_hashes:Object.fromEntries((project.reviews||[]).map(r=>[r.id,reviewHash(r)])),source_hashes:Object.fromEntries(project.nodes.filter(n=>n.source).map(n=>[n.id,sourceHash(n)])),structure_hash:structureHash(project),attachments_hash:attachmentsHash(project),rich_hashes:Object.fromEntries(Object.keys(project.documents).map(id=>[id,richHash(project,id)])),scratchpad_hash:digest(project.scratchpad||''),collections_hash:digest(JSON.stringify(project.collections||[])),document_hashes:Object.fromEntries(Object.entries(project.documents).map(([id,text])=>[id,digest(text)]))};
}
function send(res,status,data,contentType='application/json; charset=utf-8',headers={}){
 res.writeHead(status,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'referrer-policy':'no-referrer',...headers});
 res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));
}
async function body(req,limit=MAX_BODY){
 if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestError(415,'Use conteúdo JSON.');
 const parts=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>limit)throw new RequestError(413,'Requisição grande demais.');parts.push(chunk);}
 let result;try{result=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new RequestError(400,'JSON inválido.');}
 if(!result||typeof result!=='object'||Array.isArray(result))throw new RequestError(400,'Envie um objeto JSON.');
 return result;
}
async function checkProjectFiles(dir){
 try{
  for(const file of [dir,path.join(dir,'project.json')]){
   const info=await lstat(file);
   if(info.isSymbolicLink())throw new RequestError(403,'Links simbólicos de projeto não são permitidos.');
  }
 }catch(error){if(error.code==='ENOENT')throw new RequestError(404,'Projeto não encontrado.');throw error;}
}
function checkBase(project,id,baseHash){
 if(typeof baseHash!=='string'||!/^[a-f0-9]{64}$/.test(baseHash))throw new RequestError(428,'Reabra o documento antes de salvar.');
 if(typeof project.documents[id]!=='string')throw new RequestError(400,'Documento de texto não encontrado.');
 if(digest(project.documents[id])!==baseHash)throw new RequestError(409,'O documento mudou em outra sessão. Seu texto local foi preservado; copie-o antes de reabrir.');
}

// The queue covers load → command → save. It is local to this server instance.
export function createWritingRoomServer({base=path.resolve(process.env.WRITINGROOM_HOME||'./writingroom-projects'),backupBase,backupTargets,backupTickMs=60000}={}){
 if(typeof backupTickMs!=='number'||!Number.isFinite(backupTickMs)||backupTickMs<1000||backupTickMs>3600000)throw new Error('Intervalo interno de backup inválido');
 base=path.resolve(base);
 const migrationBackupRoot=path.resolve(backupBase||process.env.WRITINGROOM_BACKUP_HOME||path.join(path.dirname(base),'writingroom-backups'));
 let configuredTargets=backupTargets;if(configuredTargets===undefined&&process.env.WRITINGROOM_BACKUP_DESTINATIONS){try{configuredTargets=JSON.parse(process.env.WRITINGROOM_BACKUP_DESTINATIONS);}catch{throw new Error('Configuração de destinos inválida');}}
 const destinations=backupDestinations(configuredTargets,path.join(migrationBackupRoot,'managed'));
 const queues=new Map(),packageStaging=createPackageStaging(),roundStaging=createRoundStaging();let packageCryptoBusy=false;
 async function withPackageCrypto(operation){if(packageCryptoBusy)throw new RequestError(429,'Há uma operação de pacote em andamento. Aguarde e tente novamente.');packageCryptoBusy=true;try{return await operation();}finally{packageCryptoBusy=false;}}

 function serial(id,operation){
  const previous=queues.get(id)||Promise.resolve();
  const task=previous.catch(()=>{}).then(operation);
  queues.set(id,task);
  void task.finally(()=>{if(queues.get(id)===task)queues.delete(id);}).catch(()=>{});
  return task;
 }
 function destination(id){const result=destinations.find(d=>d.id===id);if(!result)throw new RequestError(400,'Destino de backup desconhecido.');return result;}
 const backupKey=(target,id)=>target+':'+id;
 async function updateBackupState(state,target,id,result,now){
  const key=backupKey(target,id),previous=state.projects[key]||{};state.projects[key]={...previous,last_attempt:now,...result};
  try{await saveBackupState(base,state);return false;}catch{return true;}
 }
 function checkBackupIds(input){if(typeof input.project_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.project_id)||(input.id!==undefined&&(typeof input.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.id))))throw new RequestError(400,'Identidade de projeto/cópia inválida.');}
 async function createLocalCopy(input){
  checkBackupIds(input);if(input.archived!==undefined&&typeof input.archived!=='boolean')throw new RequestError(400,'Estado do projeto inválido.');
  const {settings}=await readBackupSettings(base,destinations),target=destination(input.destination||settings.destination),state=await readBackupState(base),now=new Date().toISOString();
  try{const result=await serial(input.project_id,async()=>{const {project}=await checkedLibraryProject(base,input.project_id,{archived:input.archived===true});return createManagedBackup(target.root,project,{kind:'manual',retain:settings.retain_automatic});});
   const state_warning=await updateBackupState(state,target.id,input.project_id,{last_success:now,last_error:null,backup_id:result.manifest.id,project_checksum:result.manifest.project_checksum,result:'created'},now);return {...result,destination:target.id,state_warning};
  }catch(error){await updateBackupState(state,target.id,input.project_id,{last_error:'Falha ao criar cópia local. Verifique destino e espaço disponível.',result:'failed'},now);throw error;}
 }
 async function runScheduledBackups(force=false){return serial('$backup-center',async()=>{
  const {settings}=await readBackupSettings(base,destinations);if(!settings.enabled){if(force)throw new RequestError(400,'Ative e salve a rotina antes de executá-la.');return {disabled:true,results:[]};}
  const state=await readBackupState(base),target=destination(settings.destination),nowMs=Date.now(),now=new Date(nowMs).toISOString(),results=[];
  for(const item of await listLibraryProjects(base)){if(item.state!=='ready')continue;const key=backupKey(target.id,item.id),entry=state.projects[key];if(!force&&!isBackupDue(entry,settings,nowMs))continue;
   try{const result=await serial(item.id,async()=>{const {project}=await checkedLibraryProject(base,item.id);const checksum=projectBackup(project).checksum;
     if(entry?.backup_id&&entry.project_checksum===checksum){try{const verified=await verifyManagedBackup(target.root,item.id,entry.backup_id);if(verified.manifest.project_checksum===checksum)return {unchanged:true};}catch{}}
     return createManagedBackup(target.root,project,{kind:'automatic',now,retain:settings.retain_automatic});});
    const state_warning=await updateBackupState(state,target.id,item.id,result.unchanged?{last_error:null,result:'unchanged'}:{last_success:now,last_error:null,backup_id:result.manifest.id,project_checksum:result.manifest.project_checksum,result:'created'},now);
    results.push({project_id:item.id,unchanged:!!result.unchanged,backup_id:result.manifest?.id,retention_warning:result.retention_warning||false,state_warning});
   }catch{await updateBackupState(state,target.id,item.id,{last_error:'Falha na cópia automática. Verifique o destino e preserve os arquivos.',result:'failed'},now);results.push({project_id:item.id,failed:true});}
  }return {results};
 });}
 const server=http.createServer(async(req,res)=>{
  try{
   const port=server.address()?.port;
   const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
   if(!hosts.has(req.headers.host))throw new RequestError(403,'Host não permitido.');
   if(req.headers['sec-fetch-site']==='cross-site')throw new RequestError(403,'Requisição externa não permitida.');
   // Validate the exact origin, including scheme and absence of path/userinfo.
   if(req.headers.origin&&!new Set([...hosts].map(host=>'http://'+host)).has(req.headers.origin))throw new RequestError(403,'Origem não permitida.');
   const url=new URL(req.url,`http://127.0.0.1:${port}`);
   if(!url.pathname.startsWith('/api/')){
    const file=staticFiles.get(url.pathname);
    if(!file)throw new RequestError(404,'Página não encontrada.');
    if(req.method!=='GET')throw new RequestError(405,'Método inválido.');
    return send(res,200,await readFile(path.join(directory,file[0]),'utf8'),file[1]);
   }
   if(!['GET','POST'].includes(req.method))throw new RequestError(405,'Método inválido.');
   if(url.pathname==='/api/status'&&req.method==='GET')return send(res,200,{interface:'studio-19',version:'0.1.0-alpha.20',storage:'json',project_schemas:[1,2,3,4,5,6,7]});
   if(url.pathname==='/api/language/lexicon'){try{if(req.method==='GET')return send(res,200,await readLexicon(base));const input=await body(req,11000000);if(input.operation==='lookup')return send(res,200,await lookupLexicon(base,input.term,input.language));if(input.operation!=='import'||input.confirm!==true)throw new Error('Confirme a substituição da base');return send(res,200,await serial('$lexicon',()=>saveLexicon(base,input.data)));}catch{throw new RequestError(400,'Base lexical inválida ou indisponível; confira formato, origem, licença e limites.');}}
   if(url.pathname==='/api/language/status'&&req.method==='GET'){const config=translatorConfig();return send(res,200,{translator:config?{label:config.label,origin:new URL(config.url).origin}:null});}
   if(url.pathname==='/api/language/synonyms'&&req.method==='POST'){try{const input=await body(req,4000);return send(res,200,await localSynonyms(input.term,input.language));}catch{throw new RequestError(400,'Consulta de idioma inválida');}}
   if(url.pathname==='/api/language/translate'&&req.method==='POST'){try{return send(res,200,await machineTranslation(await body(req,50000),translatorConfig()));}catch{throw new RequestError(400,'Tradução não disponível. Confira configuração, idiomas, consentimento e limites.');}}
   if(url.pathname==='/api/identities'&&req.method==='GET')return send(res,200,await serial('$identities',async()=>identityPublicState((await readIdentityState(base)).state)));
   if(url.pathname.startsWith('/api/identities/')){
    if(req.method!=='POST')throw new RequestError(405,'Use POST para gerenciar identidades.');const operation=url.pathname.slice('/api/identities/'.length);if(!['create','restore','backup','trust-preview','trust','revoke'].includes(operation))throw new RequestError(404,'Ação inexistente.');const input=await body(req,20000);
    try{let result;
     if(operation==='trust-preview')result=previewTrustedCard(input.file);
     else if(['create','restore'].includes(operation))result=await withPackageCrypto(()=>serial('$identities',()=>addLocalIdentity(base,input,{restore:operation==='restore'})));
     else result=await serial('$identities',async()=>{if(operation==='trust')return trustIdentity(base,input);if(operation==='revoke')return revokeIdentity(base,input);return localIdentity((await readIdentityState(base)).state,input.fingerprint);});
     return send(res,200,result);
    }catch(error){if(error.code==='CONFLICT')throw new RequestError(409,error.message);if(error.code==='VALIDATION')throw new RequestError(400,error.message);throw error;}
   }
   if(url.pathname.startsWith('/api/round-packages/')){
    if(req.method!=='POST')throw new RequestError(405,'Use POST para rodadas.');const operation=url.pathname.slice('/api/round-packages/'.length);if(!['open','confirm','cancel'].includes(operation))throw new RequestError(404,'Ação inexistente.');
    try{
     if(operation==='open')return send(res,200,await withPackageCrypto(async()=>{const input=await body(req,12000000),state=await serial('$identities',async()=>(await readIdentityState(base)).state),opened=await openRoundPackage(input.file,input.passphrase,input.recipient,state);let preview=null;if(opened.payload.kind==='return'){if(typeof input.project_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.project_id))throw new RequestError(400,'Escolha explicitamente a obra original.');preview=await serial(input.project_id,async()=>previewRoundReturn((await checkedLibraryProject(base,input.project_id)).project,opened.payload,state));}const token=roundStaging.add({...opened,project_id:opened.payload.kind==='return'?input.project_id:null});return {token,...opened,preview};}));
     const input=await body(req,1000);if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))throw new RequestError(400,'Prévia inválida.');if(operation==='cancel'){roundStaging.cancel(input.token);return send(res,200,{ok:true});}if(input.confirm!==true)throw new RequestError(400,'Confirme a importação da rodada.');
     const result=await serial('$round-stage-'+input.token,async()=>{const stage=roundStaging.get(input.token);const commit=()=>serial('$identities',async()=>{const state=(await readIdentityState(base)).state;recheckPackageIdentityPolicy(state,stage.verification);roundStaging.get(input.token);if(stage.payload.kind==='offer'){if(stage.result)return stage.result;const project=projectFromRoundOffer(stage.payload);await saveProject(path.join(base,project.id+'.wroom'),project);stage.result={id:project.id,kind:'offer'};return stage.result;}
      const {project,dir}=await checkedLibraryProject(base,stage.project_id),preview=previewRoundReturn(project,stage.payload,state);if(preview.conflicts)throw new RequestError(409,'A base da rodada mudou. Nenhuma proposta foi importada.');const source=structuredClone(project),result=importRoundReturn(project,stage.payload,state);if(!result.unchanged){const {settings}=await readBackupSettings(base,destinations),target=destination(settings.destination),checkpoint=await createManagedBackup(target.root,source,{kind:'manual'});result.checkpoint_id=checkpoint.manifest.id;roundStaging.get(input.token);if(JSON.stringify((await checkedLibraryProject(base,stage.project_id)).project)!==JSON.stringify(source))throw new RequestError(409,'A obra mudou durante o backup. Nenhuma importação foi confirmada.');await saveProject(dir,project);}stage.result={id:project.id,kind:'return',...result};return stage.result;});return stage.project_id?serial(stage.project_id,commit):commit();});return send(res,200,result);
    }catch(error){if(error instanceof RequestError)throw error;if(error.code==='CONFLICT')throw new RequestError(409,error.message);if(error.code==='VALIDATION')throw new RequestError(400,error.message);throw error;}
   }
   if(url.pathname.startsWith('/api/packages/')){
    if(req.method!=='POST')throw new RequestError(405,'Use POST para abrir pacotes.');
    const operation=url.pathname.slice('/api/packages/'.length);if(!['open','confirm','cancel'].includes(operation))throw new RequestError(404,'Ação inexistente.');
    try{
     if(operation==='open')return send(res,200,await withPackageCrypto(async()=>{const input=await body(req,12000000);if(input.require_signature!==undefined&&typeof input.require_signature!=='boolean')throw new RequestError(400,'Preferência de assinatura inválida.');return serial('$identities',async()=>{const state=(await readIdentityState(base)).state,result=await openEditorialPackage(input.file,input.passphrase,input.recipient,state,{requireSignature:input.require_signature===true}),token=packageStaging.add(result.content);packageStaging.get(token).identity_policy=result.verification;return {token,...result};});}));
     const input=await body(req,1000);if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))throw new RequestError(400,'Prévia inválida.');
     if(operation==='cancel'){packageStaging.cancel(input.token);return send(res,200,{ok:true});}
     if(input.confirm!==true)throw new RequestError(400,'Confirme a criação da cópia local.');
     const result=await serial('$package-'+input.token,()=>serial('$identities',async()=>{recheckPackageIdentityPolicy((await readIdentityState(base)).state,packageStaging.get(input.token).identity_policy);return packageStaging.commit(input.token,p=>saveProject(path.join(base,p.id+'.wroom'),p));}));return send(res,201,result);
    }catch(error){if(error.code==='VALIDATION')throw new RequestError(400,error.message);throw error;}
   }
   if(url.pathname==='/api/catalog' &&req.method==='GET')return send(res,200,projectCatalog);
   if(url.pathname==='/api/profile-preview'&&req.method==='POST'){try{return send(res,200,profileBackup((await body(req,32000)).profile));}catch(error){if(error.code==='VALIDATION')throw new RequestError(400,error.message);throw error;}}
   if(url.pathname==='/api/profile'){
    if(req.method==='GET')return send(res,200,await serial('author-profile',()=>readProfile(base)));
    const input=await body(req,32000);try{const data=await serial('author-profile',()=>saveProfile(base,input.backup?readProfileBackup(input.backup):input.profile,input.base_hash));return send(res,200,data);}catch(error){if(error.code==='CONFLICT')throw new RequestError(409,error.message);if(error.code==='VALIDATION')throw new RequestError(400,error.message);throw error;}
   }
   if(url.pathname.startsWith('/api/backup-center')){
    const operation=url.pathname.slice('/api/backup-center'.length);
    if(req.method==='GET'&&operation===''){
     const projectFilter=url.searchParams.get('project_id')||undefined;if(projectFilter)checkBackupIds({project_id:projectFilter});
     const data=await serial('$backup-center',async()=>{const config=await readBackupSettings(base,destinations),state=await readBackupState(base),history=[];let truncated=false;
      for(const target of destinations){try{const listed=await listManagedBackups(target.root,{projectId:projectFilter});history.push(...listed.items.map(m=>({...m,destination:target.id})));truncated||=listed.truncated;}catch{history.push({destination:target.id,state:'destination-unavailable',project_name:'Destino indisponível'});}}
      history.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));return {...config,state,destinations,history:history.slice(0,200),truncated:truncated||history.length>200,projects:[...(await listLibraryProjects(base)),...(await listLibraryProjects(base,{archived:true}))]};});return send(res,200,data);
    }
    if(req.method==='GET'&&operation==='/download'){
     checkBackupIds({project_id:url.searchParams.get('project_id'),id:url.searchParams.get('id')});const target=destination(url.searchParams.get('destination')),verified=await serial('$backup-center',()=>verifyManagedBackup(target.root,url.searchParams.get('project_id'),url.searchParams.get('id')));return send(res,200,verified.bytes,'application/json; charset=utf-8',{'content-disposition':'attachment; filename="writingroom-backup.json"'});
    }
    if(req.method!=='POST')throw new RequestError(405,'Método inválido.');const input=await body(req,32000);
    try{
     if(operation==='/settings')return send(res,200,await serial('$backup-center',()=>saveBackupSettings(base,destinations,input.settings,input.base_hash)));
     if(operation==='/create')return send(res,200,await serial('$backup-center',()=>createLocalCopy(input)));
     if(operation==='/run')return send(res,200,await runScheduledBackups(true));
     if(operation==='/verify'||operation==='/restore'){
      checkBackupIds(input);if(!input.id)throw new RequestError(400,'Selecione uma cópia.');
      const target=destination(input.destination),result=await serial('$backup-center',async()=>{const verified=await verifyManagedBackup(target.root,input.project_id,input.id);if(operation==='/verify')return {verified:true,manifest:verified.manifest};return publicProject(await restoreProjectBackup(base,verified.bundle));});return send(res,200,result);
     }
     throw new RequestError(404,'Ação de backup inexistente.');
    }catch(error){if(error.code==='CONFLICT')throw new RequestError(409,error.message);if(error.code==='VALIDATION')throw new RequestError(400,error.message);throw error;}
   }
   if(url.pathname==='/api/restore'&&req.method==='POST'){
    const input=await body(req,33000000);let project;
    try{project=await restoreProjectBackup(base,input.backup);}catch(error){if(error.code)throw error;throw new RequestError(400,'Backup inválido ou checksum incompatível.');}
    return send(res,201,publicProject(project));
   }
   if(url.pathname==='/api/editorial'&&req.method==='GET'){
    const entries=[];for(const item of await listLibraryProjects(base)){if(item.state!=='ready'){entries.push(item);continue;}try{entries.push(await serial(item.id,async()=>editorialSummary((await checkedLibraryProject(base,item.id)).project)));}catch{entries.push({...item,state:'unavailable'});}}return send(res,200,entries);
   }
   if(url.pathname==='/api/projects'){
    if(req.method==='GET')return send(res,200,await listLibraryProjects(base,{archived:url.searchParams.get('archived')==='1'}));
    const input=await body(req);
    const name=input.name??'Novo livro';
    if(typeof name!=='string'||!name.trim())throw new RequestError(400,'Nome do projeto obrigatório.');
    if(!projectCatalog.some(t=>t.id===(input.template??'blank'))||!['general','historical'].includes(input.preset??'general'))throw new RequestError(400,'Modelo inválido.');
    const project=makeProject(name);applyTemplate(project,input.template??'blank',{preset:input.preset??'general'});if(input.author!==undefined){if(typeof input.author!=='string'||input.author.length>300)throw new RequestError(400,'Autoria inválida');updateSettings(project,{author:input.author});}
    await saveProject(path.join(base,project.id+'.wroom'),project);
    return send(res,201,publicProject(project));
   }
   const match=url.pathname.match(/^\/api\/projects\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/([a-z-]+))?$/);
   if(!match)throw new RequestError(404,'Endpoint inexistente.');
   const [,id,action='']=match,dir=path.join(base,id+'.wroom');
   if(req.method==='GET'&&!['','search','export','compile','backup','asset','bilingual','package-candidates'].includes(action))throw new RequestError(405,'Método inválido.');
   if(req.method==='POST'&&!actions.has(action))throw new RequestError(404,'Ação inexistente.');
   const input=req.method==='POST'?await body(req,['attachment-preview','attachment-add'].includes(action)?12000000:['import','inspect-import'].includes(action)?10000000:action==='rich-save'?3000000:MAX_BODY):null;
   const response=await serial(id,async()=>{
    if(['project-archive','project-unarchive'].includes(action)){try{return {data:await archiveLibraryProject(base,id,action==='project-unarchive')};}catch(error){if(error.code==='ENOENT')throw new RequestError(404,'Projeto não encontrado.');if(error.code)throw error;throw new RequestError(400,'Não foi possível mover o projeto. Confira o estado e preserve seus arquivos.');}}
    await checkProjectFiles(dir);
    let project;
    try{project=await loadProject(dir);}catch(error){
     if(error.code&&error.code!=='ENOENT')throw error;
     throw new RequestError(422,'Não foi possível abrir este projeto. Os arquivos foram preservados.');
    }
    if(project.id!==id)throw new RequestError(422,'Identidade do projeto incompatível com a pasta.');
    const migrationSource=((project.schema_version<7&&action==='round-create')||(project.schema_version<6&&action==='editorial-tracking')||(project.schema_version<5&&action==='review-propose')||(project.schema_version===1&&['rich-enable','rich-save'].includes(action))||(project.schema_version<3&&action==='attachment-add')||(project.schema_version<4&&['source','translation','glossary','use-extraction'].includes(action)))?structuredClone(project):null;
    if(req.method==='GET'){
     if(action==='package-candidates')return {data:packageCandidates(project)};
     if(action==='asset'){
      const asset=project.attachments?.find(a=>a.id===url.searchParams.get('id'));let visible=!!asset,current=asset&&project.nodes.find(n=>n.id===asset.node_id);
      while(current){if(current.deleted||current.id===project.roots.trash)visible=false;current=project.nodes.find(n=>n.id===current.parent_id);}
      if(!visible)throw new RequestError(404,'Anexo indisponível; confira a lixeira.');
      const inline=url.searchParams.get('preview')==='1'&&asset.mime.startsWith('image/'),filename=encodeURIComponent(asset.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
      return {data:Buffer.from(asset.data_base64,'base64'),type:asset.mime,headers:{'content-disposition':(inline?'inline':'attachment')+"; filename*=UTF-8''"+filename}};
     }
    if(action==='bilingual')return {data:bilingualReview(project),type:'text/plain; charset=utf-8'};
     if(action==='compile')return {data:compilation(project)};
     if(action==='backup')return {data:projectBackup(project)};
     if(action==='search')return {data:search(project,url.searchParams.get('q')||'')};
     if(action==='export'){
      const format=url.searchParams.get('format')||'md';
      if(!['md','txt','html','docx','epub'].includes(format))throw new RequestError(400,'Formato não suportado.');
      if(format==='docx'||format==='epub'){
       try{return {data:format==='docx'?exportDocx(project):exportEpub(project),type:format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/epub+zip'};}
       catch{throw new RequestError(400,'Não foi possível exportar: confira cenas incluídas, caracteres XML e limites do arquivo.');}
      }
      return {data:format==='html'?exportHtml(project):compileProject(project,format),type:'text/plain; charset=utf-8'};
     }
     return {data:publicProject(project)};
    }
    if(action==='project-duplicate'){try{const copy=await restoreProjectBackup(base,projectBackup(project),{name:input.name??project.name+' (cópia)'});return {data:publicProject(copy)};}catch(error){if(error.code)throw error;throw new RequestError(400,'Não foi possível duplicar este projeto.');}}
    if(action==='attachment-add'&&attachmentsHash(project)!==input.base_hash)throw new RequestError(409,'Os anexos mudaram. Reabra o projeto antes de importar.');
    if(action==='text'&&project.rich_documents?.[input.id])throw new RequestError(409,'Esta cena usa o editor visual. Preserve sua edição e reabra o projeto.');
    if(['rich-save','rich-enable','rich-disable'].includes(action)&&richHash(project,input.id)!==input.base_rich_hash)throw new RequestError(409,'A cena ou sua formatação mudou. Preserve a edição local e reabra o projeto.');
    if(action==='snapshot'&&input.base_rich_hash&&richHash(project,input.id)!==input.base_rich_hash)throw new RequestError(409,'A formatação mudou; reabra antes de salvar uma versão.');
    if(action==='text'||action==='snapshot'||action==='split')checkBase(project,input.id,input.base_hash);
    if(action==='restore-snapshot'){
     const version=project.snapshots.find(s=>s.id===input.id);
     if(!version)throw new RequestError(400,'Versão não encontrada.');
     checkBase(project,version.node_id,input.base_hash);
     if(project.rich_documents?.[version.node_id]&&richHash(project,version.node_id)!==input.base_rich_hash)throw new RequestError(409,'A formatação mudou; reabra antes de restaurar.');
    }
    if(['scratchpad','capture'].includes(action)&&digest(project.scratchpad||'')!==input.base_hash)throw new RequestError(409,'O caderno mudou. Preserve sua captura e reabra o projeto.');
    if(action==='collection'&&digest(JSON.stringify(project.collections||[]))!==input.base_hash)throw new RequestError(409,'As coleções mudaram. Reabra o projeto antes de alterar.');
    const priorTranslationSources=translationSourceState(project);
    let result={ok:true};
    try{
     if(action.startsWith('round-')){
      if(action==='round-close'){closeEditorialRound(project,input);}
      else {const operation=()=>serial('$identities',async()=>{const state=(await readIdentityState(base)).state;if(action==='round-preview')return previewRoundCreation(project,input,state);if(action==='round-create'){const payload=createEditorialRound(project,input,state);return {package:await sealRoundPayload(payload,input,state),round_id:payload.round_id};}const kind=action.startsWith('round-offer')?'offer':'return';return action.endsWith('-preview')?previewRoundTransfer(project,input,state,{kind}):exportRoundTransfer(project,input,state,{kind});});const result=action.endsWith('-preview')||action==='round-preview'?await operation():await withPackageCrypto(operation);if(action==='round-create'){if(migrationSource){const raw=await readFile(path.join(dir,'project.json'));if(JSON.stringify(JSON.parse(raw))!==JSON.stringify(migrationSource))throw new RequestError(409,'O projeto mudou durante a conversão.');result.migration_backup=await createMigrationBackup(migrationBackupRoot,raw,{targetSchema:7});}await saveProject(dir,project);}return {data:result};}
     }
     if(['package-preview','package-export'].includes(action)){if(input.signature_mode!==undefined&&!['unsigned','signed'].includes(input.signature_mode))throw new RequestError(400,'Modo de assinatura inválido.');if(input.signature_mode==='signed'){const operation=()=>serial('$identities',async()=>{const state=(await readIdentityState(base)).state;return action==='package-preview'?previewSignedEditorialPackage(project,input,state):encryptSignedEditorialPackage(project,input,state);});return {data:action==='package-preview'?await operation():await withPackageCrypto(operation)};}return {data:action==='package-preview'?previewEditorialPackage(project,input):await withPackageCrypto(()=>encryptEditorialPackage(project,input))};}
     if(action==='compare-versions')return {data:compareVersions(project,input)};
     if(action==='extract-attachment')return {data:await extractAttachment(project,input.asset_id)};
     if(action==='attachment-preview')return {data:previewAttachment(project,input)};
     if(action==='replace-preview')return {data:previewReplace(project,input)};
     if(action==='inspect-import')return {data:inspectImport(input)};
     switch(action){
      case 'review-propose':result=proposeReview(project,input);break;
      case 'review-decide':result=decideReview(project,input);break;
      case 'use-extraction':result=useExtractedText(project,input);break;
      case 'translation':result=createTranslation(project,input);break;
      case 'glossary':result=createGlossaryEntry(project,input);break;
      case 'source':result=changeSource(project,input);break;
      case 'organize':result=moveDocument(project,input);break;
      case 'undo-organize':result=restoreStructure(project,input);break;
      case 'duplicate-node':result=duplicateDocument(project,input.id);break;
      case 'attachment-add':result=addAttachment(project,input);break;
      case 'rich-save':result=saveRichDocument(project,input.id,input.rich_document);result.hash=digest(result.text);break;
      case 'rich-enable':result=convertToRich(project,input.id);result.hash=digest(result.text);break;
      case 'rich-disable':result=convertToPlain(project,input.id);result.hash=digest(project.documents[input.id]);break;
      case 'replace-apply':result=applyReplace(project,input);break;
      case 'entity':result={id:createEntity(project,input)};break;
      case 'collection':result={id:changeCollection(project,input)};break;
      case 'scratchpad':updateScratchpad(project,input.text);result={hash:digest(project.scratchpad)};break;
      case 'capture':result={id:captureScratchpad(project,input)};break;
      case 'editorial-tracking':updateTracking(project,input);break;
      case 'settings':updateSettings(project,input.patch);break;
      case 'import':result=importText(project,input.parent_id,input);break;
      case 'split':result={id:splitScene(project,input.id,input.offset,input.title)};break;
      case 'nodes':result={id:addNode(project,input.parent_id,input.title,input.kind??'text')};break;
      case 'text':result={hash:updateText(project,input.id,input.text)};result.rich_hash=richHash(project,input.id);break;
      case 'metadata':updateNode(project,input.id,input.patch);break;
      case 'move':moveNode(project,input.id,input.parent_id,input.index);break;
      case 'trash':trashNode(project,input.id);break;
      case 'restore':restoreNode(project,input.id);break;
      case 'snapshot':result={id:snapshot(project,input.id,input.label??'Snapshot')};break;
      case 'restore-snapshot':restoreSnapshot(project,input.id);break;
     }
    }catch(error){if(error instanceof RequestError)throw error;if(error.code==='VALIDATION'&&(['package-preview','package-export'].includes(action)||action.startsWith('round-')))throw new RequestError(400,error.message);if(error.code==='CONFLICT')throw new RequestError(409,error.message);throw new RequestError(400,'Operação inválida. Confira o documento, o destino e os valores informados.');}
    const reviewStates=invalidateTranslationReviews(project,priorTranslationSources);if(reviewStates.length)result.translation_review_states=reviewStates;
    if(migrationSource&&project.schema_version>migrationSource.schema_version){
     const raw=await readFile(path.join(dir,'project.json'));
     if(JSON.stringify(JSON.parse(raw))!==JSON.stringify(migrationSource))throw new RequestError(409,'O projeto mudou durante a conversão; nenhuma gravação foi confirmada.');
     result.migration_backup=await createMigrationBackup(migrationBackupRoot,raw,{targetSchema:project.schema_version});
    }
    await saveProject(dir,project);
    return {data:result};
   });
   return send(res,200,response.data,response.type,response.headers);
  }catch(error){
   if(!res.destroyed&&!res.headersSent)send(res,error instanceof RequestError?error.status:500,{error:error instanceof RequestError?error.message:'Falha no armazenamento local. Os dados não foram confirmados; mantenha seu texto disponível.'});
  }
 });
 let backupTimer;server.on('listening',()=>{backupTimer=setInterval(()=>{packageStaging.prune();roundStaging.prune();void runScheduledBackups().catch(()=>{});},Math.max(1000,backupTickMs));backupTimer.unref();void runScheduledBackups().catch(()=>{});});server.on('close',()=>{clearInterval(backupTimer);packageStaging.clear();roundStaging.clear();});
 server.requestTimeout=15_000;
 server.headersTimeout=10_000;
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createWritingRoomServer();
 server.on('error',()=>{console.error('Não foi possível iniciar o servidor local. Verifique a porta e as permissões.');process.exitCode=1;});
 server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Writingroom Alpha: http://127.0.0.1:${server.address().port}`));
}
