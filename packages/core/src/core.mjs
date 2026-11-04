import {validateRounds} from './round-schema.mjs';
import {validateTracking} from './editorial-tracking.mjs';
import {validateReviews} from './review-schema.mjs';
import {randomUUID, createHash} from 'node:crypto';
import {mkdir, readFile, readdir, rename, rm, open, lstat} from 'node:fs/promises';
import path from 'node:path';

import {normalizeSource} from './research-schema.mjs';
import {projectTypes} from './project-catalog.mjs';
import {validateAttachments} from './assets.mjs';

import {normalizeRichDocument,richText,richMarkdown,richPublishedText} from '../../editor/src/schema.mjs';

const CURRENT_SCHEMA=7;
export const kinds=['folder','text','research'];
const now=()=>new Date().toISOString();
const hash=s=>createHash('sha256').update(s).digest('hex');
const ensureId=id=>{if(!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ID inválido');};
export function makeProject(name='Novo livro') {
  if (typeof name!=='string' || !name.trim()) throw new Error('Nome obrigatório');
  const projectId=randomUUID(), draft=randomUUID(), research=randomUUID(), trash=randomUUID();
  const ts=now();
  return {schema_version:1,id:projectId,name:name.trim(),created_at:ts,updated_at:ts,roots:{draft,research,trash},nodes:[
    {id:draft,parent_id:null,kind:'folder',title:'Manuscrito',synopsis:'',status:'todo',include_in_compile:true,sort_key:0,deleted:false},
    {id:research,parent_id:null,kind:'folder',title:'Pesquisa',synopsis:'',status:'todo',include_in_compile:false,sort_key:1,deleted:false},
    {id:trash,parent_id:null,kind:'folder',title:'Lixeira',synopsis:'',status:'todo',include_in_compile:false,sort_key:2,deleted:false}
  ],documents:{},snapshots:[]};
}
function children(project,pid){return project.nodes.filter(n=>n.parent_id===pid).sort((a,b)=>a.sort_key-b.sort_key);}
function node(project,id){const n=project.nodes.find(n=>n.id===id);if(!n)throw new Error('Documento não encontrado');return n;}
function descendants(project,id){const result=[];for(const c of children(project,id)){result.push(c.id,...descendants(project,c.id));}return result;}
function inTrash(project,id){
 let current=node(project,id);
 while(current){if(current.id===project.roots.trash)return true;current=current.parent_id===null?null:node(project,current.parent_id);}
 return false;
}
export function validate(project){
  if(![1,2,3,4,5,6,CURRENT_SCHEMA].includes(project.schema_version))throw new Error('Versão do projeto incompatível');
  ensureId(project.id);
  if(typeof project.documents!=='object'||Array.isArray(project.documents))throw new Error('Documentos inválidos');
  for(const field of ['created_at','updated_at'])if(typeof project[field]!=='string'||!Number.isFinite(Date.parse(project[field])))throw new Error('Data inválida');
  if(typeof project.name!=='string'||!project.name.trim()||!Array.isArray(project.nodes)||!project.documents||!Array.isArray(project.snapshots))throw new Error('Projeto inválido');
  const roots=['draft','research','trash'].map(key=>project.roots?.[key]);
  if(roots.some(id=>typeof id!=='string')||new Set(roots).size!==3)throw new Error('Raízes inválidas');
  const ids=new Set();for(const n of project.nodes){ensureId(n.id);if(typeof n.title!=='string'||!n.title.trim()||typeof n.synopsis!=='string'||typeof n.status!=='string'||typeof n.include_in_compile!=='boolean'||!Number.isSafeInteger(n.sort_key)||n.sort_key<0||typeof n.deleted!=='boolean')throw new Error('Nó inválido');if(n.parent_id===null&&!roots.includes(n.id))throw new Error('Raiz desconhecida');if(ids.has(n.id))throw new Error('ID duplicado');ids.add(n.id);if(!kinds.includes(n.kind))throw new Error('Tipo inválido');}
  for(const n of project.nodes){
   for(const key of ['notes','label'])if(Object.hasOwn(n,key)&&typeof n[key]!=='string')throw new Error('Metadado inválido');
   if(Object.hasOwn(n,'label')&&!['','sage','amber','rose','blue','violet'].includes(n.label))throw new Error('Etiqueta inválida');
   if(Object.hasOwn(n,'keywords')&&(!Array.isArray(n.keywords)||n.keywords.length>50||n.keywords.some(tag=>typeof tag!=='string'||tag.length>100)))throw new Error('Palavras-chave inválidas');
   if(Object.hasOwn(n,'target_words')&&(!Number.isSafeInteger(n.target_words)||n.target_words<0||n.target_words>100000000))throw new Error('Meta inválida');
  }
  if(Object.hasOwn(project,'rich_documents')){
   if(!project.rich_documents||typeof project.rich_documents!=='object'||Array.isArray(project.rich_documents))throw new Error('Documentos visuais inválidos');
   for(const [id,value] of Object.entries(project.rich_documents)){if(!ids.has(id)||node(project,id).kind!=='text'||richText(value)!==project.documents[id])throw new Error('Projeção visual incompatível');normalizeRichDocument(value);}
  }
  for(const n of project.nodes)if(n.source!==undefined){if(project.schema_version<4||n.kind!=='text'||n.include_in_compile)throw new Error('Fonte exige formato 4 e fica fora da publicação');normalizeSource(n.source,project,n.id);}
  if(Object.hasOwn(project,'scratchpad')&&(typeof project.scratchpad!=='string'||Buffer.byteLength(project.scratchpad,'utf8')>1500000))throw new Error('Captura inválida');
  if(Object.hasOwn(project,'collections')){
   if(!Array.isArray(project.collections)||project.collections.length>100)throw new Error('Coleções inválidas');
   const collectionIds=new Set();for(const c of project.collections){
    if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||!['manual','query'].includes(c.type)||!Array.isArray(c.node_ids)||c.node_ids.length>2000||new Set(c.node_ids).size!==c.node_ids.length||c.node_ids.some(id=>!ids.has(id)||roots.includes(id))||typeof c.query!=='string'||c.query.length>300||typeof c.status!=='string'||c.status.length>100)throw new Error('Coleção inválida');
    ensureId(c.id);if(collectionIds.has(c.id))throw new Error('Coleção duplicada');collectionIds.add(c.id);
   }
  }
  for(const n of project.nodes)if(Object.hasOwn(n,'entity_type')&&!['character','location','object','organization','event','concept'].includes(n.entity_type))throw new Error('Tipo de ficha inválido');
  if(Object.hasOwn(project,'settings')){
   const settings=project.settings;if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error('Configurações inválidas');
   if(Object.hasOwn(settings,'project_type')&&!projectTypes.has(settings.project_type))throw new Error('Tipo de projeto inválido');
   if(Object.hasOwn(settings,'template_version')&&settings.template_version!==1)throw new Error('Versão de modelo inválida');
   if(Object.hasOwn(settings,'research_preset')&&!['general','historical'].includes(settings.research_preset))throw new Error('Preset inválido');
   for(const key of ['author','description','language'])if(Object.hasOwn(settings,key)&&typeof settings[key]!=='string')throw new Error('Configuração inválida');
   if(Object.hasOwn(settings,'language')&&!['pt-BR','en-US','none'].includes(settings.language))throw new Error('Idioma inválido');
   if(Object.hasOwn(settings,'target_words')&&(!Number.isSafeInteger(settings.target_words)||settings.target_words<0||settings.target_words>100000000))throw new Error('Meta inválida');
  }
  for(const version of project.snapshots){if(!version||typeof version.content!=='string'||typeof version.label!=='string'||!ids.has(version.node_id)||typeof version.created_at!=='string'||!Number.isFinite(Date.parse(version.created_at)))throw new Error('Snapshot inválido');ensureId(version.id);if(version.rich_document&&richText(version.rich_document)!==version.content)throw new Error('Snapshot visual incompatível');}
  for(const n of project.nodes){if(n.parent_id!==null && !ids.has(n.parent_id))throw new Error('Referência de pai inexistente');const seen=new Set([n.id]);let p=n.parent_id;while(p!==null){if(seen.has(p))throw new Error('Ciclo na árvore');seen.add(p);p=node(project,p).parent_id;}}
  for(const n of project.nodes){
   if(n.parent_id!==null&&node(project,n.parent_id).kind!=='folder')throw new Error('Pai deve ser pasta');
   if(n.kind==='text'&&typeof project.documents[n.id]!=='string')throw new Error('Texto inválido');
  }
  for(const id of Object.keys(project.documents)){if(!ids.has(id))throw new Error('Texto órfão');if(node(project,id).kind!=='text'||typeof project.documents[id]!=='string')throw new Error('Texto inválido');} 
  for(const root of Object.values(project.roots)){const n=node(project,root);if(n.parent_id!==null||n.kind!=='folder'||n.deleted)throw new Error('Raiz inválida');}
  validateAttachments(project);validateReviews(project);validateTracking(project);validateRounds(project);
  return true;
}
export function addNode(project,parent_id,title='Nova cena',kind='text'){
  validate(project);
  if(!kinds.includes(kind)) throw new Error('Tipo inválido');
  if(typeof title!=='string'||!title.trim())throw new Error('Título obrigatório');
  const parent=node(project,parent_id);
  if(parent.kind!=='folder')throw new Error('O destino deve ser uma pasta');
  if(inTrash(project,parent_id))throw new Error('Destino está na lixeira');
  const id=randomUUID();project.nodes.push({id,parent_id,kind,title:title.trim(),synopsis:'',status:'todo',include_in_compile:parent.include_in_compile,sort_key:children(project,parent_id).length,deleted:false});
  if(kind==='text')project.documents[id]='';project.updated_at=now();validate(project);return id;
}
export function updateText(project,id,text){validate(project);const n=node(project,id);if(n.kind!=='text')throw new Error('Apenas cenas aceitam conteúdo');if(typeof text!=='string')throw new Error('Texto inválido');if(project.rich_documents?.[id]&&text!==project.documents[id])throw new Error('Documento visual exige comando estruturado');project.documents[id]=text;project.updated_at=now();return hash(text);}
export function updateNode(project,id,patch){
 validate(project);const n=node(project,id),changes={};
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('Metadado inválido');
 for(const key of ['title','synopsis','status','include_in_compile','notes','label','keywords','target_words','entity_type'])if(Object.hasOwn(patch,key)){
  if(key==='target_words'){if(!Number.isSafeInteger(patch[key])||patch[key]<0||patch[key]>100000000)throw new Error('Meta inválida');}
  else if(key==='keywords'){if(!Array.isArray(patch[key])||patch[key].length>50||patch[key].some(tag=>typeof tag!=='string'||tag.length>100))throw new Error('Palavras-chave inválidas');}
  else if(typeof patch[key]!== (key==='include_in_compile'?'boolean':'string'))throw new Error('Metadado inválido');
  if(key==='entity_type'&&!['character','location','object','organization','event','concept'].includes(patch[key]))throw new Error('Tipo de ficha inválido');
  if(key==='label'&&!['','sage','amber','rose','blue','violet'].includes(patch[key]))throw new Error('Etiqueta inválida');
  changes[key]=patch[key];
 }
 if(changes.include_in_compile&&(n.source||project.attachments?.some(a=>a.node_id===id)))throw new Error('Anexos não entram na publicação');
 if(Object.hasOwn(changes,'title')&&!changes.title.trim())throw new Error('Título obrigatório');
 Object.assign(n,changes);project.updated_at=now();
}
export function moveNode(project,id,parentId,index=Number.MAX_SAFE_INTEGER){
 validate(project);
 if(!Number.isSafeInteger(index)||index<0)throw new Error('Posição inválida');
 const n=node(project,id),parent=node(project,parentId);if(Object.values(project.roots).includes(id))throw new Error('Raiz protegida');
 if(parent.kind!=='folder')throw new Error('Destino deve ser pasta');
 if(id===parentId||descendants(project,id).includes(parentId))throw new Error('Movimento circular');
 const subtree=[id,...descendants(project,id)],deleted=inTrash(project,parentId);
 const oldParent=n.parent_id;n.parent_id=parentId;
 for(const pid of new Set([oldParent,parentId])){const list=children(project,pid).filter(x=>x.id!==id);if(pid===parentId)list.splice(Math.max(0,Math.min(index,list.length)),0,n);list.forEach((x,i)=>x.sort_key=i);}
 for(const childId of subtree)node(project,childId).deleted=deleted;project.updated_at=now();validate(project);
}
export function trashNode(project,id){
 validate(project);const n=node(project,id);
 if(inTrash(project,id))throw new Error('Já está na lixeira');
 const previous=n.parent_id;moveNode(project,id,project.roots.trash,0);n.previous_parent_id=previous;
}
export function restoreNode(project,id){
 validate(project);const n=node(project,id);if(n.parent_id!==project.roots.trash)throw new Error('Não está na lixeira');
 const original=project.nodes.find(x=>x.id===n.previous_parent_id);
 const destination=original?.kind==='folder'&&!inTrash(project,original.id)?original.id:project.roots.draft;
 moveNode(project,id,destination);delete n.previous_parent_id;
}
export function snapshot(project,id,label='Snapshot'){
 validate(project);if(node(project,id).kind!=='text')throw new Error('Apenas cenas aceitam versões');
 if(typeof label!=='string'||!label.trim())throw new Error('Nome da versão obrigatório');
 const s={id:randomUUID(),node_id:id,content:project.documents[id],created_at:now(),label};
 if(project.rich_documents?.[id])s.rich_document=structuredClone(project.rich_documents[id]);
 project.snapshots.push(s);project.updated_at=now();return s.id;
}
export function restoreSnapshot(project,snapshotId){
 validate(project);const s=project.snapshots.find(x=>x.id===snapshotId);if(!s)throw new Error('Snapshot não encontrado');
 if(node(project,s.node_id).kind!=='text'||typeof s.content!=='string')throw new Error('Snapshot inválido');
 const draft=structuredClone(project);snapshot(draft,s.node_id,'Antes de restaurar');
 draft.documents[s.node_id]=s.content;
 if(s.rich_document){draft.rich_documents??={};draft.rich_documents[s.node_id]=structuredClone(s.rich_document);}else if(draft.rich_documents)delete draft.rich_documents[s.node_id];
 draft.updated_at=now();validate(draft);Object.assign(project,draft);
}
function documentNodes(project,parentId,out=[]){for(const n of children(project,parentId)){if(n.deleted||n.parent_id===project.roots.trash)continue;if(n.include_in_compile){if(n.kind==='text')out.push(n);if(n.kind==='folder')documentNodes(project,n.id,out);}}return out;}
export function compileProject(project,format='md'){
 if(!['md','txt'].includes(format))throw new Error('Formato não suportado');
 const docs=documentNodes(project,project.roots.draft),title=project.name;
 if(format==='md')return `# ${title}\n\n`+docs.map(n=>`## ${n.title}\n\n${project.rich_documents?.[n.id]?richMarkdown(project.rich_documents[n.id]):project.documents[n.id]||''}`).join('\n\n')+'\n';
 return title.toUpperCase()+'\n\n'+docs.map(n=>`${n.title}\n\n${project.rich_documents?.[n.id]?richPublishedText(project.rich_documents[n.id]):project.documents[n.id]||''}`).join('\n\n')+'\n';
}
export function wordCount(text){return (text.trim().match(/[^\s]+/gu)||[]).length;}
export async function saveProject(dir,project){
 validate(project);await mkdir(dir,{recursive:true});const target=path.join(dir,'project.json'),tmp=target+'.'+randomUUID()+'.tmp';
 const data=JSON.stringify(project,null,2);let handle;
 try{
  handle=await open(tmp,'wx',0o600);await handle.writeFile(data,'utf8');await handle.sync();await handle.close();handle=null;
  await rename(tmp,target);
 }finally{if(handle)await handle.close();await rm(tmp,{force:true});}
 return {path:target,checksum:hash(data)};
}
export async function loadProject(dir){const project=JSON.parse(await readFile(path.join(dir,'project.json'),'utf8'));validate(project);return project;}
export async function createProject(base,name){const project=makeProject(name);const dir=path.join(base,project.id+'.wroom');await saveProject(dir,project);return {dir,project};}
export async function listProjects(base){
 await mkdir(base,{recursive:true});const entries=await readdir(base,{withFileTypes:true}),results=[];
 for(const entry of entries){
  if(!entry.name.endsWith('.wroom')||(!entry.isDirectory()&&!entry.isSymbolicLink()))continue;
  const folderId=entry.name.slice(0,-6);
  try{
   const dir=path.join(base,entry.name);
   if(entry.isSymbolicLink()||(await lstat(path.join(dir,'project.json'))).isSymbolicLink())throw new Error('Unsafe link');
   const project=await loadProject(dir);
   if(project.id!==folderId)throw new Error('Identity mismatch');
   results.push({id:project.id,name:project.name,updated_at:project.updated_at,state:'ready'});
  }catch{
   results.push({id:folderId,name:'Projeto indisponível ('+folderId+')',updated_at:null,state:'unavailable',error:'Não foi possível abrir o projeto. Preserve a pasta original e restaure uma cópia de segurança em outro local.'});
  }
 }
 return results.sort((a,b)=>Number(a.state!=='ready')-Number(b.state!=='ready')||(b.updated_at||'').localeCompare(a.updated_at||'')||a.id.localeCompare(b.id));
}
export function search(project,q){const term=q.toLocaleLowerCase();return project.nodes.filter(n=>n.parent_id!==null && !n.deleted && !inTrash(project,n.id) && (n.title+' '+n.synopsis+' '+(n.notes||'')+' '+(n.keywords||[]).join(' ')+' '+(n.source?[n.source.author,n.source.publisher,n.source.url,n.source.date,n.source.basis].join(' '):'')+' '+(project.documents[n.id]??'')).toLocaleLowerCase().includes(term)).map(n=>({id:n.id,title:n.title,kind:n.kind}));}
