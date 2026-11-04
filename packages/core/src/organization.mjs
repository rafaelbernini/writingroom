import {randomUUID,createHash} from 'node:crypto';
import {validate,moveNode} from './core.mjs';
export const structureHash=p=>createHash('sha256').update(JSON.stringify(p.nodes.map(n=>[n.id,n.parent_id,n.sort_key,n.deleted]))).digest('hex');
export const structureState=p=>p.nodes.map(n=>({id:n.id,parent_id:n.parent_id,sort_key:n.sort_key,deleted:n.deleted,...(n.previous_parent_id?{previous_parent_id:n.previous_parent_id}:{})}));
export function moveDocument(p,{id,target_id,placement,base_hash}){
 if(base_hash!==structureHash(p)){const e=new Error('A estrutura mudou. Reabra antes de reorganizar.');e.code='CONFLICT';throw e;}
 if(!['before','after','inside'].includes(placement)||id===target_id)throw new Error('Destino inválido');
 const draft=structuredClone(p),target=draft.nodes.find(n=>n.id===target_id);if(!target)throw new Error('Destino ausente');
 const previous=structureState(p);
 if(placement==='inside'){if(target.kind!=='folder')throw new Error('Destino deve ser pasta');moveNode(draft,id,target.id);}
 else{if(target.parent_id===null)throw new Error('Raiz protegida');const siblings=draft.nodes.filter(n=>n.parent_id===target.parent_id&&n.id!==id).sort((a,b)=>a.sort_key-b.sort_key),index=siblings.findIndex(n=>n.id===target.id)+(placement==='after'?1:0);moveNode(draft,id,target.parent_id,index);}
 validate(draft);Object.assign(p,draft);return {previous,structure_hash:structureHash(p)};
}
export function restoreStructure(p,{previous,base_hash}){
 validate(p);if(base_hash!==structureHash(p)){const e=new Error('A estrutura mudou após a operação; desfazer foi bloqueado.');e.code='CONFLICT';throw e;}
 if(!Array.isArray(previous)||previous.length!==p.nodes.length||new Set(previous.map(n=>n.id)).size!==p.nodes.length)throw new Error('Estrutura anterior inválida');
 const draft=structuredClone(p);for(const n of draft.nodes){const old=previous.find(x=>x.id===n.id);if(!old||Object.keys(old).some(k=>!['id','parent_id','sort_key','deleted','previous_parent_id'].includes(k)))throw new Error('Estrutura anterior inválida');n.parent_id=old.parent_id;n.sort_key=old.sort_key;n.deleted=old.deleted;delete n.previous_parent_id;if(old.previous_parent_id)n.previous_parent_id=old.previous_parent_id;}
 validate(draft);draft.updated_at=new Date().toISOString();Object.assign(p,draft);return {structure_hash:structureHash(p)};
}
export function duplicateDocument(p,id){
 validate(p);const original=p.nodes.find(n=>n.id===id);if(!original||original.parent_id===null)throw new Error('Selecione documento fora das raízes');
 let parent=original;while(parent){if(parent.deleted||parent.id===p.roots.trash)throw new Error('Restaure o documento antes de duplicar');parent=p.nodes.find(n=>n.id===parent.parent_id);}
 const source=[];function walk(id){const n=p.nodes.find(n=>n.id===id);source.push(n);for(const child of p.nodes.filter(n=>n.parent_id===id))walk(child.id);}walk(id);
 const draft=structuredClone(p),ids=new Map(source.map(n=>[n.id,randomUUID()]));
 for(const n of source){const copy=structuredClone(n);copy.id=ids.get(n.id);if(copy.source)copy.source.refs=copy.source.refs.map(id=>ids.get(id)||id);copy.parent_id=ids.get(n.parent_id)||n.parent_id;delete copy.previous_parent_id;if(n.id===id){copy.title+=' (cópia)';copy.sort_key=Math.max(-1,...p.nodes.filter(s=>s.parent_id===n.parent_id).map(s=>s.sort_key))+1;}draft.nodes.push(copy);
  if(n.kind==='text'){draft.documents[copy.id]=p.documents[n.id];if(p.rich_documents?.[n.id]){draft.rich_documents??={};draft.rich_documents[copy.id]=structuredClone(p.rich_documents[n.id]);}}
 }
 draft.snapshots.push(...p.snapshots.filter(s=>ids.has(s.node_id)).map(s=>({...structuredClone(s),id:randomUUID(),node_id:ids.get(s.node_id)})));
 if(p.attachments)draft.attachments.push(...p.attachments.filter(a=>ids.has(a.node_id)).map(a=>({...structuredClone(a),id:randomUUID(),node_id:ids.get(a.node_id)})));
 draft.updated_at=new Date().toISOString();validate(draft);Object.assign(p,draft);return {id:ids.get(id)};
}
