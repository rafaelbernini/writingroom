import {createHash} from 'node:crypto';
import {validate,addNode} from './core.mjs';
import {normalizeSource} from './research-schema.mjs';
export const sourceHash=n=>createHash('sha256').update(JSON.stringify({title:n.title,source:n.source})).digest('hex');
export function changeSource(project,input){
 validate(project);if(!['create','update'].includes(input.operation)||typeof input.title!=='string'||!input.title.trim()||input.title.length>180)throw new Error('Fonte inválida');
 const draft=structuredClone(project);let id=input.id;
 if(input.operation==='update'){const n=draft.nodes.find(n=>n.id===id&&n.source);if(!n)throw new Error('Fonte ausente');if(sourceHash(n)!==input.base_hash){const error=new Error('A fonte mudou. Preserve os campos e reabra.');error.code='CONFLICT';throw error;}}
 else id=addNode(draft,draft.roots.research,input.title);
 const n=draft.nodes.find(n=>n.id===id);let current=n;while(current){if(current.deleted||current.id===draft.roots.trash)throw new Error('Restaure antes de editar');current=draft.nodes.find(n=>n.id===current.parent_id);}
 n.title=input.title.trim();n.source=normalizeSource(input.source,draft,id);draft.schema_version=Math.max(4,draft.schema_version);n.include_in_compile=false;draft.updated_at=new Date().toISOString();validate(draft);Object.assign(project,draft);return {id,hash:sourceHash(n)};
}
