import {randomUUID} from 'node:crypto';
import {validate,addNode,updateText,updateNode,search} from './core.mjs';
export const entityTypes={character:['Personagem','Papel na história','Desejo e necessidade','Conflito','Trajetória','Relações'],location:['Lugar','Atmosfera','Geografia','História','Cenas relacionadas'],object:['Objeto','Descrição','Origem','Importância'],organization:['Organização','Objetivo','Estrutura','Relações'],event:['Evento','Quando','O que acontece','Consequências'],concept:['Conceito','Definição','Regras','Referências']};
export function createEntity(project,{type,title}){
 if(!Object.hasOwn(entityTypes,type)||typeof title!=='string'||!title.trim()||title.length>180)throw new Error('Ficha inválida');
 const draft=structuredClone(project),id=addNode(draft,draft.roots.research,title.trim());
 updateText(draft,id,'# '+title.trim()+'\n\n'+entityTypes[type].slice(1).map(field=>'## '+field+'\n\n').join(''));
 updateNode(draft,id,{entity_type:type});validate(draft);Object.assign(project,draft);return id;
}
export function collectionMembers(project,collection){
 const visible=n=>{let current=n;while(current){if(current.deleted||current.id===project.roots.trash)return false;current=project.nodes.find(n=>n.id===current.parent_id);}return n.parent_id!==null;};
 if(collection.type==='manual')return collection.node_ids.map(id=>project.nodes.find(n=>n.id===id)).filter(n=>n&&visible(n));
 const found=new Set(search(project,collection.query||'').map(n=>n.id));
 return project.nodes.filter(n=>visible(n)&&found.has(n.id)&&(!collection.status||n.status===collection.status));
}
export function changeCollection(project,input){
 validate(project);const draft=structuredClone(project);draft.collections??=[];
 if(input?.operation==='create'){
  const collection={id:randomUUID(),name:input.name,type:input.type,node_ids:[],query:input.query??'',status:input.status??''};
  draft.collections.push(collection);draft.updated_at=new Date().toISOString();validate(draft);Object.assign(project,draft);return collection.id;
 }
 const collection=draft.collections.find(c=>c.id===input?.id);if(!collection)throw new Error('Coleção não encontrada');
 if(input.operation==='delete')draft.collections=draft.collections.filter(c=>c.id!==collection.id);
 else if(input.operation==='rename')collection.name=input.name;
 else if(input.operation==='add'||input.operation==='remove'){
  if(collection.type!=='manual')throw new Error('Coleção dinâmica usa a consulta');
  if(input.operation==='add'){if(!collection.node_ids.includes(input.node_id))collection.node_ids.push(input.node_id);}
  else collection.node_ids=collection.node_ids.filter(id=>id!==input.node_id);
 }else throw new Error('Operação de coleção inválida');
 validate(draft);draft.updated_at=new Date().toISOString();Object.assign(project,draft);return collection.id;
}
export function updateScratchpad(project,text){
 validate(project);if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>1500000)throw new Error('Captura inválida');
 project.scratchpad=text;project.updated_at=new Date().toISOString();
}
export function captureScratchpad(project,{title,parent_id}){
 const draft=structuredClone(project);if(!draft.scratchpad?.trim())throw new Error('Caderno vazio');
 const id=addNode(draft,parent_id,title);updateText(draft,id,draft.scratchpad);validate(draft);Object.assign(project,draft);return id;
}
