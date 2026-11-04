import {Transform} from 'prosemirror-transform';
import {richSchema,normalizeRichDocument,richAnnotations} from './schema.mjs';
// Positions are ProseMirror document positions, remapped naturally with text edits.
export function annotateDocument(value,{type,id,body,from,to}){
 if(!['comment','footnote'].includes(type))throw new Error('Tipo de anotação inválido');
 const doc=richSchema.nodeFromJSON(normalizeRichDocument(value).doc);
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>doc.content.size||from>=to)throw new Error('Selecione um trecho de texto');
 if(richAnnotations(value).some(a=>a.id===id))throw new Error('Identidade de anotação já existe');
 let text=false;doc.nodesBetween(from,to,node=>{if(node.type===richSchema.nodes.code_block)throw new Error('Selecione texto fora do bloco de código');if(node.isText){text=true;if(node.marks.some(m=>m.type===richSchema.marks[type]))throw new Error('Este trecho já contém uma anotação deste tipo');}});
 if(!text)throw new Error('Selecione um trecho de texto');
 const mark=richSchema.marks[type].create({id,body,...(type==='comment'?{resolved:false}:{})});
 const tr=new Transform(doc);doc.nodesBetween(from,to,(node,pos)=>{if(node.isText)tr.addMark(Math.max(pos,from),Math.min(pos+node.nodeSize,to),mark);});
 return normalizeRichDocument({schema_version:1,doc:tr.doc.toJSON()});
}
export function reviseAnnotation(value,id,patch){
 if(!patch||Object.keys(patch).some(k=>!['body','resolved','remove'].includes(k))||(patch.remove!==undefined&&typeof patch.remove!=='boolean'))throw new Error('Alteração de anotação inválida');
 const normalized=normalizeRichDocument(value),entry=richAnnotations(normalized).find(a=>a.id===id);if(!entry)throw new Error('Anotação não encontrada');
 if(entry.type==='footnote'&&patch.resolved!==undefined)throw new Error('Nota não tem estado de resolução');
 const doc=richSchema.nodeFromJSON(normalized.doc),tr=new Transform(doc),type=richSchema.marks[entry.type];
 doc.descendants((node,pos)=>{if(!node.isText)return;const mark=node.marks.find(m=>m.type===type&&m.attrs.id===id);if(!mark)return;tr.removeMark(pos,pos+node.nodeSize,mark);if(!patch.remove)tr.addMark(pos,pos+node.nodeSize,type.create({...mark.attrs,...(patch.body!==undefined?{body:patch.body}:{}),...(patch.resolved!==undefined?{resolved:patch.resolved}:{})}));});
 return normalizeRichDocument({schema_version:1,doc:tr.doc.toJSON()});
}
