import {randomUUID} from 'node:crypto';
import {validate,addNode} from './core.mjs';
import {inspectAsset,MAX_ASSETS,MAX_ASSET_TOTAL,MAX_PROJECT_BYTES} from './assets.mjs';
export function previewAttachment(project,input){
 validate(project);const asset=inspectAsset(input),existing=project.attachments||[];
 if(existing.length>=MAX_ASSETS||existing.reduce((sum,a)=>sum+a.bytes,0)+asset.bytes>MAX_ASSET_TOTAL)throw new Error('Limite de anexos atingido');
 const estimate=Buffer.byteLength(JSON.stringify(project),'utf8')+Buffer.byteLength(JSON.stringify(asset),'utf8')+2000;
 if(estimate>MAX_PROJECT_BYTES)throw new Error('Projeto grande demais para backup com este anexo');
 return {name:asset.name,mime:asset.mime,bytes:asset.bytes,sha256:asset.sha256,...(asset.width?{width:asset.width,height:asset.height}:{}),duplicate:existing.some(a=>a.sha256===asset.sha256),preview_text:asset.mime.startsWith('text/')?new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(asset.data_base64,'base64')).slice(0,4000):null};
}
export function addAttachment(project,input){
 previewAttachment(project,input);const asset=inspectAsset(input);if(input.expected_sha256!==asset.sha256)throw new Error('Prévia do anexo mudou; confira novamente');const draft=structuredClone(project);
 const nodeId=addNode(draft,draft.roots.research,asset.name,'research');draft.schema_version=Math.max(3,draft.schema_version);
 (draft.attachments??=[]).push({id:randomUUID(),node_id:nodeId,...asset});validate(draft);
 if(Buffer.byteLength(JSON.stringify(draft),'utf8')>MAX_PROJECT_BYTES)throw new Error('Projeto grande demais para backup');
 Object.assign(project,draft);return {id:nodeId,asset_id:draft.attachments.at(-1).id};
}
