import {Schema} from 'prosemirror-model';
import {schema as basic} from 'prosemirror-schema-basic';
import {addListNodes} from 'prosemirror-schema-list';
export function safeLink(href){
 if(typeof href!=='string'||href.length>2000||/[\u0000-\u0020\u007f]/u.test(href))return false;
 try{return ['https:','http:','mailto:'].includes(new URL(href).protocol);}catch{return false;}
}
const link={attrs:{href:{},title:{default:null}},inclusive:false,parseDOM:[{tag:'a[href]',getAttrs:dom=>safeLink(dom.getAttribute('href'))?{href:dom.getAttribute('href'),title:dom.getAttribute('title')}:false}],toDOM:mark=>['a',{href:mark.attrs.href,title:mark.attrs.title,target:'_blank',rel:'noopener noreferrer'},0]};
const annotation=(kind)=>({attrs:{id:{},body:{},...(kind==='comment'?{resolved:{default:false}}:{})},inclusive:false,toDOM:mark=>['span',{['data-'+kind]:mark.attrs.id,class:kind==='comment'?(mark.attrs.resolved?'review-comment resolved':'review-comment'):'review-footnote'},0]});
const marks=basic.spec.marks.remove('link').append({comment:annotation('comment'),footnote:annotation('footnote'),link,underline:{parseDOM:[{tag:'u'}],toDOM:()=>['u',0]},strike:{parseDOM:[{tag:'s'},{tag:'del'}],toDOM:()=>['s',0]}});
const nodes=addListNodes(basic.spec.nodes.remove('image'),'paragraph block*','block');
export const richSchema=new Schema({nodes,marks});
const allowed=new Set(['doc','paragraph','heading','blockquote','code_block','bullet_list','ordered_list','list_item','text','hard_break','horizontal_rule']);
const attrsFor={heading:['level'],ordered_list:['order']};
const markTypes=new Set(['strong','em','code','link','underline','strike','comment','footnote']);
const bytes=value=>new TextEncoder().encode(value).length;
function exactKeys(object,keys){if(Object.keys(object).some(key=>!keys.includes(key)))throw new Error('Campo semântico desconhecido');}
export function normalizeRichDocument(value){
 if(!value||value.schema_version!==1||!value.doc||typeof value.doc!=='object')throw new Error('Schema visual incompatível');
 exactKeys(value,['schema_version','doc']);let total=0,textBytes=0;const annotations=new Map();
 function visit(node,depth=0){
  if(!node||typeof node!=='object'||Array.isArray(node)||!allowed.has(node.type)||depth>32||++total>20000)throw new Error('Estrutura visual inválida ou grande demais');
  exactKeys(node,['type','attrs','content','marks','text']);
  if(node.attrs!==undefined){if(!node.attrs||typeof node.attrs!=='object'||Array.isArray(node.attrs))throw new Error('Atributos inválidos');exactKeys(node.attrs,attrsFor[node.type]||[]);}
  if(node.type==='heading'&&![1,2,3].includes(node.attrs?.level??1))throw new Error('Nível de título inválido');
  if(node.type==='ordered_list'&&(!Number.isSafeInteger(node.attrs?.order??1)||(node.attrs?.order??1)<1||(node.attrs?.order??1)>100000))throw new Error('Numeração inválida');
  if(node.type==='text'){if(typeof node.text!=='string'||!node.text.length)throw new Error('Texto semântico inválido');textBytes+=bytes(node.text);}else if(node.text!==undefined)throw new Error('Texto em bloco inválido');
  if(textBytes>1500000)throw new Error('Texto visual ultrapassa 1,5 MB');
  if(node.marks!==undefined){if(!Array.isArray(node.marks)||node.marks.length>8)throw new Error('Marcas inválidas');const seen=new Set();for(const mark of node.marks){
   if(!mark||!markTypes.has(mark.type)||seen.has(mark.type))throw new Error('Marca inválida');seen.add(mark.type);exactKeys(mark,['type','attrs']);
   if(mark.type==='comment'||mark.type==='footnote'){
    const a=mark.attrs;if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('Anotação inválida');
    exactKeys(a,mark.type==='comment'?['id','body','resolved']:['id','body']);
    if(typeof a.id!=='string'||!/^n-[a-f0-9-]{36}$/.test(a.id)||typeof a.body!=='string'||!a.body.trim()||a.body.length>4000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(a.body)||(mark.type==='comment'&&typeof a.resolved!=='boolean'))throw new Error('Anotação inválida ou grande demais');
    if(node.type!=='text')throw new Error('Selecione texto para anotar');
    const entry=JSON.stringify([mark.type,a.id,a.body,a.resolved??null]),old=annotations.get(a.id);if(old&&old!==entry)throw new Error('Âncora de anotação inconsistente');annotations.set(a.id,entry);if(annotations.size>1000)throw new Error('Limite de 1000 anotações');
   }else if(mark.type==='link'){if(!mark.attrs||!safeLink(mark.attrs.href))throw new Error('Link não permitido');exactKeys(mark.attrs,['href','title']);if(mark.attrs.title!==undefined&&mark.attrs.title!==null&&(typeof mark.attrs.title!=='string'||mark.attrs.title.length>500))throw new Error('Título de link inválido');}
   else if(mark.attrs!==undefined&&(!mark.attrs||typeof mark.attrs!=='object'||Array.isArray(mark.attrs)||Object.keys(mark.attrs).length))throw new Error('Atributo de marca inválido');
  }}
  if(node.type==='code_block'&&(node.content||[]).some(n=>(n.marks||[]).some(m=>m.type==='comment'||m.type==='footnote')))throw new Error('Anotações em bloco de código não são suportadas');
  if(node.content!==undefined){if(!Array.isArray(node.content))throw new Error('Conteúdo inválido');for(const child of node.content)visit(child,depth+1);}
 }
 visit(value.doc);if(value.doc.type!=='doc')throw new Error('Raiz visual inválida');
 const parsed=richSchema.nodeFromJSON(value.doc);parsed.check();const doc=parsed.toJSON();if(bytes(JSON.stringify(doc))>2000000)throw new Error('Documento visual grande demais');
 return {schema_version:1,doc};
}
export function plainToRich(text){
 if(typeof text!=='string')throw new Error('Texto inválido');
 return normalizeRichDocument({schema_version:1,doc:{type:'doc',content:text.split(/\r\n|\n|\r/).map(line=>({type:'paragraph',...(line?{content:[{type:'text',text:line}]}:{})}))}});
}
function projectNode(node){
 if(node.type==='text')return node.text;
 if(node.type==='hard_break'||node.type==='horizontal_rule')return '\n';
 const separator=['paragraph','heading','code_block'].includes(node.type)?'':'\n';
 return (node.content||[]).map(projectNode).join(separator);
}
export function richText(value){return projectNode(normalizeRichDocument(value).doc);}
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function richAnnotations(value){
 const doc=normalizeRichDocument(value).doc,result=new Map();
 function walk(node){for(const mark of node.marks||[])if(mark.type==='comment'||mark.type==='footnote'){let item=result.get(mark.attrs.id);if(!item){item={type:mark.type,...mark.attrs,quote:''};result.set(mark.attrs.id,item);}item.quote+=node.text||'';}for(const child of node.content||[])walk(child);}
 walk(doc);return [...result.values()];
}
function notePlan(doc){const notes=new Map(),remaining=new Map();function walk(node){for(const mark of node.marks||[])if(mark.type==='footnote'){if(!notes.has(mark.attrs.id))notes.set(mark.attrs.id,{...mark.attrs,number:notes.size+1});remaining.set(mark.attrs.id,(remaining.get(mark.attrs.id)||0)+1);}for(const child of node.content||[])walk(child);}walk(doc);return {notes,remaining};}
function noteSuffix(node,plan,render){let result='';for(const mark of node.marks||[])if(mark.type==='footnote'){const id=mark.attrs.id,left=plan.remaining.get(id)-1;plan.remaining.set(id,left);if(!left)result+=render(plan.notes.get(id));}return result;}
export function richPublishedText(value){
 const normalized=normalizeRichDocument(value),plan=notePlan(normalized.doc);
 function walk(node){if(node.type==='text')return node.text+noteSuffix(node,plan,n=>'['+n.number+']');if(node.type==='hard_break'||node.type==='horizontal_rule')return '\n';return (node.content||[]).map(walk).join(['paragraph','heading','code_block'].includes(node.type)?'':'\n');}
 const body=walk(normalized.doc);return body+(plan.notes.size?'\n\nNotas\n'+[...plan.notes.values()].map(n=>'['+n.number+'] '+n.body).join('\n'):'');
}
export function richHtml(value,{prefix='note'}={}){
 const normalized=normalizeRichDocument(value),plan=notePlan(normalized.doc);prefix=escape(prefix);
 function render(node){
  if(node.type==='text'){let output=escape(node.text);for(const mark of node.marks||[]){const tags={strong:'strong',em:'em',code:'code',underline:'u',strike:'s'};if(mark.type==='link')output='<a href="'+escape(mark.attrs.href)+'"'+(mark.attrs.title?' title="'+escape(mark.attrs.title)+'"':'')+'>'+output+'</a>';else if(tags[mark.type])output='<'+tags[mark.type]+'>'+output+'</'+tags[mark.type]+'>';}return output+noteSuffix(node,plan,n=>'<sup><a href="#'+prefix+'-'+n.id+'" role="doc-noteref">['+n.number+']</a></sup>');}
  if(node.type==='hard_break')return '<br/>';if(node.type==='horizontal_rule')return '<hr/>';
  const body=(node.content||[]).map(render).join('');if(node.type==='doc')return body;
  if(node.type==='code_block')return '<pre><code>'+body+'</code></pre>';
  const tag={paragraph:'p',heading:'h'+node.attrs?.level,blockquote:'blockquote',bullet_list:'ul',ordered_list:'ol',list_item:'li'}[node.type];
  return '<'+tag+(node.type==='ordered_list'?' start="'+(node.attrs?.order||1)+'"':'')+'>'+body+'</'+tag+'>';
 }return render(normalized.doc)+(plan.notes.size?'<section role="doc-endnotes"><h3>Notas</h3><ol>'+[...plan.notes.values()].map(n=>'<li id="'+prefix+'-'+n.id+'">'+escape(n.body)+'</li>').join('')+'</ol></section>':'');
}
export function richMarkdown(value){
 const normalized=normalizeRichDocument(value),plan=notePlan(normalized.doc);
 const fence=text=>'`'.repeat(Math.max(3,...[...text.matchAll(/`+/g)].map(m=>m[0].length+1)));
 function render(node){
  if(node.type==='text'){
   const code=(node.marks||[]).some(m=>m.type==='code');let text;
   if(code){const delimiter='`'.repeat(Math.max(1,...[...node.text.matchAll(/`+/g)].map(m=>m[0].length+1)));text=delimiter+' '+node.text+' '+delimiter;}
   else text=node.text.replace(/[\\`*_\[\]<>~]/g,'\\$&');
   for(const mark of node.marks||[]){if(mark.type==='strong')text='**'+text+'**';if(mark.type==='em')text='*'+text+'*';if(mark.type==='underline')text='<u>'+text+'</u>';if(mark.type==='strike')text='~~'+text+'~~';if(mark.type==='link')text='['+text+']('+mark.attrs.href.replace(/[()\\]/g,'\\$&')+')';}return text+noteSuffix(node,plan,n=>'[^'+n.id+']');
  }
  if(node.type==='hard_break')return '  \n';if(node.type==='horizontal_rule')return '---\n\n';
  if(node.type==='code_block'){const text=(node.content||[]).map(n=>n.text).join(''),delimiter=fence(text);return delimiter+'\n'+text+'\n'+delimiter+'\n\n';}
  if(node.type==='bullet_list'||node.type==='ordered_list')return (node.content||[]).map((item,i)=>{const marker=node.type==='bullet_list'?'- ':String((node.attrs?.order||1)+i)+'. ';return render(item).trimEnd().split('\n').map((line,index)=>(index?' '.repeat(marker.length):marker)+line).join('\n');}).join('\n')+'\n\n';
  const body=(node.content||[]).map(render).join('');if(node.type==='heading')return '#'.repeat(node.attrs?.level||1)+' '+body+'\n\n';if(node.type==='paragraph')return body+'\n\n';if(node.type==='blockquote')return body.trimEnd().split('\n').map(line=>'> '+line).join('\n')+'\n\n';return body;
 }return render(normalized.doc).trimEnd()+(plan.notes.size?'\n\n'+[...plan.notes.values()].map(n=>'[^'+n.id+']: '+n.body.replace(/[\\`*_\[\]<>~]/g,'\\$&').replace(/\n/g,'\n    ')).join('\n'):'')+'\n';
}
