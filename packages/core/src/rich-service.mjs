import {createHash} from 'node:crypto';
import {validate,snapshot} from './core.mjs';
import {normalizeRichDocument,plainToRich,richText} from '../../editor/src/schema.mjs';
export const richHash=(project,id)=>createHash('sha256').update(JSON.stringify({text:project.documents[id],rich:project.rich_documents?.[id]??null})).digest('hex');
function scene(project,id){if(!project.nodes.some(n=>n.id===id&&n.kind==='text'))throw new Error('Cena não encontrada');}
export function saveRichDocument(project,id,value){
 validate(project);scene(project,id);const normalized=normalizeRichDocument(value),text=richText(normalized),draft=structuredClone(project);
 if(!draft.rich_documents?.[id])snapshot(draft,id,'Antes de ativar editor visual');
 draft.schema_version=Math.max(2,draft.schema_version);draft.rich_documents??={};draft.rich_documents[id]=normalized;draft.documents[id]=text;draft.updated_at=new Date().toISOString();validate(draft);Object.assign(project,draft);
 return {rich_hash:richHash(project,id),text};
}
export function convertToRich(project,id){validate(project);scene(project,id);if(project.rich_documents?.[id])return {rich_hash:richHash(project,id),text:project.documents[id]};return saveRichDocument(project,id,plainToRich(project.documents[id]));}
export function convertToPlain(project,id){
 validate(project);scene(project,id);if(!project.rich_documents?.[id])return {rich_hash:richHash(project,id)};
 const draft=structuredClone(project);snapshot(draft,id,'Antes de voltar ao texto simples');delete draft.rich_documents[id];draft.updated_at=new Date().toISOString();validate(draft);Object.assign(project,draft);return {rich_hash:richHash(project,id)};
}
