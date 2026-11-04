import {randomUUID,createHash} from 'node:crypto';
import {validate,snapshot,updateText} from './core.mjs';
import {richHash,saveRichDocument} from './rich-service.mjs';
import {richRangeChecker,replaceRichRanges} from '../../editor/src/transforms.mjs';
export const reviewHash=r=>createHash('sha256').update(JSON.stringify(r)).digest('hex');
function conflict(message){const error=new Error(message);error.code='CONFLICT';throw error;}
function scene(p,id){let n=p.nodes.find(n=>n.id===id&&n.kind==='text');if(!n)throw new Error('Cena ausente');while(n){if(n.deleted||n.id===p.roots.trash)throw new Error('Restaure o documento antes de revisar');n=p.nodes.find(x=>x.id===n.parent_id);}}
function actor(value){return typeof value==='string'&&!!value.trim()&&value.length<=100;}
function boundary(text,n){return n===0||n===text.length||!(/[\uD800-\uDBFF]/.test(text[n-1])&&/[\uDC00-\uDFFF]/.test(text[n]));}
export function proposeReview(project,input){
 validate(project);scene(project,input.node_id);if(richHash(project,input.node_id)!==input.base_hash)conflict('O documento mudou. Reabra a proposta antes de enviar.');
 const text=project.documents[input.node_id],{start,end,replacement}=input;
 if(!actor(input.author)||!['writer','editor'].includes(input.role)||typeof input.reason!=='string'||input.reason.length>2000||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>text.length||!boundary(text,start)||!boundary(text,end)||typeof replacement!=='string'||replacement.length>20000||end-start>20000||text.slice(start,end)===replacement)throw new Error('Proposta inválida');
 if(project.rich_documents?.[input.node_id]&&!richRangeChecker(project.rich_documents[input.node_id])(start,end,replacement))throw new Error('No editor visual, selecione texto dentro de um único bloco, sem atravessar limites de anotações ou inserir quebras.');
 const draft=structuredClone(project),r={id:randomUUID(),node_id:input.node_id,author:input.author.trim(),role:input.role,reason:input.reason,created_at:new Date().toISOString(),base_hash:input.base_hash,start,end,original:text.slice(start,end),replacement,status:'pending'};
 const linked=draft.editorial_rounds?.find(round=>round.role==='reviewer'&&round.status==='open'&&round.scenes.some(s=>s.node_id===r.node_id&&s.base_hash===r.base_hash));if(linked)r.exchange={round_id:linked.id,proposal_id:randomUUID()};
 draft.schema_version=Math.max(5,draft.schema_version);(draft.reviews??=[]).push(r);draft.updated_at=r.created_at;validate(draft);Object.assign(project,draft);return {id:r.id,hash:reviewHash(r)};
}
export function decideReview(project,input){
 validate(project);const r=project.reviews?.find(r=>r.id===input.id);if(!r)throw new Error('Proposta ausente');scene(project,r.node_id);
 if(reviewHash(r)!==input.base_review_hash||r.status!=='pending')conflict('Esta proposta já mudou ou foi decidida. Atualize a lista.');
 if(!actor(input.author)||typeof input.reason!=='string'||input.reason.length>2000||!['accept','reject'].includes(input.operation))throw new Error('Decisão inválida');
 const draft=structuredClone(project);let item=draft.reviews.find(r=>r.id===input.id);
 if(input.operation==='accept'){
  if(input.base_hash!==richHash(project,r.node_id)||r.base_hash!==richHash(project,r.node_id)||project.documents[r.node_id].slice(r.start,r.end)!==r.original)conflict('O texto ou a formatação mudou desde a proposta. Nenhuma alteração foi aplicada; crie uma nova proposta sobre o texto atual.');
  const snapshotId=snapshot(draft,r.node_id,'Antes de aceitar proposta de '+r.author);
  if(draft.rich_documents?.[r.node_id])saveRichDocument(draft,r.node_id,replaceRichRanges(draft.rich_documents[r.node_id],[{start:r.start,end:r.end}],r.replacement));
  else updateText(draft,r.node_id,draft.documents[r.node_id].slice(0,r.start)+r.replacement+draft.documents[r.node_id].slice(r.end));
  item=draft.reviews.find(r=>r.id===input.id);item.status='accepted';item.snapshot_id=snapshotId;
 }else item.status='rejected';
 item.decision={author:input.author.trim(),reason:input.reason,at:new Date().toISOString()};draft.updated_at=item.decision.at;validate(draft);Object.assign(project,draft);return {id:item.id,hash:reviewHash(item)};
}
