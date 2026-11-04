import {createHash} from 'node:crypto';
import {validate,snapshot,updateText} from './core.mjs';
import {richHash} from './rich-service.mjs';
import {richRangeChecker,replaceRichRanges} from '../../editor/src/transforms.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
function conflict(){const error=new Error('O conteúdo ou o escopo mudou. Gere uma nova prévia; nenhuma substituição foi aplicada.');error.code='CONFLICT';throw error;}
function active(project,n,map){while(n){if(n.deleted||n.id===project.roots.trash)return false;n=map.get(n.parent_id);}return true;}
function queryInput(input){
 if(!input||typeof input.find!=='string'||!input.find||input.find.length>300||typeof input.replacement!=='string'||input.replacement.length>10000||!['document','draft','project'].includes(input.scope)||typeof input.case_sensitive!=='boolean'||typeof input.whole_word!=='boolean')throw new Error('Busca inválida');
 return {find:input.find,replacement:input.replacement,scope:input.scope,node_id:input.scope==='document'?input.node_id:null,case_sensitive:input.case_sensitive,whole_word:input.whole_word};
}
export function previewReplace(project,input){
 validate(project);const query=queryInput(input),map=new Map(project.nodes.map(n=>[n.id,n]));
 const docs=project.nodes.filter(n=>{
  if(n.kind!=='text'||!active(project,n,map))return false;
  if(query.scope==='document')return n.id===query.node_id;
  if(query.scope==='draft'){let current=n;while(current){if(current.id===project.roots.draft)return true;current=map.get(current.parent_id);}return false;}
  return true;
 }).sort((a,b)=>a.id.localeCompare(b.id));
 if(query.scope==='document'&&!docs.length)throw new Error('Selecione uma cena válida');
 const occurrences=[],base_hashes={},document_ids=docs.map(n=>n.id),word=/[\p{L}\p{N}\p{M}_]/u;
 const pattern=query.find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 for(const n of docs){
  const text=project.documents[n.id];base_hashes[n.id]=richHash(project,n.id);const checkRich=project.rich_documents?.[n.id]?richRangeChecker(project.rich_documents[n.id]):null;
  const matcher=new RegExp(pattern,query.case_sensitive?'gu':'giu');
  for(const match of text.matchAll(matcher)){
   const start=match.index,end=start+match[0].length;
   const left=start?Array.from(text.slice(Math.max(0,start-2),start)).at(-1):'',right=Array.from(text.slice(end,end+2))[0]||'';
   if(query.whole_word&&((left&&word.test(left))||(right&&word.test(right))))continue;
   occurrences.push({id:n.id+':'+start+':'+end,node_id:n.id,title:n.title,start,end,match:match[0],before:text.slice(Math.max(0,start-60),start),after:text.slice(end,end+60),...(checkRich?{unsupported:!checkRich(start,end,query.replacement)}:{})});
   if(occurrences.length>5000)throw new Error('Mais de 5000 ocorrências. Restrinja o escopo ou a busca.');
  }
 }
 const fingerprint=hash(JSON.stringify({query,document_ids,base_hashes,occurrences:occurrences.map(o=>o.id)}));
 return {query,document_ids,base_hashes,occurrences,fingerprint};
}
export function applyReplace(project,input){
 const plan=previewReplace(project,input?.query);
 if(typeof input.fingerprint!=='string'||input.fingerprint!==plan.fingerprint)conflict();
 if(!Array.isArray(input.occurrence_ids)||!input.occurrence_ids.length||input.occurrence_ids.length>5000||new Set(input.occurrence_ids).size!==input.occurrence_ids.length)throw new Error('Selecione ocorrências válidas');
 const chosen=new Set(input.occurrence_ids),matches=plan.occurrences.filter(o=>chosen.has(o.id));
 if(matches.length!==chosen.size)throw new Error('Ocorrência desconhecida');
 const grouped=new Map();for(const occurrence of matches){if(!grouped.has(occurrence.node_id))grouped.set(occurrence.node_id,[]);grouped.get(occurrence.node_id).push(occurrence);}
 const draft=structuredClone(project);let documents=0,replacements=0;
 for(const [id,items] of grouped){
  const original=draft.documents[id];let text=original;
  for(const occurrence of [...items].reverse())text=text.slice(0,occurrence.start)+plan.query.replacement+text.slice(occurrence.end);
  if(Buffer.byteLength(text,'utf8')>1500000)throw new Error('O resultado ultrapassa 1,5 MB por cena');
  if(text===original)continue;
  snapshot(draft,id,'Antes de substituir: '+plan.query.find.slice(0,60));if(draft.rich_documents?.[id]){draft.rich_documents[id]=replaceRichRanges(draft.rich_documents[id],items,plan.query.replacement);draft.documents[id]=text;draft.updated_at=new Date().toISOString();}else updateText(draft,id,text);documents++;replacements+=items.length;
 }
 validate(draft);Object.assign(project,draft);return {documents,replacements};
}
