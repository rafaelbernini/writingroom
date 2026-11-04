import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate,updateText,updateNode} from './core.mjs';
import {changeSource} from './research.mjs';
import {createTranslation} from './translation.mjs';
const run=promisify(execFile),extractor=fileURLToPath(new URL('./document-extraction.py',import.meta.url));
export function visibleAsset(project,id){const asset=project.attachments?.find(a=>a.id===id);let n=project.nodes.find(n=>n.id===asset?.node_id);if(!asset||!n)throw new Error('Anexo ausente');while(n){if(n.deleted||n.id===project.roots.trash)throw new Error('Anexo na lixeira');n=project.nodes.find(x=>x.id===n.parent_id);}return asset;}
export async function extractAttachment(project,id){
 validate(project);const asset=visibleAsset(project,id),ext=asset.name.split('.').pop().toLowerCase(),bytes=Buffer.from(asset.data_base64,'base64');let text='';
 if(['txt','md','markdown'].includes(ext))text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 else if(['docx','odt','pdf'].includes(ext)){
  const temp=await mkdtemp(path.join(os.tmpdir(),'writingroom-extract-'));
  try{const input=path.join(temp,'document.'+ext);await writeFile(input,bytes,{mode:0o600});
   if(ext==='pdf')text=(await run('pdftotext',['-enc','UTF-8','-layout',input,'-'],{timeout:15000,maxBuffer:4000000})).stdout;
   else text=JSON.parse((await run('python3',[extractor,input,ext],{timeout:15000,maxBuffer:6000000})).stdout).text;
  }catch{throw new Error('Não foi possível extrair. Verifique formato, proteção por senha e ferramentas locais.');}finally{await rm(temp,{recursive:true,force:true});}
 }else return {asset_id:id,sha256:asset.sha256,name:asset.name,text:'',supported:false,warnings:['Arquivo preservado para download. Este formato não tem extrator local; você pode transcrever ou colar um trecho na prévia.']};
 if(text.length>1000000)throw new Error('Texto extraído excede 1 milhão de caracteres; divida o arquivo');
 return {asset_id:id,sha256:asset.sha256,name:asset.name,text,supported:true,warnings:[...(!text.trim()?['Nenhum texto encontrado. Digitalizações/imagens precisam de OCR ou transcrição.']:[]),'Extração textual: layout, tabelas, imagens, notas e ordem de leitura podem exigir revisão.']};
}
export function useExtractedText(project,input){
 validate(project);const asset=visibleAsset(project,input.asset_id);
 if(asset.sha256!==input.sha256||typeof input.text!=='string'||!input.text.trim()||input.text.length>200000||typeof input.title!=='string'||!input.title.trim()||input.title.length>150)throw new Error('Prévia inválida ou anexo alterado');
 const draft=structuredClone(project);let result;
 if(input.mode==='translation'){
  result=createTranslation(draft,{title:input.title,original:input.text,translation:'',from:input.from,to:input.to});const source=draft.nodes.find(n=>n.id===result.source_id);source.source.refs.push(asset.node_id);
 }else if(input.mode==='research'){
  result=changeSource(draft,{operation:'create',title:input.title,source:{url:'',author:'',publisher:'',date:'',accessed:'',basis:'documented',refs:[asset.node_id]}});updateText(draft,result.id,input.text);updateNode(draft,result.id,{notes:'Texto extraído de '+asset.name+'\nSHA-256 do original: '+asset.sha256+'\nPrévia revisada pelo usuário; não preserva layout.'});
 }else throw new Error('Uso inválido');
 validate(draft);Object.assign(project,draft);return result;
}
