import {createHash} from 'node:crypto';
import {validate} from './core.mjs';
import {richHash} from './rich-service.mjs';
import {richAnnotations} from '../../editor/src/schema.mjs';
export const editorialStages=['unassigned','assessment','editing','author-review','ready'];
export const emptyTracking=()=>({responsible:'',stage:'unassigned',notes:'',next_steps:''});
export const trackingHash=project=>createHash('sha256').update(JSON.stringify(project.editorial_tracking??null)).digest('hex');
export function validateTracking(project){
 const value=project.editorial_tracking;if(value===undefined)return;
 if(project.schema_version<6||!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['responsible','stage','notes','next_steps'].includes(k))||!editorialStages.includes(value.stage))throw new Error('Acompanhamento editorial inválido');
 for(const [key,max] of [['responsible',100],['notes',10000],['next_steps',10000]])if(typeof value[key]!=='string'||value[key].length>max)throw new Error('Acompanhamento editorial inválido');
}
export function updateTracking(project,input){
 validate(project);if(input.base_hash!==trackingHash(project)){const error=new Error('O acompanhamento mudou. Atualize o painel antes de salvar.');error.code='CONFLICT';throw error;}
 const draft=structuredClone(project);draft.schema_version=Math.max(6,draft.schema_version);draft.editorial_tracking=structuredClone(input.tracking);if(draft.editorial_tracking===undefined)throw new Error('Acompanhamento editorial obrigatório');draft.updated_at=new Date().toISOString();validate(draft);Object.assign(project,draft);
}
export function editorialSummary(project){
 validate(project);const visible=n=>{while(n){if(n.deleted||n.id===project.roots.trash)return false;n=project.nodes.find(x=>x.id===n.parent_id);}return true;};
 const scenes=project.nodes.filter(n=>n.kind==='text'&&visible(n)).map(n=>{
  const reviews=(project.reviews||[]).filter(r=>r.node_id===n.id),pending=reviews.filter(r=>r.status==='pending');
  const comments=project.rich_documents?.[n.id]?richAnnotations(project.rich_documents[n.id]).filter(a=>a.type==='comment'&&!a.resolved).length:0;
  return {id:n.id,title:n.title,pending:pending.length,conflicts:pending.filter(r=>r.base_hash!==richHash(project,n.id)).length,comments,history:reviews.filter(r=>r.status!=='pending').length,versions:project.snapshots.filter(s=>s.node_id===n.id).length};
 });
 return {id:project.id,name:project.name,tracking:project.editorial_tracking??emptyTracking(),tracking_hash:trackingHash(project),scenes:scenes.filter(s=>s.pending||s.comments||s.history||s.versions),pending:scenes.reduce((n,s)=>n+s.pending,0),conflicts:scenes.reduce((n,s)=>n+s.conflicts,0),comments:scenes.reduce((n,s)=>n+s.comments,0)};
}
