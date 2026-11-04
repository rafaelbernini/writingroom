import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {validate,addNode,updateText,updateNode,moveNode,snapshot,wordCount,saveProject} from './core.mjs';
import {templateDefinition} from './project-catalog.mjs';
import {richHtml} from '../../editor/src/schema.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
export function updateSettings(project,patch){
 validate(project);const next={...project.settings};
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('Configurações inválidas');
 for(const key of ['author','description','language','target_words'])if(Object.hasOwn(patch,key)){
  if(key==='target_words'){if(!Number.isSafeInteger(patch[key])||patch[key]<0||patch[key]>100000000)throw new Error('Meta inválida');}
  else if(typeof patch[key]!=='string'||(key==='language'&&!['pt-BR','en-US','none'].includes(patch[key])))throw new Error('Configuração inválida');
  next[key]=patch[key];
 }
 if(Object.hasOwn(patch,'name')){if(typeof patch.name!=='string'||!patch.name.trim())throw new Error('Nome obrigatório');}
 project.settings=next;if(patch.name)project.name=patch.name.trim();project.updated_at=new Date().toISOString();
}
export function applyTemplate(project,template='blank',{preset='general'}={}){
 const definition=templateDefinition(template);if(!['general','historical'].includes(preset))throw new Error('Preset inválido');validate(project);
 const draft=structuredClone(project);draft.settings={...draft.settings,project_type:definition.type,template_version:definition.version,research_preset:preset};
 if(definition.folder){const folder=addNode(draft,draft.roots.draft,definition.folder,'folder'),scene=addNode(draft,folder,definition.scene);updateNode(draft,scene,{synopsis:template==='novel'?'Quem chega? O que muda? Qual é a pergunta que fica?':template==='nonfiction'?'Qual pergunta este livro vai responder?':'Estrutura inicial de '+definition.name+'. Desenvolva o conteúdo livremente.'});}
 const research=[...definition.research,...(preset==='historical'?['Fontes históricas','Cronologia','Fotos e documentos','Rascunhos (fora da publicação)']:[])];
 for(const title of [...new Set(research)])addNode(draft,draft.roots.research,title,'folder');
 if(definition.type==='translation'){const brief=addNode(draft,draft.roots.research,'Briefing da tradução');updateText(draft,brief,'# '+definition.name+'\n\n'+({ 'translation-book':'Planejar capítulos, voz narrativa, diálogos, nomes próprios e notas do tradutor.', 'translation-article':'Preservar título, resumo, citações, referências e terminologia da área.', 'translation-document':'Conferir campos, numeração, datas, unidades e exigências do destinatário; não implica certificação juramentada.', 'translation-other':'Definir suporte, público, restrições de tamanho e critérios de adaptação.' }[template]||'')+'\n\n## Obra, autor original e direitos de uso\n\n## Idiomas, variante e público-alvo\n\n## Tradutor, revisor e créditos\n\n## Tom, registro e guia de estilo\n\n## Prazos e entrega\n\n## Checklist de revisão\n\n- Fidelidade e omissões\n- Terminologia, nomes e números\n- Fluência, pontuação e formatação\n- Créditos e autorização\n');}
 validate(draft);Object.assign(project,draft);
}
export function inspectImport({text,filename='Texto importado.txt',split=false}){
 if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>1500000||typeof filename!=='string'||typeof split!=='boolean')throw new Error('Importação inválida');
 const warnings=[],title=filename.replace(/^.*[\\/]/,'').replace(/\.(md|markdown|txt)$/i,'').trim()||'Texto importado';
 if(text.charCodeAt(0)===0xfeff){text=text.slice(1);warnings.push('Marcador UTF-8 BOM removido.');}
 if(text.includes('\u0000'))throw new Error('Conteúdo binário não suportado');
 let sections=[];
 if(split){
  let offset=0,bodyStart=0,currentTitle=title,fence=null,hasHeading=false;
  for(const line of text.match(/[^\n]*\n|[^\n]+$/g)||[]){
   const fenceMatch=line.match(/^ {0,3}(`{3,}|~{3,})/);
   if(fenceMatch){if(!fence)fence={char:fenceMatch[1][0],length:fenceMatch[1].length};else if(fenceMatch[1][0]===fence.char&&fenceMatch[1].length>=fence.length)fence=null;}
   const heading=!fence&&!fenceMatch&&line.match(/^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*\r?\n?$/);
   if(heading){
    if(hasHeading||offset>bodyStart)sections.push({title:currentTitle,text:text.slice(bodyStart,offset)});
    currentTitle=heading[1].trim();bodyStart=offset+line.length;hasHeading=true;
   }
   offset+=line.length;
  }
  sections.push({title:currentTitle,text:text.slice(bodyStart)});
  warnings.push('Títulos Markdown viram cenas na mesma pasta; hierarquia e formatação rica não são importadas.');
 }else sections=[{title,text}];
 if(sections.length>200)throw new Error('Limite de 200 cenas por importação');
 return {sections,warnings,words:sections.reduce((sum,s)=>sum+wordCount(s.text),0)};
}
export function importText(project,parentId,input){
 const plan=inspectImport(input),draft=structuredClone(project),ids=[];
 for(const section of plan.sections){const id=addNode(draft,parentId,section.title);updateText(draft,id,section.text);ids.push(id);}
 validate(draft);Object.assign(project,draft);return {ids,warnings:plan.warnings};
}
export function splitScene(project,id,offset,title='Continuação'){
 validate(project);const text=project.documents[id];
 if(project.rich_documents?.[id])throw new Error('Divisão de cena visual ainda não está disponível');
 if(typeof text!=='string'||!Number.isSafeInteger(offset)||offset<=0||offset>=text.length)throw new Error('Escolha um ponto dentro do texto');
 if(/[\uD800-\uDBFF]/.test(text[offset-1])&&/[\uDC00-\uDFFF]/.test(text[offset]))throw new Error('Não dividir um caractere Unicode');
 const draft=structuredClone(project),original=draft.nodes.find(n=>n.id===id);snapshot(draft,id,'Antes de dividir a cena');
 const newId=addNode(draft,original.parent_id,title);updateText(draft,id,text.slice(0,offset));updateText(draft,newId,text.slice(offset));
 const inherited={};for(const key of ['status','include_in_compile','label','keywords'])if(Object.hasOwn(original,key))inherited[key]=original[key];updateNode(draft,newId,inherited);
 moveNode(draft,newId,original.parent_id,original.sort_key+1);Object.assign(project,draft);return newId;
}
export function compilation(project){
 validate(project);const sections=[],omitted=[];
 function visit(parent,enabled=true,depth=0){for(const n of project.nodes.filter(n=>n.parent_id===parent).sort((a,b)=>a.sort_key-b.sort_key)){
  const included=enabled&&n.include_in_compile&&!n.deleted;
  if(n.kind==='text'){const section={id:n.id,title:n.title,text:project.documents[n.id],depth,words:wordCount(project.documents[n.id])};(included?sections:omitted).push(section);}
  if(n.kind==='folder')visit(n.id,included,depth+1);
 }}visit(project.roots.draft);
 return {title:project.name,author:project.settings?.author||'',sections,omitted,words:sections.reduce((sum,s)=>sum+s.words,0)};
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exportHtml(project){
 const plan=compilation(project);
 return '<!doctype html><html lang="'+(project.settings?.language==='en-US'?'en-US':'pt-BR')+'"><meta charset="utf-8"><title>'+escape(plan.title)+'</title><style>body{max-width:42em;margin:4em auto;padding:0 2em;font:18px/1.7 Georgia,serif;color:#222}pre{white-space:pre-wrap;font:inherit}section{break-before:page}a{color:inherit}section[role="doc-endnotes"] li{white-space:pre-wrap}@media print{body{margin:0;max-width:none}}</style><h1>'+escape(plan.title)+'</h1><p>'+escape(plan.author)+'</p><nav><ol>'+plan.sections.map(s=>'<li><a href="#scene-'+s.id+'">'+escape(s.title)+'</a></li>').join('')+'</ol></nav>'+plan.sections.map(s=>'<section id="scene-'+s.id+'"><h2>'+escape(s.title)+'</h2>'+(project.rich_documents?.[s.id]?richHtml(project.rich_documents[s.id],{prefix:s.id}):'<pre>'+escape(s.text)+'</pre>')+'</section>').join('')+'</html>';
}
export function projectBackup(project){validate(project);return {format:'writingroom-json-backup',version:1,created_at:new Date().toISOString(),checksum:digest(JSON.stringify(project)),project};}
export async function restoreProjectBackup(base,bundle,{name}={}){
 if(!bundle||bundle.format!=='writingroom-json-backup'||bundle.version!==1||!bundle.project||bundle.checksum!==digest(JSON.stringify(bundle.project)))throw new Error('Backup inválido');
 validate(bundle.project);const p=structuredClone(bundle.project),ids=new Map(p.nodes.map(n=>[n.id,randomUUID()]));
 delete p.round_hashes;delete p.tracking_hash;delete p.review_hashes;delete p.source_hashes;delete p.structure_hash;delete p.attachments_hash;delete p.document_hashes;delete p.scratchpad_hash;delete p.collections_hash;delete p.rich_hashes;
 if(name!==undefined&&(typeof name!=='string'||!name.trim()||name.length>180))throw new Error('Nome inválido');
 p.id=randomUUID();p.name=name?.trim()||(p.name+' (restaurado)');p.created_at=p.updated_at=new Date().toISOString();
 for(const key of Object.keys(p.roots))p.roots[key]=ids.get(p.roots[key]);
 for(const n of p.nodes){if(n.source)n.source.refs=n.source.refs.map(id=>ids.get(id));n.id=ids.get(n.id);if(n.parent_id)n.parent_id=ids.get(n.parent_id);if(n.previous_parent_id)n.previous_parent_id=ids.get(n.previous_parent_id);}
 if(p.attachments)p.attachments=p.attachments.map(a=>({...a,id:randomUUID(),node_id:ids.get(a.node_id)}));
 if(p.rich_documents)p.rich_documents=Object.fromEntries(Object.entries(p.rich_documents).map(([id,value])=>[ids.get(id),value]));
 p.documents=Object.fromEntries(Object.entries(p.documents).map(([id,text])=>[ids.get(id),text]));
 if(p.collections)p.collections=p.collections.map(c=>({...c,id:randomUUID(),node_ids:c.node_ids.map(id=>ids.get(id))}));
 const snapshotIds=new Map(p.snapshots.map(s=>[s.id,randomUUID()]));p.snapshots=p.snapshots.map(s=>({...s,id:snapshotIds.get(s.id),node_id:ids.get(s.node_id)}));
 if(p.reviews)p.reviews=p.reviews.map(r=>({...r,id:randomUUID(),node_id:ids.get(r.node_id),...(r.snapshot_id?{snapshot_id:snapshotIds.get(r.snapshot_id)}:{})}));
 if(p.editorial_rounds)for(const r of p.editorial_rounds){for(const s of r.scenes)s.node_id=ids.get(s.node_id);for(const receipt of r.receipts){const old=bundle.project.reviews.find(v=>v.id===receipt.review_id);receipt.review_id=p.reviews[bundle.project.reviews.indexOf(old)].id;}}
 validate(p);await saveProject(path.join(base,p.id+'.wroom'),p);return p;
}
