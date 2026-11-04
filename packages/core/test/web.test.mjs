import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeProject,addNode} from '../src/core.mjs';

async function browser({fail=false,libraryEntries=[],oldServer=false,readingPreference}={}){
 const p=makeProject(),id=addNode(p,p.roots.draft,'Cena'),calls=[],elements=new Map(),alerts=[],storage=new Map();
 if(readingPreference!==undefined)storage.set('writingroom.reading-size',readingPreference);
 p.document_hashes={[id]:createHash('sha256').update('').digest('hex')};
 const element=()=>({value:'',textContent:'',classList:{toggle(){},add(){},remove(){}},children:[],replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},append(...children){this.children.push(...children);},style:{setProperty(name,value){this[name]=value;}},showModal(){this.open=true;},close(){this.open=false;}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const source=(await readFile(new URL('../../../apps/web/app.js',import.meta.url),'utf8')).replace('library().catch(report);','');
 const context=vm.createContext({...(oldServer?{location:'http://127.0.0.1:4173'}:{}),localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},document:{getElementById:get,createElement:element,createTextNode:text=>({textContent:text}),body:element()},window:{addEventListener(){}},setTimeout,clearTimeout,alert(message){alerts.push(message);},prompt:()=> 'Versão de teste',confirm:()=>true,fetch:async(url,options)=>{
  calls.push({url,payload:options.body&&JSON.parse(options.body)});
  const error=fail&&url.endsWith('/text');return {ok:!error,text:async()=>JSON.stringify(error?{error:'Disco indisponível'}:(url==='/api/projects'?libraryEntries:url===`/api/projects/${p.id}`?p:url.endsWith('/text')?{hash:createHash('sha256').update(JSON.parse(options.body).text).digest('hex')}:{ok:true})),headers:{get:()=> 'application/json'}};
 }});
 vm.runInContext(source+'\nglobalThis.harness={set(p,id){project=p;selected=id;renderEditor();},flush,saveText,select,library};',context);
 context.harness.set(p,id);return {p,id,calls,get,alerts,storage,h:context.harness};
}
test('snapshot aguarda debounce e salva texto antes de criar versão nomeada',async()=>{
 const {get,calls,id}=await browser();get('editor').value='Última frase 🌱';get('editor').oninput();
 await get('snapshotBtn').onclick();assert.equal(calls.length,2);
 assert.ok(calls[0].url.endsWith('/text'));assert.equal(calls[0].payload.text,'Última frase 🌱');
 assert.ok(calls[1].url.endsWith('/snapshot'));assert.equal(calls[1].payload.id,id);assert.equal(calls[1].payload.label,'Versão de teste');
});
test('voltar à biblioteca aguarda envio do texto pendente',async()=>{
 const {get,calls}=await browser();get('editor').value='Não perder';get('editor').oninput();await get('backBtn').onclick();
 assert.ok(calls[0].url.endsWith('/text'));assert.equal(calls[1].url,'/api/projects');
});
test('falha de salvamento bloqueia saída e mantém texto disponível',async()=>{
 const {get,calls}=await browser({fail:true});get('editor').value='Recuperável';get('editor').oninput();await get('backBtn').onclick();
 assert.equal(calls.length,1);assert.equal(get('editor').value,'Recuperável');assert.match(get('saveStatus').textContent,/sem confirmação/);
});
test('troca de cena salva no ID original antes de mudar o editor',async()=>{
 const {get,calls,h,p,id}=await browser();const other=addNode(p,p.roots.draft,'Outra');get('editor').value='Cena original';get('editor').oninput();await h.select(other);
 assert.equal(calls[0].payload.id,id);assert.equal(calls[0].payload.text,'Cena original');assert.equal(get('editor').value,'');
});

test('lista de versões mostra conteúdo literal e não altera documento',async()=>{
 const {get,p,id}=await browser();p.snapshots.push({id:'version-1',node_id:id,label:'Marco',created_at:'2026-11-02T12:00:00Z',content:'<script>texto literal</script>'});
 const before=structuredClone(p);await get('versionsBtn').onclick();assert.equal(get('versionsDialog').open,true);assert.equal(get('versionsList').children[0].children[1].textContent,'<script>texto literal</script>');assert.deepEqual(p,before);
});

test('salvamentos enfileirados usam o último hash confirmado, não o hash de texto local',async()=>{
 const {get,h,calls,p,id}=await browser();const initial=p.document_hashes[id];
 get('editor').value='Primeiro';h.saveText();get('editor').value='Segundo';h.saveText();await h.flush();
 const first=createHash('sha256').update('Primeiro').digest('hex'),second=createHash('sha256').update('Segundo').digest('hex');
 assert.equal(calls[0].payload.base_hash,initial);assert.equal(calls[1].payload.base_hash,first);assert.equal(p.document_hashes[id],second);assert.equal(get('editor').value,'Segundo');
});
test('falha interrompe textos já enfileirados e mantém a última edição para cópia',async()=>{
 const {get,h,calls}=await browser({fail:true});get('editor').value='Primeiro';h.saveText();get('editor').value='Última edição';h.saveText();
 await assert.rejects(h.flush(),/sem confirmação/);assert.equal(calls.length,1);assert.equal(get('editor').value,'Última edição');
});

test('biblioteca mantém projeto indisponível visível com orientação, sem tentar abri-lo',async()=>{
 const {get,h,calls,alerts}=await browser({libraryEntries:[{id:'broken',name:'Projeto indisponível',state:'unavailable',error:'Preserve a pasta original.'}]});
 await h.library();const button=get('bookList').children[0];assert.match(button.textContent,/Precisa de atenção/);button.onclick();
 assert.equal(alerts[0],'Preserve a pasta original.');assert.equal(calls.length,1);
});

test('cartões, leitura e publicação usam a mesma cena após flush pendente',async()=>{
 const {get,p,id,calls}=await browser();p.nodes.find(n=>n.id===id).notes='Notas que não devem ser publicadas';
 get('editor').value='Cena compartilhada 🌱';get('editor').oninput();await get('storyTab').onclick();
 assert.equal(calls[0].payload.id,id);assert.equal(get('cards').children[0].children[1].textContent,'Cena');
 await get('readTab').onclick();assert.equal(get('manuscript').children[0].children[1].textContent,'Cena compartilhada 🌱');
 await get('publishTab').onclick();const section=get('publishPreview').children.find(n=>n.children?.length===2&&n.children[0]?.textContent==='Cena');assert.equal(section.children[1].textContent,'Cena compartilhada 🌱');
});
test('rascunho local guarda última edição em falha e só é removido após confirmação',async()=>{
 const normal=await browser();normal.get('editor').value='Texto confirmado';normal.get('editor').oninput();assert.equal(normal.storage.size,1);await normal.h.flush();assert.equal(normal.storage.size,0);
 const failed=await browser({fail:true});failed.get('editor').value='Edição não confirmada';failed.get('editor').oninput();await assert.rejects(failed.h.flush());assert.equal(failed.storage.size,1);assert.match([...failed.storage.values()][0],/Edição não confirmada/);
});

test('servidor antigo bloqueia ações novas em vez de confirmar metadados ignorados',async()=>{
 const {get,calls,alerts}=await browser({oldServer:true});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(get('library').inert,true);await get('newProjectBtn').onclick();assert.ok(alerts.some(text=>text.includes('Reinicie o servidor')));assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/status');
});

test('preferência de leitura inválida usa padrão e não dispara gravação autoral',async()=>{
 const {get,calls}=await browser({readingPreference:'999px;display:none'});
 assert.equal(get('readingSize').value,'18');assert.equal(get('readView').style['--reading-size'],'18px');assert.equal(calls.length,0);
});
test('tamanho de leitura persiste no navegador sem salvar projeto ou mudar editor',async()=>{
 const {get,calls,storage}=await browser();const previous=get('editor').value;
 get('readingSize').value='24';get('readingSize').onchange();
 assert.equal(storage.get('writingroom.reading-size'),'24');assert.equal(get('readView').style['--reading-size'],'24px');
 assert.equal(get('editor').value,previous);assert.equal(calls.length,0);
});
