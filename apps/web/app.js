const $=id=>document.getElementById(id);
const entityNames={character:'Personagem',location:'Lugar',object:'Objeto',organization:'Organização',event:'Evento',concept:'Conceito'};
const states={todo:'A fazer',draft:'Rascunho',review:'Revisão',done:'Concluído'};
const colors={sage:'#769369',amber:'#bd964e',rose:'#bd7b82',blue:'#7197ac',violet:'#9a86b5'};
let project=null,selected=null,timer=null,saveQueue=Promise.resolve(),pending=0,saveFailed=false;
let view='write',storyMode='cards',busy=false,sessionStart=0,importData=null,lastFailedKind=null,conflictRemote=null,recoveredDraft=null,metadataFailed=false,serverCompatible=true;
let notebookMode='entities',scratchTimer=null,scratchDirty=false,replacePlan=null,replaceSelected=new Set();
let backupCenterData=null;
let profileBaseHash=null,sourceEditing=null;
let settingsTarget=null,closedFolders=new Set(),pointerDrag=null,organizationUndo=null;
let richModule=null,richModulePromise=null,richController=null,richMountKey=null;
const readLocal=key=>{try{return globalThis.localStorage?.getItem(key)??null;}catch{return null;}};
const writeLocal=(key,value)=>{try{globalThis.localStorage?.setItem(key,value);return true;}catch{return false;}};
const removeLocal=key=>{try{globalThis.localStorage?.removeItem(key);}catch{}};
const draftKey=(projectId,id)=>`writingroom.draft.${projectId}.${id}`;
const count=text=>(text?.match(/\S+/gu)||[]).length;
function el(tag,text,className){const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(className)item.className=className;return item;}
function status(message){$('saveStatus').textContent=message;}
function report(error){status(error.message||String(error));if(!saveFailed)alert(error.message||String(error));}
async function api(endpoint='',method='GET',payload){
 const response=await fetch('/api/'+endpoint,{method,headers:{'content-type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 if(!response.ok){const error=new Error(data?.error||'Não foi possível concluir a operação.');error.status=response.status;throw error;}
 if(project&&endpoint.startsWith('projects/'+project.id+'/')&&Array.isArray(data?.translation_review_states))for(const change of data.translation_review_states){const n=node(change.id);if(n)n.status=change.status;}
 return response.headers.get('content-type')?.includes('json')?data:text;
}
function queueSave(action,kind='metadata'){
 pending++;status('Salvando…');
 const task=saveQueue.then(action).then(()=>{if(!saveFailed&&!timer&&pending===1)status('✓ Salvo no projeto');}).catch(error=>{
  saveFailed=true;lastFailedKind=kind;if(kind==='metadata')metadataFailed=true;status(error.message||'Falha ao salvar. Sua edição permanece nesta página.');
  $('retryBtn').classList.remove('hidden');$('recoveryDownloadBtn').classList.remove('hidden');
 }).finally(()=>{pending--;});
 saveQueue=task;return task;
}
async function flush(){
 if(isVisual()&&richController?.composing)throw new Error('Conclua a composição do texto antes de trocar de documento.');
 do{if(timer){clearTimeout(timer);timer=null;saveText();}if(scratchTimer||scratchDirty){clearTimeout(scratchTimer);scratchTimer=null;saveScratchpad();}await saveQueue;}while(timer||scratchTimer||scratchDirty||pending);
 if(saveFailed)throw new Error('Há alterações sem confirmação. Use a recuperação antes de sair.');
}
async function perform(action){
 if(!serverCompatible){report(new Error('Reinicie o servidor e recarregue a página para usar esta versão.'));return;}
 if(busy)return;busy=true;$('workspace').inert=true;
 try{return await action();}catch(error){report(error);}finally{busy=false;$('workspace').inert=!serverCompatible;}
}
function bind(id,action,transition=true){$(id).onclick=()=>transition?perform(action):Promise.resolve().then(action).catch(report);}
function node(id){return project?.nodes.find(n=>n.id===id);}
function nodes(parent){return project.nodes.filter(n=>n.parent_id===parent).sort((a,b)=>a.sort_key-b.sort_key);}
function trashed(n){while(n){if(n.id===project.roots.trash||n.deleted)return true;n=node(n.parent_id);}return false;}
function activeNodes(){return project.nodes.filter(n=>!trashed(n));}
function ordered(parent=project.roots.draft,depth=0,out=[]){for(const n of nodes(parent)){if(trashed(n))continue;out.push({...n,depth});if(n.kind==='folder')ordered(n.id,depth+1,out);}return out;}
function compiled(){
 const result=[];function visit(parent,enabled=true){for(const n of nodes(parent)){const include=enabled&&n.include_in_compile&&!trashed(n);if(n.kind==='text'&&include)result.push(n);if(n.kind==='folder')visit(n.id,include);}}visit(project.roots.draft);return result;
}
function pathOf(n){const titles=[];let parent=node(n.parent_id);while(parent){titles.unshift(parent.title);parent=node(parent.parent_id);}return titles.join(' / ');}
function folderOptions(select,current,exclude){
 select.replaceChildren();for(const n of activeNodes().filter(n=>n.kind==='folder')){
  let parent=n,invalid=false;while(parent){if(parent.id===exclude)invalid=true;parent=node(parent.parent_id);}if(invalid)continue;
  const option=el('option',pathOf(n)?pathOf(n)+' / '+n.title:n.title);option.value=n.id;select.appendChild(option);
 }
 select.value=current||project.roots.draft;if(!select.value)select.value=project.roots.draft;
}
function renderTree(){
 const tree=$('tree');tree.replaceChildren();
 function append(parent,depth){for(const n of nodes(parent)){if(trashed(n))continue;
  const row=el('div',undefined,'tree-row'),button=el('button',undefined,'tree-item'+(selected===n.id?' active':''));button.style.paddingLeft=(10+depth*14)+'px';
  const handle=el('span','⋮⋮','drag-handle');handle.draggable=false;handle.title='Arrastar '+n.title;button.append(handle,el('span',n.kind==='folder'?'▸':'▤','mini'),el('span',n.title));button.title=pathOf(n)+' / '+n.title;button.onclick=()=>perform(()=>select(n.id));wireOrganization(button,n);row.append(button);
  if(n.kind==='folder'){const toggle=el('button',closedFolders.has(n.id)?'+':'−','folder-toggle');toggle.setAttribute?.('aria-label',(closedFolders.has(n.id)?'Expandir ':'Recolher ')+n.title);toggle.setAttribute?.('aria-expanded',String(!closedFolders.has(n.id)));toggle.onclick=()=>{if(closedFolders.has(n.id))closedFolders.delete(n.id);else closedFolders.add(n.id);saveFolderState();renderTree();};row.append(toggle);}
  row.append(documentActions(n));tree.appendChild(row);if(n.kind==='folder'&&!closedFolders.has(n.id))append(n.id,depth+1);
 }}
 for(const key of ['draft','research']){const n=node(project.roots[key]),button=el('button',(key==='draft'?'▥  ':'⌕  ')+n.title,'tree-group');button.onclick=()=>perform(async()=>{await flush();selected=n.id;view='story';$('storyScope').value=n.id;renderAll();});wireOrganization(button,n);tree.appendChild(button);append(n.id,0);}
}
function saveFolderState(){if(project)writeLocal('writingroom.folders.'+project.id,JSON.stringify([...closedFolders]));}
function revealNode(id){let current=node(id);while(current){closedFolders.delete(current.parent_id);current=node(current.parent_id);}saveFolderState();}
function actionMenu(label,items){const menu=el('details',undefined,'action-menu'),summary=el('summary','⋯');summary.setAttribute?.('aria-label',label);summary.title=label;menu.append(summary);const panel=el('div',undefined,'action-menu-panel');for(const [text,action] of items){const button=el('button',text);button.onclick=()=>perform(async()=>{menu.open=false;await action();});panel.append(button);}menu.append(panel);menu.ontoggle=()=>{if(!menu.open)return;for(const other of document.querySelectorAll?.('.action-menu[open]')||[])if(other!==menu)other.open=false;const rect=summary.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(rect.left,(globalThis.innerWidth||1280)-240))+'px';panel.style.top=Math.max(8,Math.min(rect.bottom+4,(globalThis.innerHeight||900)-panel.getBoundingClientRect().height-8))+'px';};return menu;}
function documentActions(n){
 return actionMenu('Ações de '+n.title,[['Abrir / editar',()=>select(n.id)],['Renomear',async()=>{await flush();const title=prompt('Novo título',node(n.id).title);if(title?.trim()){await api(`projects/${project.id}/metadata`,'POST',{id:n.id,patch:{title:title.trim()}});await refresh();}}],['Duplicar',async()=>{await flush();const result=await api(`projects/${project.id}/duplicate-node`,'POST',{id:n.id});selected=result.id;revealNode(selected);await refresh();status('Cópia criada; origem preservada.');}],['Mover…',async()=>{await select(n.id);folderOptions($('moveParent'),node(n.id).parent_id,n.id);$('moveDialog').showModal();}],['Subir',()=>shift(-1,n.id)],['Descer',()=>shift(1,n.id)],['Mover à lixeira',async()=>{await flush();if(!confirm('Mover “'+n.title+'” para a lixeira? É possível restaurar.'))return;await api(`projects/${project.id}/trash`,'POST',{id:n.id});if(selected===n.id)selected=null;await refresh();}]]);
}
function clearPointerOrganization(){
 const drag=pointerDrag;pointerDrag=null;drag?.ghost?.remove();for(const target of document.querySelectorAll?.('[data-drop]')||[])target.removeAttribute('data-drop');
 if(drag?.handle.hasPointerCapture?.(drag.pointer))drag.handle.releasePointerCapture(drag.pointer);
}
function organizationTarget(x,y,source){
 const element=document.elementFromPoint(x,y)?.closest('[data-node-id]');if(!element)return null;const n=node(element.getAttribute('data-node-id'));if(!n||n.id===source)return null;
 const box=element.getBoundingClientRect(),fraction=(y-box.top)/Math.max(1,box.height),placement=Object.values(project.roots).includes(n.id)?'inside':n.kind==='folder'&&fraction>.3&&fraction<.7?'inside':fraction<.5?'before':'after';return {element,id:n.id,placement};
}
function wireOrganization(element,n){
 element.setAttribute?.('data-node-id',n.id);
 element.onpointerdown=event=>{
  const handle=event.target.closest?.('.drag-handle');if(!handle||event.button!==0||busy||Object.values(project.roots).includes(n.id))return;
  event.preventDefault();clearPointerOrganization();for(const menu of document.querySelectorAll?.('.action-menu[open]')||[])menu.open=false;
  pointerDrag={id:n.id,project:project.id,handle,pointer:event.pointerId,x:event.clientX,y:event.clientY,active:false};handle.setPointerCapture(event.pointerId);
 };
 element.onpointermove=event=>{
  const drag=pointerDrag;if(!drag||drag.pointer!==event.pointerId)return;if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5)return;
  event.preventDefault();drag.active=true;
  if(!drag.ghost){drag.ghost=el('div',n.title,'pointer-ghost');document.body.append(drag.ghost);}drag.ghost.style.left=event.clientX+12+'px';drag.ghost.style.top=event.clientY+12+'px';
  for(const target of document.querySelectorAll('[data-drop]'))target.removeAttribute('data-drop');const target=organizationTarget(event.clientX,event.clientY,drag.id);target?.element.setAttribute('data-drop',target.placement);
  const scroller=target?.element.closest('#tree,.room');if(scroller){const box=scroller.getBoundingClientRect();if(event.clientY>box.bottom-25)scroller.scrollTop+=8;else if(event.clientY<box.top+25)scroller.scrollTop-=8;}
 };
 element.onpointerup=event=>{
  const drag=pointerDrag;if(!drag||drag.pointer!==event.pointerId)return;const target=drag.active&&organizationTarget(event.clientX,event.clientY,drag.id);clearPointerOrganization();
  if(!target||drag.project!==project.id)return;event.preventDefault();perform(()=>organize(drag.id,target.id,target.placement));
 };
 element.onpointercancel=clearPointerOrganization;element.onlostpointercapture=()=>{if(pointerDrag?.id===n.id)clearPointerOrganization();};
}
function updateStats(){
 if(!project)return;const n=node(selected),words=count(n?.kind==='text'?project.documents[selected]:'');
 $('wordCount').textContent=words.toLocaleString('pt-BR')+' palavras · '+(project.documents[selected]?.length||0).toLocaleString('pt-BR')+' caracteres';
 const total=compiled().reduce((sum,n)=>sum+count(project.documents[n.id]),0),target=project.settings?.target_words||0;
 $('projectStats').textContent='Livro: '+total.toLocaleString('pt-BR')+(target?' / '+target.toLocaleString('pt-BR'):'')+' palavras';
 const delta=total-sessionStart;$('sessionStats').textContent='Sessão: '+(delta>=0?'+':'')+delta.toLocaleString('pt-BR');
 const goal=n?.target_words||0;$('sceneProgress').value=goal?Math.min(100,words/goal*100):0;$('sceneGoalText').textContent=goal?words+' de '+goal+' palavras · '+Math.round(words/goal*100)+'%':'Defina uma meta se quiser.';
}
function renderReference(){
 const select=$('referenceSelect'),previous=select.value;select.replaceChildren();
 for(const n of activeNodes().filter(n=>n.kind==='text')){const option=el('option',n.title);option.value=n.id;select.appendChild(option);}
 const pair=translationPairsLocal().find(p=>p.target?.id===selected);
 select.value=pair?.source.id||(previous&&node(previous)&&!trashed(node(previous))?previous:activeNodes().find(n=>n.kind==='text'&&n.id!==selected)?.id||selected||'');
 $('writingLayout').classList.toggle('translating',!!pair);if(pair){$('referencePanel').classList.remove('hidden');$('referenceBtn').setAttribute?.('aria-expanded','true');}$('referenceText').lang=pair?.from||'';
 $('referenceText').textContent=project.documents[select.value]||'Escolha um documento para consultar.';
}
function renderEditor(){
 $('reviewPanel').classList.toggle('hidden',!isVisual());
 if(!project)return;const n=node(selected),editable=n?.kind==='text',asset=project.attachments?.find(a=>a.node_id===selected);renderAttachment(asset);
 $('documentTitle').disabled=!n;$('documentTitle').value=n?.title||'';$('editor').value=editable?(project.documents[n.id]||''):'';
 $('writingLayout').classList.toggle('hidden',!editable);$('editor').classList.toggle('hidden',!editable||isVisual());$('richEditor').classList.toggle('hidden',!editable||!isVisual());$('richTools').classList.toggle('hidden',!isVisual());$('enableRichBtn').classList.toggle('hidden',isVisual());$('disableRichBtn').classList.toggle('hidden',!isVisual());$('editorModeLabel').textContent=isVisual()?'EDITOR VISUAL':'TEXTO / MARKDOWN';$('writingTools').classList.toggle('hidden',!editable);$('noSelection').classList.toggle('hidden',editable||!!asset);
 for(const [id,key] of [['synopsis','synopsis'],['notes','notes'],['status','status'],['label','label'],['sceneGoal','target_words']]){$(id).value=n?.[key]??(key==='status'?'todo':key==='target_words'?0:'');$(id).disabled=!n;}
 $('keywords').value=(n?.keywords||[]).join(', ');$('keywords').disabled=!n;$('include').checked=!!n?.include_in_compile;$('include').disabled=!n||!!asset||!!n?.source;
 for(const id of ['proposeReviewBtn','snapshotBtn','versionsBtn','splitBtn','boldBtn','italicBtn','headingBtn','quoteBtn'])$(id).disabled=!editable;
 $('splitBtn').disabled=!editable||isVisual();$('splitBtn').title=isVisual()?'Divisão estrutural de cena visual ainda não disponível':'Dividir a cena no cursor';$('typewriterBtn').disabled=isVisual();
 const protectedRoot=n&&Object.values(project.roots).includes(n.id);for(const id of ['moveBtn','upBtn','downBtn','deleteBtn'])$(id).disabled=!n||protectedRoot;
 $('breadcrumb').textContent=n?pathOf(n).toUpperCase():'MANUSCRITO';$('inspectorType').textContent=n?.source?'Fonte de pesquisa':n?.entity_type?entityNames[n.entity_type]:asset?'Anexo de pesquisa':n?.kind==='folder'?'Pasta':'Cena';
 const scenes=ordered().filter(n=>n.kind==='text'),index=scenes.findIndex(n=>n.id===selected);$('scenePosition').textContent=index>=0?(index+1)+' / '+scenes.length+' cenas':'';
 const language=translationLanguage(selected)||project.settings?.language||'pt-BR';$('editor').lang=language==='none'?'':language;$('editor').spellcheck=language!=='none';
 recoveredDraft=null;try{recoveredDraft=JSON.parse(readLocal(draftKey(project.id,selected))||'null');}catch{}
 if(recoveredDraft&&typeof recoveredDraft.text!=='string')recoveredDraft=null;
 const draftMatches=recoveredDraft&&recoveredDraft.text===project.documents[selected]&&JSON.stringify(recoveredDraft.rich_document??null)===JSON.stringify(project.rich_documents?.[selected]??null);
 $('draftNotice').classList.toggle('hidden',!editable||!recoveredDraft||draftMatches);
 if(editable&&isVisual())mountVisual();
 updateStats();renderReference();renderSourceRelations();
}
function renderStory(){
 folderOptions($('storyScope'),$('storyScope').value||project.roots.draft);
 const scope=$('storyScope').value||project.roots.draft,filter=$('storyFilter').value;
 const list=ordered(scope).filter(n=>!filter||n.status===filter);$('storyCount').textContent=list.length+' documentos';
 $('cards').classList.toggle('hidden',storyMode!=='cards');$('outline').classList.toggle('hidden',storyMode!=='outline');
 $('cardsBtn').classList.toggle('active',storyMode==='cards');$('outlineBtn').classList.toggle('active',storyMode==='outline');
 const cards=$('cards');cards.replaceChildren();
 for(const n of list){
  const card=el('article',undefined,'scene-card'+(selected===n.id?' selected':''));card.style.setProperty?.('--label',colors[n.label]||'var(--accent)');wireOrganization(card,n);const handle=el('span','⋮⋮','drag-handle');handle.draggable=false;
  card.append(el('span',pathOf(n),'card-path'),el('h2',n.title),el('p',n.synopsis||'Adicione uma sinopse para enxergar o papel deste documento.'));card.append(handle);
  const meta=el('div',undefined,'card-meta');meta.append(el('span',states[n.status]||n.status,'badge'),el('span',n.kind==='folder'?'Pasta':count(project.documents[n.id])+' palavras'));card.appendChild(meta);
  const actions=el('div',undefined,'card-actions'),open=el('button',n.kind==='folder'?'Abrir pasta':'Escrever'),inspect=el('button','Notas'),up=el('button','↑'),down=el('button','↓');
  open.onclick=()=>perform(async()=>{if(n.kind==='folder'){await flush();$('storyScope').value=n.id;selected=n.id;renderAll();}else await select(n.id);});
  inspect.onclick=()=>perform(async()=>{await flush();selected=n.id;renderTree();renderEditor();renderStory();document.body.classList.add('show-inspector');});
  up.title='Mover acima';down.title='Mover abaixo';up.onclick=()=>perform(()=>shift(-1,n.id));down.onclick=()=>perform(()=>shift(1,n.id));actions.append(open,inspect,up,down,documentActions(n));card.appendChild(actions);cards.appendChild(card);
 }
 if(!list.length)cards.appendChild(el('p','Nenhum documento neste filtro. Crie uma cena ou escolha outra pasta.','empty'));
 const outline=$('outline');outline.replaceChildren();const table=el('table'),head=el('thead'),row=el('tr');for(const title of ['Documento','Sinopse','Estado','Palavras','Publicar','Ordem'])row.appendChild(el('th',title));head.appendChild(row);table.appendChild(head);const body=el('tbody');
 for(const n of list){const row=el('tr');wireOrganization(row,n);const title=el('td'),handle=el('span','⋮⋮','drag-handle');handle.draggable=false;title.append(handle);const button=el('button',(n.kind==='folder'?'▸ ':'')+n.title);button.style.marginLeft=(n.depth*12)+'px';button.onclick=()=>perform(()=>select(n.id));title.appendChild(button);row.appendChild(title);
  row.append(el('td',n.synopsis||'—','synopsis-cell'),el('td',states[n.status]||n.status),el('td',n.kind==='text'?String(count(project.documents[n.id])):'—'));
  const included=el('td'),check=el('input');check.type='checkbox';check.checked=n.include_in_compile;check.disabled=!!n.source||!!project.attachments?.some(a=>a.node_id===n.id);check.setAttribute?.('aria-label','Incluir '+n.title+' na publicação');check.onchange=()=>patchNode(n.id,{include_in_compile:check.checked});included.appendChild(check);row.appendChild(included);
  const order=el('td');for(const [delta,label] of [[-1,'↑'],[1,'↓']]){const b=el('button',label);b.onclick=()=>perform(()=>shift(delta,n.id));order.appendChild(b);}order.append(documentActions(n));row.appendChild(order);body.appendChild(row);
 }table.appendChild(body);outline.appendChild(table);
}
function renderManuscript(container,publishing=false){
 container.replaceChildren();const docs=compiled(),previews=[];
 if(publishing){container.append(el('span','MANUSCRITO','eyebrow'),el('h1',project.name));if(project.settings?.author)container.appendChild(el('p',project.settings.author));
  const toc=el('nav',undefined,'toc');toc.setAttribute?.('aria-label','Sumário');for(const n of docs){const a=el('a',n.title);a.href='#publish-'+n.id;toc.appendChild(a);}container.appendChild(toc);
 }
 for(const n of docs){const section=el('article');section.id=(publishing?'publish-':'read-')+n.id;section.appendChild(el('h2',n.title));if(project.rich_documents?.[n.id]){const body=el('div',undefined,'rich-preview');body.textContent=project.documents[n.id];section.appendChild(body);previews.push(renderVisualPreview(body,project.rich_documents[n.id]));}else section.appendChild(el('pre',project.documents[n.id]||(publishing?'':'Cena ainda sem texto.')));
  if(!publishing){wireOrganization(section,n);const handle=el('span','⋮⋮','drag-handle');handle.draggable=false;section.prepend?.(handle);const edit=el('button','Editar esta cena ↗');edit.onclick=()=>perform(()=>select(n.id));section.append(edit,documentActions(n));}container.appendChild(section);
 }
 if(!docs.length)container.appendChild(el('p','Não há cenas incluídas na publicação. Confira as opções do inspetor.','empty'));
 const words=docs.reduce((sum,n)=>sum+count(project.documents[n.id]),0);$('readStats').textContent=docs.length+' cenas · '+words.toLocaleString('pt-BR')+' palavras';
 const omitted=ordered().filter(n=>n.kind==='text'&&!docs.some(d=>d.id===n.id)),empty=docs.filter(n=>!project.documents[n.id]?.trim());
 $('compileReport').textContent=docs.length+' cenas incluídas · '+words.toLocaleString('pt-BR')+' palavras · '+omitted.length+' excluídas'+(empty.length?' · '+empty.length+' cenas vazias':'')+'. Notas privadas e pesquisa não entram no manuscrito. Notas de publicação aparecem ao fim da cena. A impressão usa a paginação do navegador.';
 return Promise.all(previews);
}
function renderView(){
 for(const name of ['write','story','notebook','read','publish','translation','review']){$(name+'View').classList.toggle('hidden',view!==name);const tab=$(name==='story'?'storyTab':name+'Tab');tab.classList.toggle('active',view===name);tab.setAttribute?.('aria-current',view===name?'page':'false');if(view===name&&globalThis.innerWidth<=650)tab.scrollIntoView?.({block:'nearest',inline:'nearest'});}
 if(view==='review')renderReviews();if(view==='translation')renderTranslations();if(view==='story')renderStory();if(view==='notebook')renderNotebook();if(view==='read')return renderManuscript($('manuscript'));if(view==='publish')return renderManuscript($('publishPreview'),true);
}
function renderAll(){if(!project)return;$('undoOrganizationBtn').disabled=!organizationUndo||organizationUndo.project!==project.id||organizationUndo.hash!==project.structure_hash;$('projectName').textContent=project.name;renderTree();renderEditor();renderView();}
async function refresh(){project=await api('projects/'+project.id);renderAll();}
async function select(id){await flush();$('writingLayout').classList.remove('translating');selected=id;revealNode(id);view='write';document.body.classList.remove('show-tree');renderAll();}
async function library(){
 clearPointerOrganization();
 if(richController){richController.destroy();richController=null;richMountKey=null;}
 selected=null;project=null;$('workspace').classList.add('hidden');$('library').classList.remove('hidden');$('projectName').textContent='Seu espaço para escrever';
 organizationUndo=null;const archived=$('libraryFilter').value==='archived',list=await api('projects'+(archived?'?archived=1':''));$('bookList').replaceChildren();$('libraryCount').textContent=list.length+(archived?' projetos arquivados':' projetos');$('libraryEmpty').classList.toggle('hidden',list.length>0||archived);await renderEditorialDashboard(archived);
 for(const p of list){const tile=el('article',undefined,'book-tile'),button=el('button',undefined,'book');
  if(p.state==='unavailable'){button.textContent=p.name+' — Precisa de atenção';button.onclick=()=>alert(p.error);$('bookList').appendChild(button);continue;}else{
   const cover=el('div',undefined,'book-cover');cover.append(el('span',archived?'WRITINGROOM / ARQUIVADO':'WRITINGROOM / PROJETO'),el('h3',p.name),el('span','UMA HISTÓRIA EM CONSTRUÇÃO'));
   const details=el('div',undefined,'book-details');details.append(el('span',archived?'Restaurar à biblioteca ↗':'Continuar escrevendo ↗'),el('span',new Date(p.updated_at).toLocaleDateString('pt-BR')));button.append(cover,details);button.onclick=()=>perform(async()=>{if(archived){await api(`projects/${p.id}/project-unarchive`,'POST',{});await library();status('Projeto restaurado à lista ativa.');}else await openProject(p.id);});tile.append(button);
   const items=archived?[['Restaurar à biblioteca',async()=>{await api(`projects/${p.id}/project-unarchive`,'POST',{});await library();}]]:[['Editar dados / renomear',()=>openProjectSettings(p.id)],['Duplicar',async()=>{const name=prompt('Nome da cópia',p.name+' (cópia)');if(!name?.trim())return;await api(`projects/${p.id}/project-duplicate`,'POST',{name:name.trim()});await library();status('Projeto duplicado sem alterar a origem.');}],['Baixar backup',async()=>{const backup=await api(`projects/${p.id}/backup`);download(JSON.stringify(backup,null,2),safeName(p.name)+'.wroom-backup.json','application/json');}],['Arquivar / remover da lista ativa',async()=>{if(!confirm('Arquivar “'+p.name+'”? Seus arquivos serão preservados e poderão ser restaurados em Arquivados.'))return;await api(`projects/${p.id}/project-archive`,'POST',{});await library();status('Projeto arquivado; arquivos preservados.');}]];tile.append(actionMenu('Ações do projeto '+p.name,items));
  }$('bookList').appendChild(tile);
 }
}
$('libraryFilter').onchange=()=>perform(library);
bind('undoOrganizationBtn',async()=>{if(!organizationUndo||organizationUndo.project!==project.id)return;await flush();await api(`projects/${project.id}/undo-organize`,'POST',{previous:organizationUndo.previous,base_hash:organizationUndo.hash});organizationUndo=null;await refresh();status('Movimentação desfeita.');});

async function openProject(id){
 project=await api('projects/'+id);organizationUndo=null;try{closedFolders=new Set(JSON.parse(readLocal('writingroom.folders.'+id)||'[]'));}catch{closedFolders=new Set();}$('library').classList.add('hidden');$('workspace').classList.remove('hidden');
 selected=ordered().find(n=>n.kind==='text')?.id||null;sessionStart=compiled().reduce((sum,n)=>sum+count(project.documents[n.id]),0);view=perspective==='editor'?'review':project.settings?.project_type==='translation'?'translation':'write';saveFailed=false;metadataFailed=false;scratchDirty=false;clearTimeout(scratchTimer);scratchTimer=null;
 folderOptions($('storyScope'),project.roots.draft);renderAll();status('Projeto aberto · pronto para escrever');
}
async function add(kind){
 await flush();const parent=selected&&node(selected)?.kind==='folder'?selected:node(selected)?.parent_id||project.roots.draft;
 const title=prompt('Título',kind==='folder'?'Novo capítulo':'Nova cena');if(!title?.trim())return;
 const result=await api(`projects/${project.id}/nodes`,'POST',{parent_id:parent,title,kind});selected=result.id;view='write';await refresh();
}
function saveText(){
 if(isVisual()){saveVisual();return;}
 if(!project||!selected||node(selected)?.kind!=='text')return;
 const current=project,id=selected,text=$('editor').value,projectId=current.id;current.documents[id]=text;
 queueSave(async()=>{
  if(saveFailed)throw new Error('Salvamento interrompido. Sua edição local foi preservada.');
  const result=await api(`projects/${projectId}/text`,'POST',{id,text,base_hash:current.document_hashes?.[id]});(current.document_hashes??={})[id]=result.hash;if(result.rich_hash)(current.rich_hashes??={})[id]=result.rich_hash;
  let local;try{local=JSON.parse(readLocal(draftKey(projectId,id))||'null');}catch{}
  if(local?.text===text&&!local.rich_document)removeLocal(draftKey(projectId,id));
 },'text');
}
function patchNode(id,patch){
 if(!project||!node(id))return;const current=project;Object.assign(node(id),patch);renderTree();updateStats();
 queueSave(async()=>{if(saveFailed)throw new Error('Há alterações pendentes. Preserve sua recuperação.');await api(`projects/${current.id}/metadata`,'POST',{id,patch});},'metadata');
 if(view==='review')renderReviews();if(view==='translation')renderTranslations();if(view==='story')renderStory();if(view==='notebook')renderNotebook();if(view==='read')return renderManuscript($('manuscript'));if(view==='publish')return renderManuscript($('publishPreview'),true);
}
function patch(p){if(selected)patchNode(selected,p);}
function download(text,name,type='text/plain;charset=utf-8'){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeName(name){return name.replace(/[^\w\p{L}-]+/gu,'-').slice(0,100)||'manuscrito';}
async function organize(id,target_id,placement){await flush();const result=await api(`projects/${project.id}/organize`,'POST',{id,target_id,placement,base_hash:project.structure_hash});organizationUndo={project:project.id,previous:result.previous,hash:result.structure_hash};selected=id;revealNode(id);await refresh();revealNode(id);renderTree();status('Organização salva. Você pode desfazer a última movimentação.');}
async function shift(delta,id=selected){
 await flush();if(!id)return;const n=node(id),siblings=nodes(n.parent_id),index=siblings.findIndex(n=>n.id===id)+delta;if(index<0||index>=siblings.length)return;
 await organize(id,siblings[index].id,delta<0?'before':'after');
}
function showVersionsDiff(container,oldText,newText){
 const before=oldText.split('\n'),after=newText.split('\n');let prefix=0,suffix=0;
 while(prefix<before.length&&prefix<after.length&&before[prefix]===after[prefix])prefix++;
 while(suffix<before.length-prefix&&suffix<after.length-prefix&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;
 container.replaceChildren();container.append(el('p','Comparação do trecho alterado: versão salva → texto atual.'));
 if(prefix===before.length&&prefix===after.length){container.appendChild(el('p','Os textos são iguais.'));return;}
 container.append(el('pre',before.slice(prefix,before.length-suffix).map(line=>'− '+line).join('\n'),'diff-removed'),el('pre',after.slice(prefix,after.length-suffix).map(line=>'+ '+line).join('\n'),'diff-added'));
}

bind('newProjectBtn',()=>{$('newProjectAuthor').value='';$('newProjectDialog').showModal();$('newProjectName').focus?.();});
bind('emptyCreateBtn',()=>{$('newProjectAuthor').value='';$('newProjectDialog').showModal();$('newProjectName').focus?.();});
$('newProjectForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{
 const name=$('newProjectName').value.trim();if(!name)return;const p=await api('projects','POST',{name,template:$('projectTemplate').value||'blank',preset:$('projectPreset').value||'general',author:$('newProjectAuthor').value});$('newProjectDialog').close();await openProject(p.id);
});};
bind('backBtn',async()=>{await flush();await library();});bind('newChapterBtn',()=>add('folder'));bind('newSceneBtn',()=>add('text'));bind('emptySceneBtn',()=>add('text'));
$('editor').oninput=()=>{
 if(!project||!selected)return;project.documents[selected]=$('editor').value;updateStats();status('Alterações pendentes');
 const copied=writeLocal(draftKey(project.id,selected),JSON.stringify({text:$('editor').value,base_hash:project.document_hashes?.[selected],updated_at:new Date().toISOString()}));
 if(!copied&&globalThis.localStorage)status('Cópia local indisponível; aguardando gravação no projeto.');
 clearTimeout(timer);timer=setTimeout(()=>{timer=null;saveText();},650);
 if($('typewriterBtn').getAttribute?.('aria-pressed')==='true'){
  const lines=$('editor').value.slice(0,$('editor').selectionStart).split('\n').length;$('editor').scrollTop=Math.max(0,(lines-1)*Number($('fontSize').value||19)*1.9-$('editor').clientHeight/2);
 }
};
$('documentTitle').onchange=()=>{if(!$('documentTitle').value.trim()){renderEditor();return;}patch({title:$('documentTitle').value});};
$('synopsis').onchange=()=>patch({synopsis:$('synopsis').value});$('notes').onchange=()=>patch({notes:$('notes').value});$('status').onchange=()=>patch({status:$('status').value});$('label').onchange=()=>patch({label:$('label').value});
$('keywords').onchange=()=>patch({keywords:$('keywords').value.split(',').map(s=>s.trim()).filter(Boolean)});$('sceneGoal').onchange=()=>{const value=Number($('sceneGoal').value);if(!Number.isSafeInteger(value)||value<0||value>100000000){renderEditor();return;}patch({target_words:value});};$('include').onchange=()=>patch({include_in_compile:$('include').checked});
for(const name of ['write','story','notebook','read','publish','translation','review'])bind(name==='story'?'storyTab':name+'Tab',async()=>{if(!project)return;await flush();view=name;if(name==='notebook')await refresh();else renderView();});
bind('cardsBtn',()=>{storyMode='cards';renderStory();});bind('outlineBtn',()=>{storyMode='outline';renderStory();});$('storyScope').onchange=()=>renderStory();$('storyFilter').onchange=()=>renderStory();
bind('snapshotBtn',async()=>{
 if(node(selected)?.kind!=='text')return;const label=prompt('Nome da versão','Versão manual');if(!label?.trim())return;await flush();
 const result=await api(`projects/${project.id}/snapshot`,'POST',{id:selected,label,base_hash:project.document_hashes?.[selected],base_rich_hash:project.rich_hashes?.[selected]});project.snapshots.push({id:result.id,node_id:selected,content:project.documents[selected],label,created_at:new Date().toISOString(),...(project.rich_documents?.[selected]?{rich_document:JSON.parse(JSON.stringify(project.rich_documents[selected]))}:{})});status('Versão guardada: '+label);
});
async function openVersions(){
 if(node(selected)?.kind!=='text')return;await flush();const id=selected,projectId=project.id,saved=await api('projects/'+projectId),versions=saved.snapshots.filter(s=>s.node_id===id).reverse(),list=$('versionsList');list.replaceChildren();$('versionsEmpty').hidden=versions.length>0;
 for(const version of versions){const row=el('section'),heading=el('h3',version.label+' · '+new Date(version.created_at).toLocaleString('pt-BR')),preview=el(version.rich_document?'div':'pre',version.content,version.rich_document?'rich-preview':undefined),restore=el('button','Restaurar esta versão'),compare=el('button','Comparar com o texto atual'),diff=el('div');row.append(heading,preview,restore,compare,diff);if(version.rich_document)renderVisualPreview(preview,version.rich_document);
  compare.onclick=()=>{showVersionsDiff(diff,version.content,project.documents[id]);if(version.content===project.documents[id]&&JSON.stringify(version.rich_document??null)!==JSON.stringify(project.rich_documents?.[id]??null))diff.appendChild(el('p','O texto é igual, mas a formatação, as anotações ou o modo do documento são diferentes.'));};
  restore.onclick=()=>perform(async()=>{
   if(!confirm('Restaurar esta versão? O texto atual será guardado em outra versão.'))return;
   await api(`projects/${projectId}/restore-snapshot`,'POST',{id:version.id,base_hash:project.document_hashes[id],base_rich_hash:project.rich_hashes?.[id]});$('versionsDialog').close();removeLocal(draftKey(projectId,id));await refresh();status('Versão restaurada; texto anterior preservado.');
  });list.appendChild(row);
 }comparisonContext={projectId,nodeId:id,saved};$('versionsDialog').showModal();
}
bind('versionsBtn',openVersions);
bind('closeVersionsBtn',()=>$('versionsDialog').close());
bind('deleteBtn',async()=>{await flush();if(!selected||Object.values(project.roots).includes(selected))return;if(!confirm('Mover este documento e seus filhos para a lixeira?'))return;await api(`projects/${project.id}/trash`,'POST',{id:selected});selected=null;await refresh();});
bind('trashBtn',async()=>{
 await flush();const list=$('trashList');list.replaceChildren();for(const n of nodes(project.roots.trash)){const row=el('div'),restore=el('button','Restaurar');restore.onclick=()=>perform(async()=>{await api(`projects/${project.id}/restore`,'POST',{id:n.id});$('trashDialog').close();await refresh();});row.append(el('span',n.title),restore);list.appendChild(row);}if(!list.children.length)list.appendChild(el('p','A lixeira está vazia.'));$('trashDialog').showModal();
});
bind('upBtn',()=>shift(-1));bind('downBtn',()=>shift(1));
bind('moveBtn',async()=>{await flush();if(!selected)return;folderOptions($('moveParent'),node(selected).parent_id,selected);$('moveDialog').showModal();});
bind('confirmMoveBtn',async()=>{await organize(selected,$('moveParent').value,'inside');$('moveDialog').close();});
bind('splitBtn',async()=>{const offset=$('editor').selectionStart;await flush();const title=prompt('Título da nova cena','Continuação');if(!title)return;const result=await api(`projects/${project.id}/split`,'POST',{id:selected,offset,title,base_hash:project.document_hashes[selected]});selected=result.id;await refresh();status('Cena dividida. A versão anterior foi preservada.');});
bind('focusBtn',()=>{if(document.body.classList.contains('show-tree')||document.body.classList.contains('show-inspector'))closeMobilePanels();document.body.classList.toggle('focus');if(project&&view!=='write'&&view!=='read'){view='write';renderView();}},false);
bind('toggleTreeBtn',()=>{document.body.classList.remove('show-inspector');document.body.classList.toggle('show-tree');if(document.body.classList.contains('show-tree'))$('closeTreeBtn').focus();},false);
bind('toggleInspectorBtn',()=>{if(globalThis.innerWidth>900)document.body.classList.toggle('hide-inspector');else {document.body.classList.remove('show-tree');document.body.classList.toggle('show-inspector');if(globalThis.innerWidth<=650&&document.body.classList.contains('show-inspector'))$('closeInspectorBtn').focus();}},false);
bind('referenceBtn',()=>{const open=$('referencePanel').classList.toggle('hidden');$('referenceBtn').setAttribute?.('aria-expanded',String(!open));if(open)$('writingLayout').classList.remove('translating');else renderReference();},false);
$('referenceSelect').onchange=()=>$('referenceText').textContent=project.documents[$('referenceSelect').value]||'';
$('fontSize').value=readLocal('writingroom.fontSize')||'19';
function applyFont(){document.documentElement?.style.setProperty('--editor-size',$('fontSize').value+'px');}
applyFont();$('fontSize').onchange=()=>{applyFont();writeLocal('writingroom.fontSize',$('fontSize').value);};
bind('typewriterBtn',()=>{const pressed=$('typewriterBtn').getAttribute?.('aria-pressed')==='true';$('typewriterBtn').setAttribute?.('aria-pressed',String(!pressed));},false);
function markup(before,after=''){
 if(isVisual()){if(before==='**')richController?.run('bold');else if(before==='*')richController?.run('italic');else if(before==='\n## ')richController?.run('block','h2');else if(before==='\n> ')richController?.run('quote');return;}
 const editor=$('editor'),start=editor.selectionStart,end=editor.selectionEnd;if(!selected)return;editor.setRangeText(before+editor.value.slice(start,end)+after,start,end,'select');editor.focus();editor.oninput();
}
bind('boldBtn',()=>markup('**','**'),false);bind('italicBtn',()=>markup('*','*'),false);bind('headingBtn',()=>markup('\n## '),false);bind('quoteBtn',()=>markup('\n> '),false);
async function openProjectSettings(id){await flush();const current=await api('projects/'+id);settingsTarget=id;$('settingsProjectType').textContent='Tipo: '+(Array.from($('projectTemplate').options||[]).find(o=>o.value===current.settings?.project_type||(current.settings?.project_type==='custom'&&o.value==='blank'))?.textContent||(current.settings?.project_type==='translation'?'Tradução':'Não informado — projeto anterior'))+' · Pesquisa: '+(current.settings?.research_preset==='historical'?'Histórica':'Geral');$('settingsName').value=current.name;for(const [field,key,fallback] of [['settingsAuthor','author',''],['settingsDescription','description',''],['settingsLanguage','language','pt-BR'],['settingsGoal','target_words',0]])$(field).value=current.settings?.[key]??fallback;$('settingsDialog').showModal();}
bind('settingsBtn',()=>openProjectSettings(project.id));
$('settingsForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{await api(`projects/${settingsTarget}/settings`,'POST',{patch:{name:$('settingsName').value,author:$('settingsAuthor').value,description:$('settingsDescription').value,language:$('settingsLanguage').value,target_words:Number($('settingsGoal').value)}});$('settingsDialog').close();if(project?.id===settingsTarget)await refresh();else await library();settingsTarget=null;});};
bind('importBtn',async()=>{await flush();importData=null;$('importFile').value='';$('confirmImportBtn').disabled=true;$('importPreview').replaceChildren();folderOptions($('importParent'),node(selected)?.kind==='folder'?selected:node(selected)?.parent_id);$('importDialog').showModal();});
async function inspectFile(){
 $('confirmImportBtn').disabled=true;importData=null;const file=$('importFile').files?.[0];if(!file)return;
 $('importFile').disabled=true;$('importSplit').disabled=true;
 try{
 if(file.size>1500000)throw new Error('Limite de 1,5 MB por importação.');
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}catch{throw new Error('O arquivo precisa estar em UTF-8. A origem não foi alterada.');}
 const data={filename:file.name,text,split:$('importSplit').checked},plan=await api(`projects/${project.id}/inspect-import`,'POST',data);importData=data;
 const preview=$('importPreview');preview.replaceChildren();preview.appendChild(el('strong',plan.sections.length+' cenas · '+plan.words+' palavras'));
 for(const warning of plan.warnings)preview.appendChild(el('p',warning));for(const section of plan.sections){const row=el('div');row.append(el('strong',section.title),el('p',section.text.slice(0,180)||'Cena vazia'));preview.appendChild(row);}$('confirmImportBtn').disabled=false;
 }finally{$('importFile').disabled=false;$('importSplit').disabled=false;}
}
$('importFile').onchange=()=>perform(inspectFile);$('importSplit').onchange=()=>perform(inspectFile);
bind('confirmImportBtn',async()=>{if(!importData)return;const result=await api(`projects/${project.id}/import`,'POST',{...importData,parent_id:$('importParent').value});$('importDialog').close();selected=result.ids[0];view='story';$('storyScope').value=$('importParent').value;await refresh();status(result.ids.length+' cenas importadas. Arquivo original preservado.');});
bind('exportBtn',async()=>{if(!project)return;await flush();const format=$('exportFormat').value||'md';if(['docx','epub'].includes(format)){const response=await fetch(`/api/projects/${project.id}/export?format=${format}`);if(!response.ok){const error=await response.json();throw new Error(error.error);}download(await response.blob(),safeName(project.name)+'.'+format,format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/epub+zip');status('Arquivo '+format.toUpperCase()+' preparado. Formatação básica de texto e títulos.');return;}const text=await api(`projects/${project.id}/export?format=${format}`);download(text,safeName(project.name)+'.'+format,format==='html'?'text/html;charset=utf-8':format==='md'?'text/markdown;charset=utf-8':'text/plain;charset=utf-8');status('Manuscrito exportado em '+format.toUpperCase());});
bind('printBtn',async()=>{await flush();view='publish';const rendered=await renderView();if(rendered?.includes(false))throw new Error('Não foi possível preparar todas as notas para impressão.');window.print();});
bind('backupBtn',async()=>{await flush();const backup=await api(`projects/${project.id}/backup`);download(JSON.stringify(backup,null,2),safeName(project.name)+'.wroom-backup.json','application/json');status('Backup completo preparado para download. Guarde uma cópia em outro local.');});
bind('restoreBackupBtn',()=>$('backupFile').click());
$('backupFile').onchange=()=>perform(async()=>{const file=$('backupFile').files?.[0];if(!file)return;if(file.size>32000000)throw new Error('Limite de 32 MB para restauração.');let backup;try{backup=JSON.parse(await file.text());}catch{throw new Error('Arquivo de backup inválido.');}if(!confirm('Restaurar em um novo projeto? Nenhum projeto existente será substituído.'))return;const restored=await api('restore','POST',{backup});await openProject(restored.id);$('backupFile').value='';});
bind('recoveryDownloadBtn',async()=>{
 if(!project)return;const copy=JSON.parse(JSON.stringify(project));delete copy.round_hashes;delete copy.tracking_hash;delete copy.review_hashes;delete copy.document_hashes;delete copy.collections_hash;delete copy.scratchpad_hash;delete copy.rich_hashes;delete copy.attachments_hash;delete copy.structure_hash;delete copy.source_hashes;
 const bytes=new TextEncoder().encode(JSON.stringify(copy));
 const checksum=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 download(JSON.stringify({format:'writingroom-json-backup',version:1,created_at:new Date().toISOString(),checksum,project:copy},null,2),safeName(project.name)+'-recuperacao.wroom-backup.json','application/json');
},false);
bind('retryBtn',async()=>{
 if(!saveFailed)return;if(metadataFailed||!['text','rich'].includes(lastFailedKind))throw new Error('Há metadados não confirmados. Baixe a recuperação antes de recarregar.');
 await saveQueue;const latest=await api('projects/'+project.id);const id=selected;
 if(latest.document_hashes[id]!==project.document_hashes[id]||((project.rich_documents?.[id]||latest.rich_documents?.[id])&&latest.rich_hashes?.[id]!==project.rich_hashes?.[id])){conflictRemote=latest;$('localConflict').textContent=project.documents[id];$('remoteConflict').textContent=latest.documents[id];$('conflictDialog').showModal();return;}
 saveFailed=false;saveText();await flush();$('retryBtn').classList.add('hidden');$('recoveryDownloadBtn').classList.add('hidden');
});
bind('keepRemoteBtn',async()=>{if(!conflictRemote)return;if(!confirm('Usar o texto do disco? A cópia local será removida. Baixe a recuperação se quiser guardá-la.'))return;project=conflictRemote;conflictRemote=null;saveFailed=false;removeLocal(draftKey(project.id,selected));$('conflictDialog').close();$('retryBtn').classList.add('hidden');$('recoveryDownloadBtn').classList.add('hidden');renderAll();status('Texto do disco carregado.');});
async function prepareOverwrite(remote,label,visual=isVisual()){
 const id=selected;await api(`projects/${project.id}/snapshot`,'POST',{id,label,base_hash:remote.document_hashes[id],base_rich_hash:remote.rich_hashes?.[id]});
 project.document_hashes[id]=remote.document_hashes[id];project.rich_hashes??={};project.rich_hashes[id]=remote.rich_hashes?.[id];
 if(!visual&&remote.rich_documents?.[id]){const result=await api(`projects/${project.id}/rich-disable`,'POST',{id,base_rich_hash:remote.rich_hashes[id]});project.rich_hashes[id]=result.rich_hash;project.document_hashes[id]=result.hash;}
}
bind('keepLocalBtn',async()=>{
 if(!conflictRemote)return;await prepareOverwrite(conflictRemote,'Antes de resolver conflito');conflictRemote=null;saveFailed=false;$('conflictDialog').close();$('editor').value=project.documents[selected];saveText();await flush();$('retryBtn').classList.add('hidden');$('recoveryDownloadBtn').classList.add('hidden');status('Edição local salva; versão do disco preservada.');
});
bind('recoverDraftBtn',async()=>{
 if(!recoveredDraft)return;const local={...recoveredDraft};await flush();const current=await api('projects/'+project.id);
 if(local.rich_document){const module=await loadRichModule();local.rich_document=module.normalizeRichDocument(local.rich_document);if(module.richText(local.rich_document)!==local.text)throw new Error('A cópia visual local diverge do texto; preserve-a antes de continuar.');}
 await prepareOverwrite(current,'Antes de recuperar edição local',!!local.rich_document);if(local.rich_document){project.rich_documents??={};project.rich_documents[selected]=local.rich_document;}else if(project.rich_documents)delete project.rich_documents[selected];project.documents[selected]=local.text;$('editor').value=local.text;saveText();await flush();$('draftNotice').classList.add('hidden');renderEditor();status('Edição local recuperada.');
});
bind('discardDraftBtn',()=>{if(!confirm('Descartar apenas a cópia local? O texto salvo no projeto permanece intacto.'))return;removeLocal(draftKey(project.id,selected));recoveredDraft=null;$('draftNotice').classList.add('hidden');});
let searchGeneration=0;
$('search').oninput=async()=>{
 const generation=++searchGeneration;if(!project)return;const q=$('search').value.trim(),list=$('searchResults');list.replaceChildren();if(!q)return;
 try{const results=await api(`projects/${project.id}/search?q=${encodeURIComponent(q)}`);if(generation!==searchGeneration)return;for(const found of results){const button=el('button',found.title);button.onclick=()=>perform(()=>select(found.id));list.appendChild(button);}if(!results.length)list.appendChild(el('p','Nenhum resultado.','muted'));}catch(error){report(error);}
};
for(const button of document.querySelectorAll?.('[data-close]')||[])button.onclick=()=>$(button.dataset.close).close();
window.addEventListener('beforeunload',event=>{if(timer||scratchTimer||scratchDirty||pending||saveFailed){event.preventDefault();event.returnValue='';}});
document.addEventListener?.('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='s'){event.preventDefault();perform(flush);}if(event.key==='Escape'){if(document.body.classList.contains('show-tree')||document.body.classList.contains('show-inspector'))closeMobilePanels();clearPointerOrganization();document.body.classList.remove('focus','show-tree','show-inspector');for(const menu of document.querySelectorAll?.('.action-menu[open]')||[])menu.open=false;}});

function renderNotebook(){
 for(const mode of ['entities','collections','scratch','assets','sources']){$(mode+'Panel').classList.toggle('hidden',notebookMode!==mode);$(mode+'ModeBtn').classList.toggle('active',notebookMode===mode);}
 const cards=$('entityCards');cards.replaceChildren();const filter=$('entityFilter').value;
 for(const n of activeNodes().filter(n=>n.entity_type&&(!filter||n.entity_type===filter))){
  const card=el('article',undefined,'scene-card');card.append(el('span',entityNames[n.entity_type],'card-path'),el('h2',n.title),el('p',n.synopsis||'Abra a ficha para desenvolver seus detalhes.'));
  const button=el('button','Abrir ficha ↗');button.onclick=()=>perform(()=>select(n.id));card.append(button,documentActions(n));cards.appendChild(card);
 }if(!cards.children.length)cards.appendChild(el('p','Crie fichas para personagens, lugares, objetos, organizações, eventos e conceitos.','empty'));
 const collections=project.collections||[],select=$('collectionSelect'),previous=select.value;select.replaceChildren();
 for(const c of collections){const option=el('option',c.name+(c.type==='query'?' · dinâmica':''));option.value=c.id;select.appendChild(option);}select.value=collections.some(c=>c.id===previous)?previous:collections[0]?.id||'';
 const collection=collections.find(c=>c.id===select.value);for(const id of ['renameCollectionBtn','deleteCollectionBtn','addCollectionNodeBtn'])$(id).disabled=!collection||(id==='addCollectionNodeBtn'&&collection.type!=='manual');
 const candidates=$('collectionNode'),old=candidates.value;candidates.replaceChildren();for(const n of activeNodes().filter(n=>n.parent_id!==null)){const option=el('option',pathOf(n)+' / '+n.title);option.value=n.id;candidates.appendChild(option);}candidates.value=node(old)?old:activeNodes().find(n=>n.kind==='text')?.id||'';
 $('collectionNode').disabled=!collection||collection.type!=='manual';const members=$('collectionMembers');members.replaceChildren();
 if(collection){
  const query=(collection.query||'').toLocaleLowerCase();const ids=collection.type==='manual'?collection.node_ids:activeNodes().filter(n=>n.parent_id!==null&&(!collection.status||n.status===collection.status)&&(n.title+' '+n.synopsis+' '+(n.notes||'')+' '+(n.keywords||[]).join(' ')+' '+(n.source?[n.source.url,n.source.author,n.source.publisher,n.source.date].join(' '):'')+' '+(project.documents[n.id]||'')).toLocaleLowerCase().includes(query)).map(n=>n.id);
  const visible=ids.map(id=>node(id)).filter(n=>n&&!trashed(n));$('collectionDescription').textContent=visible.length+' referências'+(collection.type==='query'?' · consulta: '+(collection.query||'(qualquer texto)')+' · estado: '+(states[collection.status]||'qualquer'):' · seleção manual');
  for(const n of visible){const row=el('div',undefined,'collection-row'),description=el('div');description.append(el('h3',n.title),el('p',pathOf(n)));const open=el('button','Abrir');open.onclick=()=>perform(()=>select(n.id));row.append(description,open);
   if(collection.type==='manual'){const remove=el('button','Remover referência');remove.onclick=()=>perform(()=>changeCollectionUI({operation:'remove',id:collection.id,node_id:n.id}));row.appendChild(remove);}members.appendChild(row);
  }if(!visible.length)members.appendChild(el('p','Nenhum documento nesta coleção.','muted'));
 }else $('collectionDescription').textContent='Crie uma coleção manual ou uma consulta salva. A árvore original permanece intacta.';
 if(notebookMode==='assets')renderAttachments();if(notebookMode==='sources')renderSources();
 if(notebookMode==='scratch'){
  $('scratchpad').value=project.scratchpad||'';let local;try{local=JSON.parse(readLocal(draftKey(project.id,'scratchpad'))||'null');}catch{}
  $('scratchDraftNotice').classList.toggle('hidden',typeof local?.text!=='string'||local.text===project.scratchpad);
 }
}
function saveScratchpad(){
 if(!project)return;const current=project,text=current.scratchpad||'';scratchDirty=false;
 queueSave(async()=>{if(saveFailed)throw new Error('Capture uma recuperação antes de continuar.');const result=await api(`projects/${current.id}/scratchpad`,'POST',{text,base_hash:current.scratchpad_hash});current.scratchpad_hash=result.hash;
  let local;try{local=JSON.parse(readLocal(draftKey(current.id,'scratchpad'))||'null');}catch{}if(local?.text===text&&!local.rich_document)removeLocal(draftKey(current.id,'scratchpad'));$('scratchStatus').textContent='Captura salva no projeto.';
 },'metadata');
}
for(const mode of ['entities','collections','scratch','assets','sources'])bind(mode+'ModeBtn',async()=>{await flush();notebookMode=mode;renderNotebook();});
$('entityFilter').onchange=()=>renderNotebook();$('collectionSelect').onchange=()=>renderNotebook();
bind('newEntityBtn',async()=>{await flush();$('entityName').value='';$('entityDialog').showModal();});
$('entityForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{await flush();const result=await api(`projects/${project.id}/entity`,'POST',{type:$('entityType').value,title:$('entityName').value});$('entityDialog').close();selected=result.id;view='write';await refresh();status('Ficha criada em Pesquisa.');});};
bind('newCollectionBtn',async()=>{await flush();$('collectionName').value='';$('collectionQuery').value='';$('collectionDialog').showModal();});
async function changeCollectionUI(input){await flush();const result=await api(`projects/${project.id}/collection`,'POST',{...input,base_hash:project.collections_hash});await refresh();if(view==='notebook'&&(project.collections||[]).some(c=>c.id===result.id)){$('collectionSelect').value=result.id;renderNotebook();}}
$('collectionForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{await changeCollectionUI({operation:'create',name:$('collectionName').value,type:$('collectionType').value,query:$('collectionQuery').value,status:$('collectionStatus').value});$('collectionDialog').close();});};
bind('addCollectionNodeBtn',()=>changeCollectionUI({operation:'add',id:$('collectionSelect').value,node_id:$('collectionNode').value}));
bind('renameCollectionBtn',async()=>{const c=(project.collections||[]).find(c=>c.id===$('collectionSelect').value);if(!c)return;const name=prompt('Nome da coleção',c.name);if(name?.trim())await changeCollectionUI({operation:'rename',id:c.id,name});});
bind('deleteCollectionBtn',async()=>{if(!confirm('Excluir apenas a coleção? Os documentos permanecerão intactos.'))return;await changeCollectionUI({operation:'delete',id:$('collectionSelect').value});});
$('scratchpad').oninput=()=>{if(!project)return;project.scratchpad=$('scratchpad').value;scratchDirty=true;writeLocal(draftKey(project.id,'scratchpad'),JSON.stringify({text:project.scratchpad,base_hash:project.scratchpad_hash}));$('scratchStatus').textContent='Captura pendente…';status('Alterações pendentes');clearTimeout(scratchTimer);scratchTimer=setTimeout(()=>{scratchTimer=null;saveScratchpad();},650);};
bind('saveScratchBtn',async()=>{await flush();$('scratchStatus').textContent='Captura salva no projeto.';});
bind('recoverScratchBtn',async()=>{let local;try{local=JSON.parse(readLocal(draftKey(project.id,'scratchpad'))||'null');}catch{}if(typeof local?.text!=='string')return;await flush();const current=await api('projects/'+project.id);if(current.scratchpad?.trim()&&current.scratchpad!==local.text){if(!confirm('Guardar o caderno atual em Pesquisa e recuperar a captura local?'))return;await api(`projects/${project.id}/capture`,'POST',{title:'Caderno antes da recuperação local',parent_id:project.roots.research,base_hash:current.scratchpad_hash});}project.scratchpad_hash=current.scratchpad_hash;project.scratchpad=local.text;saveScratchpad();await flush();await refresh();});
bind('captureSceneBtn',async()=>{await flush();if(!project.scratchpad?.trim())throw new Error('Escreva uma captura primeiro.');folderOptions($('captureParent'),project.roots.draft);$('captureTitle').value='Uma ideia do caderno';$('captureDialog').showModal();});
$('captureForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{await flush();const result=await api(`projects/${project.id}/capture`,'POST',{title:$('captureTitle').value,parent_id:$('captureParent').value,base_hash:project.scratchpad_hash});$('captureDialog').close();selected=result.id;view='write';await refresh();status('Cena criada. A captura original permanece no caderno.');});};
function invalidateReplace(){replacePlan=null;replaceSelected.clear();$('replaceResults').replaceChildren();$('replaceSummary').textContent='Gere uma prévia antes de aplicar.';for(const id of ['applyReplaceBtn','selectAllReplaceBtn','clearReplaceBtn'])$(id).disabled=true;}
function updateReplaceSelection(){const total=replacePlan?.occurrences.length||0;$('replaceSummary').textContent=replaceSelected.size+' de '+total+' ocorrências selecionadas · '+new Set(replacePlan?.occurrences.map(o=>o.node_id)).size+' cenas com ocorrências';$('applyReplaceBtn').disabled=!replaceSelected.size;}
function renderReplacePreview(){
 const list=$('replaceResults');list.replaceChildren();for(const occurrence of replacePlan.occurrences){const row=el('div',undefined,'replace-occurrence'),check=el('input');check.type='checkbox';check.checked=replaceSelected.has(occurrence.id);check.disabled=!!occurrence.unsupported;check.setAttribute?.('aria-label','Substituir ocorrência em '+occurrence.title);check.onchange=()=>{if(check.checked)replaceSelected.add(occurrence.id);else replaceSelected.delete(occurrence.id);updateReplaceSelection();};
  const content=el('div');content.appendChild(el('h3',occurrence.title));if(occurrence.unsupported)content.appendChild(el('p','Ocorrência entre blocos ou limites de anotações: edite manualmente na cena.','muted'));const before=el('pre');before.append(document.createTextNode(occurrence.before),el('mark',occurrence.match),document.createTextNode(occurrence.after));content.append(before,el('pre','→ '+occurrence.before+replacePlan.query.replacement+occurrence.after));row.append(check,content);list.appendChild(row);
 }updateReplaceSelection();
}
bind('findReplaceBtn',async()=>{await flush();invalidateReplace();const editor=$('editor'),selection=isVisual()?(richController?.selectedText||''):editor.value.slice(editor.selectionStart,editor.selectionEnd);$('replaceFind').value=selection.length<=300?selection:$('search').value;$('replaceScope').value=node(selected)?.kind==='text'?'document':'draft';$('replaceDialog').showModal();});
for(const id of ['replaceFind','replaceWith'])$(id).oninput=invalidateReplace;
for(const id of ['replaceScope','replaceCase','replaceWhole'])$(id).onchange=invalidateReplace;
bind('previewReplaceBtn',async()=>{await flush();invalidateReplace();replacePlan=await api(`projects/${project.id}/replace-preview`,'POST',{find:$('replaceFind').value,replacement:$('replaceWith').value,scope:$('replaceScope').value,node_id:selected,case_sensitive:$('replaceCase').checked,whole_word:$('replaceWhole').checked});replaceSelected=new Set(replacePlan.occurrences.filter(o=>!o.unsupported).map(o=>o.id));$('selectAllReplaceBtn').disabled=!replaceSelected.size;$('clearReplaceBtn').disabled=!replaceSelected.size;renderReplacePreview();});
bind('selectAllReplaceBtn',()=>{if(!replacePlan)return;replaceSelected=new Set(replacePlan.occurrences.filter(o=>!o.unsupported).map(o=>o.id));renderReplacePreview();});
bind('clearReplaceBtn',()=>{replaceSelected.clear();renderReplacePreview();});
bind('applyReplaceBtn',async()=>{if(!replacePlan||!replaceSelected.size)return;if(!confirm('Aplicar '+replaceSelected.size+' substituições selecionadas? Será guardada uma versão anterior de cada cena alterada.'))return;
 try{const result=await api(`projects/${project.id}/replace-apply`,'POST',{query:replacePlan.query,fingerprint:replacePlan.fingerprint,occurrence_ids:[...replaceSelected]});$('replaceDialog').close();invalidateReplace();await refresh();status(result.replacements+' substituições em '+result.documents+' cenas. Versões anteriores preservadas.');}
 catch(error){invalidateReplace();$('replaceSummary').textContent=error.message;throw error;}
});


function isVisual(){return !!project?.rich_documents?.[selected];}
function loadRichModule(){if(richModule)return Promise.resolve(richModule);if(!richModulePromise)richModulePromise=import('/editor.bundle.js').then(module=>richModule=module).catch(error=>{richModulePromise=null;throw error;});return richModulePromise;}
function renderVisualPreview(element,value){return loadRichModule().then(module=>{if(!element.isConnected)return false;module.renderRichPreview(element,value);return true;}).catch(()=>{status('Editor visual indisponível. Execute npm run build:editor.');return false;});}
function mountVisual(){
 const key=project.id+':'+selected;
 loadRichModule().then(module=>{
  if(!project||!isVisual()||project.id+':'+selected!==key)return;
  if(!richController)richController=module.createRichEditor($('richEditor'),{
   onChange(value,text){
    if(!project||richMountKey!==project.id+':'+selected)return;
    project.rich_documents[selected]=value;project.documents[selected]=text;$('editor').value=text;updateStats();renderAnnotations();status('Alterações pendentes');
    writeLocal(draftKey(project.id,selected),JSON.stringify({text,rich_document:value,base_rich_hash:project.rich_hashes[selected]}));
    clearTimeout(timer);timer=setTimeout(function schedule(){if(richController?.composing){timer=setTimeout(schedule,300);return;}timer=null;saveVisual();},650);
   },
   onError:message=>status(message),
   onToolbar(state){for(const [id,name] of [['boldBtn','bold'],['italicBtn','italic'],['underlineBtn','underline'],['strikeBtn','strike']])$(id).setAttribute?.('aria-pressed',String(!!state[name]));$('blockStyle').value=state.block;}
  });
  richMountKey=key;richController.load(key,project.rich_documents[selected],translationLanguage(selected)||project.settings?.language||'pt-BR');renderAnnotations();
 }).catch(()=>{status('Não foi possível carregar o editor. Preserve seu projeto e execute npm run build:editor.');});
}
function saveVisual(){
 if(!project||!isVisual())return;const current=project,id=selected,value=current.rich_documents[id],text=current.documents[id];
 queueSave(async()=>{
  if(saveFailed)throw new Error('Salvamento visual interrompido. Baixe a recuperação antes de sair.');
  const result=await api(`projects/${current.id}/rich-save`,'POST',{id,rich_document:value,base_rich_hash:current.rich_hashes?.[id]});(current.rich_hashes??={})[id]=result.rich_hash;(current.document_hashes??={})[id]=result.hash;if(result.rich_hash)(current.rich_hashes??={})[id]=result.rich_hash;
  let local;try{local=JSON.parse(readLocal(draftKey(current.id,id))||'null');}catch{}
  if(local?.text===text&&JSON.stringify(local.rich_document)===JSON.stringify(value))removeLocal(draftKey(current.id,id));
 },'rich');
}
bind('enableRichBtn',async()=>{
 if(node(selected)?.kind!=='text')throw new Error('Selecione uma cena.');await flush();
 if(!confirm('Ativar editor visual nesta cena? Uma cópia integral local e uma versão do texto original serão guardadas. O projeto exigirá esta versão do aplicativo para preservar o editor visual. Markdown permanece literal; quebras serão normalizadas para LF.'))return;
 await loadRichModule();await api(`projects/${project.id}/rich-enable`,'POST',{id:selected,base_rich_hash:project.rich_hashes[selected]});await refresh();status('Editor visual ativado; backup local integral e versão anterior preservados.');
});
bind('disableRichBtn',async()=>{
 await flush();if(!confirm('Voltar ao texto simples? A formatação, os comentários e as notas serão preservados em uma versão. O texto simples da cena será mantido, sem essas anotações.'))return;
 await api(`projects/${project.id}/rich-disable`,'POST',{id:selected,base_rich_hash:project.rich_hashes[selected]});await refresh();status('Texto simples ativado; versão visual preservada.');
});
for(const [id,command] of [['underlineBtn','underline'],['strikeBtn','strike'],['bulletListBtn','bullets'],['numberListBtn','numbers'],['undoBtn','undo'],['redoBtn','redo']])bind(id,()=>richController?.run(command),false);
$('blockStyle').onchange=()=>richController?.run('block',$('blockStyle').value);
bind('linkBtn',()=>{const href=prompt('Link completo (http, https ou mailto). Vazio remove o link.','https://');if(href!==null)richController?.run('link',href);},false);

let annotationEditing=null;
function openAnnotation(type,entry=null){
 if(!isVisual()||!richController)throw new Error('Ative o editor visual nesta cena.');
 if(!entry&&!richController.selectedText.trim())throw new Error('Selecione o trecho que deseja anotar.');
 annotationEditing={type,id:entry?.id??null,key:project.id+':'+selected};
 $('annotationHeading').textContent=type==='comment'?'Comentário privado':'Nota de publicação';
 $('annotationQuote').textContent=entry?.quote??richController.selectedText;
 $('annotationBody').value=entry?.body??'';
 $('annotationHint').textContent=type==='comment'?'Comentários ficam no projeto e nos backups; não entram no livro.':'A nota acompanha este trecho e será exportada na seção Notas, ao fim da cena.';
 $('annotationDialog').showModal();$('annotationBody').focus();
}
function renderAnnotations(){
 $('reviewPanel').classList.toggle('hidden',!isVisual());if(!isVisual()||!richModule)return;
 const entries=richModule.richAnnotations(project.rich_documents[selected]),filter=$('reviewFilter').value,list=$('reviewList');list.replaceChildren();
 const query=$('reviewSearch').value.trim().toLocaleLowerCase();
 const visible=entries.filter(a=>(filter==='all'||(filter==='resolved'?a.type==='comment'&&a.resolved:!a.resolved))&&(!query||(a.quote+' '+a.body).toLocaleLowerCase().includes(query)));
 $('reviewSummary').textContent=entries.filter(a=>a.type==='comment'&&!a.resolved).length+' comentários abertos · '+entries.filter(a=>a.type==='footnote').length+' notas';
 if(!visible.length)list.append(el('p','Selecione um trecho e use Comentar ou Nota na barra do editor.','muted'));
 for(const entry of visible){const row=el('article',undefined,'review-entry'),title=el('h4',entry.type==='comment'?(entry.resolved?'Comentário resolvido':'Comentário'):'Nota de publicação'),quote=el('blockquote',entry.quote),body=el('p',entry.body),actions=el('div',undefined,'review-actions'),locate=el('button','Ir ao trecho'),edit=el('button','Editar'),remove=el('button','Excluir');
  locate.onclick=()=>richController?.selectAnnotation(entry.id);edit.onclick=()=>perform(()=>openAnnotation(entry.type,entry));
  remove.onclick=()=>perform(async()=>{if(!confirm('Excluir esta anotação? Uma versão será guardada antes.'))return;await flush();await preserveAnnotationVersion('Antes de excluir anotação');richController.reviseAnnotation(entry.id,{remove:true});});
  actions.append(locate,edit);if(entry.type==='comment'){const resolve=el('button',entry.resolved?'Reabrir':'Resolver');resolve.onclick=()=>perform(()=>richController.reviseAnnotation(entry.id,{resolved:!entry.resolved}));actions.append(resolve);}actions.append(remove);row.append(title,quote,body,actions);list.append(row);
 }
}
async function preserveAnnotationVersion(label){
 const result=await api(`projects/${project.id}/snapshot`,'POST',{id:selected,label,base_hash:project.document_hashes[selected],base_rich_hash:project.rich_hashes[selected]});
 project.snapshots.push({id:result.id,node_id:selected,label,content:project.documents[selected],rich_document:JSON.parse(JSON.stringify(project.rich_documents[selected])),created_at:new Date().toISOString()});
}
bind('addCommentBtn',()=>openAnnotation('comment'),false);bind('addFootnoteBtn',()=>openAnnotation('footnote'),false);
$('reviewFilter').onchange=renderAnnotations;$('reviewSearch').oninput=renderAnnotations;
$('annotationForm').onsubmit=event=>{event.preventDefault();perform(async()=>{
 const editing=annotationEditing;if(!editing||editing.key!==project.id+':'+selected)throw new Error('A cena mudou. Selecione o trecho novamente.');
 const body=$('annotationBody').value;if(!body.trim())throw new Error('Escreva a anotação.');
 $('reviewFilter').value='open';$('reviewSearch').value='';
 if(editing.id)richController.reviseAnnotation(editing.id,{body});else richController.addAnnotation(editing.type,body);
 $('annotationDialog').close();document.body.classList.remove('hide-inspector');document.body.classList.add('show-inspector');await flush();status('Anotação guardada.');
});};

let attachmentDraft=null,attachmentGeneration=0;
const assetSize=bytes=>bytes<1000?bytes+' B':(bytes/(bytes<1000000?1000:1000000)).toLocaleString('pt-BR',{maximumFractionDigits:2})+(bytes<1000000?' KB':' MB');
function renderAttachments(){
 const list=$('attachmentCards');list.replaceChildren();const all=project.attachments||[],query=$('attachmentSearch').value.trim().toLocaleLowerCase();
 $('attachmentUsage').textContent=all.length+' arquivos · '+assetSize(all.reduce((sum,a)=>sum+a.bytes,0))+' / 16 MB (inclui lixeira)';
 for(const asset of all){const n=node(asset.node_id);if(!n||trashed(n)||!(n.title+' '+n.synopsis+' '+(n.notes||'')+' '+asset.name).toLocaleLowerCase().includes(query))continue;
  const card=el('article',undefined,'scene-card');card.append(el('span',asset.mime,'card-path'),el('h2',n.title),el('p',n.synopsis||asset.name),el('p',assetSize(asset.bytes),'muted'));const open=el('button','Abrir anexo');open.onclick=()=>perform(()=>select(n.id));card.append(open,documentActions(n));list.append(card);
 }if(!list.children.length)list.append(el('p','Importe materiais para consultar durante a escrita. Os arquivos na lixeira podem ser restaurados.','empty'));
}
function renderAttachment(asset){
 const container=$('attachmentView');container.replaceChildren();container.classList.toggle('hidden',!asset);if(!asset)return;
 container.append(el('p',asset.name+' · '+asset.mime+' · '+assetSize(asset.bytes),'muted'));
 const downloadBtn=el('button','Baixar arquivo original');downloadBtn.onclick=()=>perform(async()=>{const response=await fetch(`/api/projects/${project.id}/asset?id=${asset.id}`);if(!response.ok)throw new Error('Anexo indisponível. Reabra o projeto.');download(await response.blob(),asset.name,asset.mime);});container.append(downloadBtn);
 if(asset.mime.startsWith('image/')){const image=el('img');image.alt=node(asset.node_id)?.synopsis||asset.name;image.onerror=()=>container.append(el('p','Não foi possível decodificar a imagem. Baixe o original para verificá-lo.','muted'));image.src=`/api/projects/${project.id}/asset?id=${asset.id}&preview=1`;container.append(image);}
 else if(asset.mime.startsWith('text/')){const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(asset.data_base64),c=>c.charCodeAt(0)));container.append(el('pre',text.slice(0,200000)));if(text.length>200000)container.append(el('p','Prévia limitada a 200 mil caracteres. Baixe o arquivo para ler o restante.','muted'));}
 else container.append(el('p','Arquivo preservado. Use a extração textual quando o formato permitir ou baixe para abrir em outro aplicativo.'));
 const extract=el('button','Extrair texto / pesquisar / traduzir');extract.onclick=()=>perform(()=>openExtraction(asset));container.append(extract);
 container.append(el('p','SHA-256: '+asset.sha256,'asset-checksum'));
}
bind('importAttachmentBtn',()=>$('attachmentFile').click(),false);
$('attachmentSearch').oninput=renderAttachments;
$('attachmentDialog').onclose=()=>{attachmentDraft=null;attachmentGeneration++;$('attachmentFile').value='';};
$('attachmentFile').onchange=()=>perform(async()=>{
 const generation=++attachmentGeneration,file=$('attachmentFile').files?.[0];attachmentDraft=null;if(!file)return;await flush();const key=project.id;
 if(!file.size||file.size>8000000)throw new Error('Escolha um arquivo de até 8 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));const input={name:file.name,data_base64:btoa(binary)};
 const info=await api(`projects/${key}/attachment-preview`,'POST',input);if(generation!==attachmentGeneration||project.id!==key)return;
 attachmentDraft={key,input,info};const preview=$('attachmentPreview');preview.replaceChildren();preview.append(el('h3',info.name),el('p',info.mime+' · '+assetSize(info.bytes)+(info.width?' · '+info.width+' × '+info.height:'')+(info.duplicate?' · já existe uma cópia destes bytes':'')),el('p','SHA-256: '+info.sha256,'asset-checksum'));
 if(info.preview_text!==null)preview.append(el('pre',info.preview_text));if(info.mime.startsWith('image/')){const image=el('img');image.alt=info.name;image.src='data:'+info.mime+';base64,'+input.data_base64;preview.append(image);}if(info.mime==='application/pdf')preview.append(el('p','PDF será guardado para download; não é executado nem exibido dentro do aplicativo.'));
 $('attachmentDialog').showModal();
});
bind('confirmAttachmentBtn',async()=>{
 const draft=attachmentDraft;if(!draft||draft.key!==project.id)throw new Error('Selecione o arquivo novamente.');await flush();
 const result=await api(`projects/${project.id}/attachment-add`,'POST',{...draft.input,expected_sha256:draft.info.sha256,base_hash:project.attachments_hash});
 attachmentDraft=null;$('attachmentFile').value='';$('attachmentDialog').close();selected=result.id;view='write';await refresh();status('Anexo guardado com integridade verificada. O original foi preservado.');
});

function profileFields(){return {version:1,real_name:$('profileRealName').value,pseudonym:$('profilePseudonym').value,use_pseudonym:$('profileUsePseudonym').checked,address:$('profileAddress').value,phone:$('profilePhone').value,email:$('profileEmail').value,bio:$('profileBio').value};}
function showProfile(data){profileBaseHash=data.hash;for(const [id,key] of [['profileRealName','real_name'],['profilePseudonym','pseudonym'],['profileAddress','address'],['profilePhone','phone'],['profileEmail','email'],['profileBio','bio']])$(id).value=data.profile[key];$('profileUsePseudonym').checked=data.profile.use_pseudonym;}
async function openAuthorProfile(){await flush();showProfile(await api('profile'));$('profileStatus').textContent='Perfil local separado das obras. Sua cópia privada contém os contatos e não é criptografada.';$('profileDialog').showModal();}
bind('authorProfileBtn',openAuthorProfile);bind('projectProfileBtn',openAuthorProfile);
$('profileForm').onsubmit=event=>{event.preventDefault();perform(async()=>{const data=await api('profile','POST',{profile:profileFields(),base_hash:profileBaseHash});showProfile(data);$('profileStatus').textContent='Perfil salvo. Nenhuma obra foi alterada.';});};
bind('downloadProfileBtn',async()=>{const backup=await api('profile-preview','POST',{profile:profileFields()});download(JSON.stringify(backup,null,2),'perfil-privado-do-autor.json','application/json');$('profileStatus').textContent='Cópia privada preparada, incluindo os campos deste formulário.';});
bind('clearProfileBtn',async()=>{if(!confirm('Limpar o perfil salvo? Autoria das obras e arquivos já exportados não serão alterados. Baixe a cópia privada antes se quiser preservar os contatos.'))return;const data=await api('profile','POST',{profile:{version:1,real_name:'',pseudonym:'',use_pseudonym:false,address:'',phone:'',email:'',bio:''},base_hash:profileBaseHash});showProfile(data);$('profileStatus').textContent='Perfil local limpo. Obras preservadas.';});
bind('restoreProfileBtn',()=>$('profileFile').click(),false);
$('profileFile').onchange=()=>perform(async()=>{const file=$('profileFile').files?.[0];if(!file)return;if(file.size>30000)throw new Error('Perfil maior que o limite de 30 KB.');const backup=JSON.parse(await file.text());if(!confirm('Restaurar os dados do perfil? Baixe uma cópia dos campos atuais antes de substituir.'))return;showProfile(await api('profile','POST',{backup,base_hash:profileBaseHash}));$('profileStatus').textContent='Perfil restaurado. Obras não foram alteradas.';$('profileFile').value='';});
bind('useProfileForNewBtn',async()=>{const {profile}=await api('profile'),name=profile.use_pseudonym?profile.pseudonym:profile.real_name;if(!name)throw new Error('Preencha um nome de publicação no Perfil do autor.');$('newProjectAuthor').value=name;});
for(const [button,type] of [['newCharacterBtn','character'],['newLocationBtn','location']])bind(button,async()=>{await flush();$('entityName').value='';$('entityType').value=type;$('entityDialog').showModal();});
bind('newResearchDraftBtn',async()=>{await flush();const title=prompt('Título do rascunho de pesquisa','Rascunho');if(!title?.trim())return;const result=await api(`projects/${project.id}/nodes`,'POST',{parent_id:project.roots.research,title:title.trim()});selected=result.id;view='write';await refresh();status('Rascunho criado em Pesquisa, fora do livro.');});
const sourceBasis={unclassified:'A classificar',documented:'Referência documental',hypothesis:'Hipótese / a conferir',fiction:'Referência ficcional'};
function renderSources(){
 const list=$('sourceCards');list.replaceChildren();const query=$('sourceSearch').value.trim().toLocaleLowerCase();
 for(const n of activeNodes().filter(n=>n.source)){const s=n.source;if(!(n.title+' '+s.author+' '+s.publisher+' '+s.url+' '+s.date).toLocaleLowerCase().includes(query))continue;
  const card=el('article',undefined,'scene-card');card.append(el('span',sourceBasis[s.basis],'card-path'),el('h2',n.title),el('p',[s.author,s.publisher,s.date].filter(Boolean).join(' · ')||'Metadados a preencher.'));
  if(s.url){const link=el('a','Abrir fonte ↗');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
  card.append(el('p',s.refs.length+' vínculos · acesso: '+(s.accessed||'não informado'),'muted'));const edit=el('button','Editar referência'),open=el('button','Notas / abrir documento');edit.onclick=()=>perform(()=>openSource(n.id));open.onclick=()=>perform(()=>select(n.id));card.append(edit,open,documentActions(n));list.append(card);
 }if(!list.children.length)list.append(el('p','Registre fontes e conecte cenas, fichas e anexos para encontrá-los durante a escrita.','empty'));
}
function renderSourceRelations(){
 const list=$('sourceRelationsList');list.replaceChildren();const current=node(selected),related=activeNodes().filter(n=>n.source&&n.source.refs.includes(selected));
 $('sourceRelations').classList.toggle('hidden',!current?.source&&!related.length);
 if(current?.source){const edit=el('button','Editar referência');edit.onclick=()=>perform(()=>openSource(current.id));list.append(edit);for(const id of current.source.refs){const n=node(id),button=el('button',n?(trashed(n)?'[Na lixeira] ':'')+n.title:'Referência indisponível');button.disabled=!n||trashed(n);button.onclick=()=>perform(()=>select(id));list.append(button);}}
 for(const n of related){const button=el('button',n.title);button.onclick=()=>perform(()=>select(n.id));list.append(button);}
}
async function openSource(id=null){
 await flush();const saved=await api('projects/'+project.id),n=id?saved.nodes.find(n=>n.id===id&&n.source):null;if(id&&!n)throw new Error('Fonte não encontrada.');sourceEditing={id,project:saved.id,hash:n?saved.source_hashes[id]:null};
 $('sourceTitle').value=n?.title||'';for(const [field,key] of [['sourceURL','url'],['sourceAuthor','author'],['sourcePublisher','publisher'],['sourceDate','date'],['sourceAccessed','accessed']])$(field).value=n?.source[key]||'';$('sourceBasis').value=n?.source.basis||'unclassified';
 const refs=$('sourceRefs');refs.replaceChildren();for(const target of activeNodes().filter(target=>target.parent_id!==null&&target.id!==id)){const option=el('option',target.title+(project.attachments?.some(a=>a.node_id===target.id)?' · anexo':''));option.value=target.id;option.selected=!!n?.source.refs.includes(target.id);refs.append(option);}
 // Preserve existing references to trashed nodes without silently losing them on metadata edit.
 for(const ref of n?.source.refs||[])if(!Array.from(refs.options).some(o=>o.value===ref)){const option=el('option','[Na lixeira] '+(node(ref)?.title||ref));option.value=ref;option.selected=true;refs.append(option);}
 $('sourceDialog').showModal();
}
bind('newSourceBtn',()=>openSource());$('sourceSearch').oninput=renderSources;
$('sourceForm').onsubmit=event=>{event.preventDefault();perform(async()=>{const editing=sourceEditing;if(!editing||editing.project!==project.id)throw new Error('Reabra a fonte para conferir o projeto.');await flush();const source={url:$('sourceURL').value.trim(),author:$('sourceAuthor').value.trim(),publisher:$('sourcePublisher').value.trim(),date:$('sourceDate').value.trim(),accessed:$('sourceAccessed').value,basis:$('sourceBasis').value,refs:Array.from($('sourceRefs').selectedOptions).map(o=>o.value)};const result=await api(`projects/${project.id}/source`,'POST',{operation:editing.id?'update':'create',id:editing.id,title:$('sourceTitle').value,source,base_hash:editing.hash});$('sourceDialog').close();selected=result.id;view='write';await refresh();status('Fonte guardada com vínculos. Conteúdo de pesquisa fora da publicação.');});};

const backupDate=value=>value?new Date(value).toLocaleString('pt-BR'):'Ainda não registrado';
function selectedBackupProject(){return backupCenterData?.projects.find(p=>(p.archived?'archived:'+p.id:p.id)===$('backupProject').value);}
function backupHistoryBody(item){return {destination:item.destination,project_id:item.project_id,id:item.id};}
function renderBackupCenter(){
 const data=backupCenterData,select=$('backupProject'),old=select.value;select.replaceChildren();const all=el('option','Todas as obras — histórico');all.value='';select.append(all);
 for(const p of data.projects){const option=el('option',p.name+(p.archived?' · arquivado':'')+(p.state!=='ready'?' · indisponível':''));option.value=p.archived?'archived:'+p.id:p.id;select.append(option);}select.value=data.projects.some(p=>(p.archived?'archived:'+p.id:p.id)===old)?old:'';
 $('backupCreateBtn').disabled=selectedBackupProject()?.state!=='ready';$('backupRunNowBtn').disabled=!data.settings.enabled;
 const destination=data.destinations.find(d=>d.id===$('backupDestination').value);$('backupDestinationPath').textContent=destination?.root||'';
 const selected=selectedBackupProject()?.id||'',history=data.history.filter(item=>!selected||item.project_id===selected||item.state==='destination-unavailable'),list=$('backupHistory');list.replaceChildren();
 const summary=$('backupStateSummary');summary.replaceChildren();for(const [key,entry] of Object.entries(data.state.projects)){const split=key.indexOf(':'),destinationId=key.slice(0,split),projectId=key.slice(split+1);if(selected&&projectId!==selected)continue;const name=data.projects.find(p=>p.id===projectId)?.name||'Obra do histórico';summary.append(el('p',name+' · '+destinationId+' · última cópia: '+backupDate(entry.last_success)+' · última tentativa: '+backupDate(entry.last_attempt)+(entry.last_error?' · '+entry.last_error:entry.result==='unchanged'?' · Sem alterações; cópia anterior conferida.':''),'muted'));}
 if(!history.length)list.append(el('p','Nenhuma cópia gerenciada neste filtro. Use Criar cópia local verificada.','empty'));
 for(const item of history){const row=el('section',undefined,'backup-history-row');row.append(el('h3',item.project_name),el('p',(item.kind==='automatic'?'Automática':item.kind==='manual'?'Manual':'Indisponível')+' · '+backupDate(item.created_at)+' · '+item.destination+(item.bytes?' · '+assetSize(item.bytes):''),'muted'));
  const result=el('p',item.state==='created-verified'?'Verificada na criação. Use Verificar para conferir os arquivos atuais.':'Não foi possível ler esta cópia/destino. Os arquivos foram preservados.','muted');row.append(result);
  if(item.state==='created-verified'){
   const actions=el('div',undefined,'backup-history-actions'),verify=el('button','Verificar agora'),get=el('button','Baixar JSON'),restore=el('button','Restaurar em novo projeto');
   verify.onclick=()=>perform(async()=>{try{const checked=await api('backup-center/verify','POST',backupHistoryBody(item));result.textContent='Integridade conferida agora: '+checked.manifest.bytes.toLocaleString('pt-BR')+' bytes, checksum e projeto válidos.';}catch(error){result.textContent='Falha na verificação atual. Preserve a cópia e tente outra geração.';throw error;}});
   get.onclick=()=>perform(async()=>{const input=backupHistoryBody(item),params=new URLSearchParams(input),response=await fetch('/api/backup-center/download?'+params.toString());if(!response.ok)throw new Error('Não foi possível verificar/baixar a cópia. Preserve o destino.');download(await response.blob(),safeName(item.project_name)+'-'+item.id.slice(0,8)+'.wroom-backup.json','application/json');result.textContent='Cópia verificada e preparada para download.';});
   restore.onclick=()=>perform(async()=>{await flush();if(!confirm('Restaurar esta cópia em um novo projeto? Nenhum projeto existente será substituído.'))return;const restored=await api('backup-center/restore','POST',backupHistoryBody(item));$('backupCenterDialog').close();$('settingsDialog').close();await openProject(restored.id);status('Backup verificado e restaurado em novo projeto.');});actions.append(verify,get,restore);row.append(actions);
  }list.append(row);
 }if(data.truncated)list.append(el('p','Mostrando as 200 gerações mais recentes deste filtro. Cópias anteriores permanecem no destino.','muted'));
}
async function refreshBackupCenter({settings=false,projectId=selectedBackupProject()?.id||''}={}){
 backupCenterData=await api('backup-center'+(projectId?'?project_id='+encodeURIComponent(projectId):''));if(settings){const select=$('backupDestination');select.replaceChildren();for(const target of backupCenterData.destinations){const option=el('option',target.label);option.value=target.id;select.append(option);}select.value=backupCenterData.settings.destination;$('backupAutoEnabled').checked=backupCenterData.settings.enabled;$('backupInterval').value=String(backupCenterData.settings.interval_minutes);$('backupRetention').value=String(backupCenterData.settings.retain_automatic);}
 renderBackupCenter();
}
async function openBackupCenter(){await flush();await refreshBackupCenter({settings:true,projectId:project?.id||''});$('backupProject').value=project?.id||'';renderBackupCenter();$('backupCenterStatus').textContent='O destino é uma pasta local configurada pelo servidor. Backup gerenciado não é o download do navegador nem um snapshot.';$('backupCenterDialog').showModal();}
for(const id of ['backupCenterLibraryBtn','backupCenterProjectBtn','backupCenterSettingsBtn'])bind(id,openBackupCenter);
$('backupProject').onchange=()=>perform(()=>refreshBackupCenter());$('backupDestination').onchange=renderBackupCenter;
$('backupSettingsForm').onsubmit=event=>{event.preventDefault();perform(async()=>{const settings={version:1,enabled:$('backupAutoEnabled').checked,interval_minutes:Number($('backupInterval').value),retain_automatic:Number($('backupRetention').value),destination:$('backupDestination').value};await api('backup-center/settings','POST',{settings,base_hash:backupCenterData.hash});await refreshBackupCenter({settings:true});$('backupCenterStatus').textContent='Configuração salva. A rotina só executa com o servidor ativo.';});};
bind('backupRefreshBtn',async()=>{await refreshBackupCenter({settings:true});$('backupCenterStatus').textContent='Histórico atualizado; verificações atuais são feitas pelo botão de cada cópia.';});
bind('backupCreateBtn',async()=>{try{const selected=selectedBackupProject();if(!selected||selected.state!=='ready')throw new Error('Selecione uma obra disponível.');await flush();$('backupCenterStatus').textContent='Criando e verificando cópia local…';const result=await api('backup-center/create','POST',{project_id:selected.id,archived:!!selected.archived,destination:$('backupDestination').value});await refreshBackupCenter();$('backupCenterStatus').textContent='Cópia local criada e verificada.'+(result.state_warning?' O resumo de execução não pôde ser salvo; a cópia permanece no histórico.':'');}catch(error){$('backupCenterStatus').textContent='Operação de cópia não confirmada. Confira o destino; a origem e cópias anteriores foram preservadas.';throw error;}});
bind('backupRunNowBtn',async()=>{try{await flush();$('backupCenterStatus').textContent='Conferindo obras ativas e executando rotina…';const result=await api('backup-center/run','POST',{});await refreshBackupCenter();const failed=result.results.filter(r=>r.failed).length,created=result.results.filter(r=>r.backup_id).length,unchanged=result.results.filter(r=>r.unchanged).length;$('backupCenterStatus').textContent=created+' cópias criadas · '+unchanged+' sem alterações · '+failed+' falhas.'+(result.results.some(r=>r.state_warning||r.retention_warning)?' Há aviso de registro/retenção; preserve as cópias e confira o destino.':'');}catch(error){$('backupCenterStatus').textContent='A rotina não pôde ser concluída. Confira a configuração e o destino; preserve as cópias existentes.';throw error;}});

// Translation and glossary use standard project documents and source references (schema 4).
function translationPairsLocal(){return activeNodes().filter(n=>n.source&&n.keywords?.includes('translation:source')).map(source=>({source,target:activeNodes().find(n=>n.kind==='text'&&!n.source&&source.source.refs.includes(n.id)),from:source.keywords.find(k=>k.startsWith('translation:from:'))?.slice(17)||'',to:source.keywords.find(k=>k.startsWith('translation:to:'))?.slice(15)||''}));}
function translationLanguage(id){const pair=translationPairsLocal().find(p=>p.target?.id===id||p.source.id===id);return pair?(pair.target?.id===id?pair.to:pair.from):null;}
function renderTranslations(){
 const pairs=translationPairsLocal(),done=pairs.filter(p=>p.target?.status==='done').length;$('translationProgress').textContent=pairs.length+' trechos · '+done+' concluídos · '+pairs.filter(p=>!p.target).length+' sem destino ativo';
 const list=$('translationCards');list.replaceChildren();
 for(const pair of pairs){const {source,target,from,to}=pair;if($('translationFilter').value&&target?.status!==$('translationFilter').value)continue;
  const card=el('article',undefined,'scene-card');card.append(el('span',from+' → '+to+' · '+(states[target?.status]||'Destino indisponível'),'card-path'),el('h2',target?.title||source.title));
  card.append(el('p',(project.documents[source.id]||'').slice(0,350),'translation-excerpt'));
  const original=project.documents[source.id]||'',translated=target?project.documents[target.id]||'':'',numbers=[...new Set(original.match(/\d+(?:[.,]\d+)*/g)||[])],missing=numbers.filter(n=>!(translated.match(/\d+(?:[.,]\d+)*/g)||[]).includes(n));
  card.append(el('p',count(original)+' palavras no original · '+count(translated)+' na tradução'+(!translated.trim()?' · Tradução vazia':missing.length?' · Conferir números: '+missing.slice(0,10).join(', '):' · Nenhum número ausente na conferência literal'),'muted'));
  const actions=el('div',undefined,'translation-actions'),edit=el('button','Traduzir lado a lado');edit.disabled=!target;edit.onclick=()=>perform(async()=>{await select(target.id);$('referencePanel').classList.remove('hidden');$('referenceBtn').setAttribute('aria-expanded','true');$('referenceSelect').value=source.id;$('referenceText').textContent=project.documents[source.id];$('referenceText').lang=from;$('writingLayout').classList.add('translating');status('Tradução aberta. O original está no painel de leitura; edite a tradução à esquerda.');});
  const sourceBtn=el('button','Editar original');sourceBtn.onclick=()=>perform(()=>select(source.id));actions.append(edit,sourceBtn);if(target)actions.append(documentActions(target));actions.append(documentActions(source));card.append(actions);list.append(card);
 }if(!pairs.length)list.append(el('p','Crie o primeiro trecho. Você poderá organizar as traduções em capítulos e manter os originais em Pesquisa.'));
}
bind('newTranslationBtn',()=>{$('translationForm').reset();$('translationDialog').showModal();$('translationTitle').focus();});
$('translationFilter').onchange=renderTranslations;
$('translationFile').onchange=()=>Promise.resolve().then(async()=>{const file=$('translationFile').files[0];if(!file)return;if(file.size>800000)throw new Error('Original muito grande para um trecho. Divida-o em seções.');const value=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(value.length>200000||value.includes('\0'))throw new Error('Use TXT/Markdown UTF-8 com até 200 mil caracteres.');if($('translationOriginal').value&&!confirm('Substituir a prévia do original pelo arquivo?'))return;$('translationOriginal').value=value;if(!$('translationTitle').value)$('translationTitle').value=file.name.replace(/\.(txt|md|markdown)$/i,'').slice(0,160);}).catch(report);
$('translationForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{await flush();await api(`projects/${project.id}/translation`,'POST',{title:$('translationTitle').value,from:$('translationFrom').value.trim(),to:$('translationTo').value.trim(),original:$('translationOriginal').value,translation:$('translationInitial').value});$('translationDialog').close();view='translation';await refresh();status('Trecho criado. Original preservado fora da publicação.');});};
bind('bilingualExportBtn',async()=>{await flush();const value=await api(`projects/${project.id}/bilingual`);download(value,safeName(project.name)+'-revisao-bilingue.md','text/markdown');});
function glossaryNodes(){return activeNodes().filter(n=>n.source&&n.keywords?.includes('language:glossary'));}
function renderLanguageTools(){
 const term=$('languageQuery').value.trim().slice(0,180),links=$('languageLinks');links.replaceChildren();
 if(term){const entries=[['Wikcionário — significados / traduções','https://pt.wiktionary.org/wiki/'+encodeURIComponent(term)],['Priberam — definição / sinônimos','https://dicionario.priberam.org/'+encodeURIComponent(term)],['Google Tradutor','https://translate.google.com/?'+new URLSearchParams({sl:$('lookupFrom').value.trim(),tl:$('lookupTo').value.trim(),text:term,op:'translate'})],['DeepL — abrir serviço','https://www.deepl.com/translator']];for(const [name,url] of entries){const link=el('a',name);link.href=url;link.target='_blank';link.rel='noopener noreferrer';links.append(link);}}
 const memory=$('translationMemoryResults');memory.replaceChildren();if(term){const matches=translationPairsLocal().filter(p=>p.target&&((project.documents[p.source.id]||'')+' '+(project.documents[p.target.id]||'')).toLocaleLowerCase().includes(term.toLocaleLowerCase())).slice(0,30);memory.append(el('h3','Memória local — '+matches.length+' trechos (máximo 30)'));for(const p of matches){const row=el('article');row.append(el('h4',p.target.title+' · '+p.from+' → '+p.to),el('pre',(project.documents[p.source.id]||'').slice(0,1000)+'\n→\n'+(project.documents[p.target.id]||'').slice(0,1000)));const open=el('button','Abrir tradução');open.onclick=()=>perform(async()=>{$('languageDialog').close();await select(p.target.id);});row.append(open);memory.append(row);}}
 const list=$('glossaryResults');list.replaceChildren();const found=glossaryNodes().filter(n=>(n.title+' '+project.documents[n.id]).toLocaleLowerCase().includes(term.toLocaleLowerCase()));
 list.append(el('p',found.length+' verbetes locais encontrados.','muted'));
 for(const n of found){const card=el('article');card.append(el('h3',n.title),el('pre',project.documents[n.id]));const edit=el('button','Abrir / editar verbete');edit.onclick=()=>perform(async()=>{$('languageDialog').close();await select(n.id);});const remove=el('button','Mover à lixeira');remove.onclick=()=>perform(async()=>{if(!confirm('Mover este verbete para a lixeira?'))return;await flush();await api(`projects/${project.id}/trash`,'POST',{id:n.id});await refresh();renderLanguageTools();});card.append(edit,remove);list.append(card);}
}
async function openLanguageTools(){if(!project)return;const editor=$('editor'),selection=isVisual()?globalThis.getSelection?.()?.toString():editor.value.slice(editor.selectionStart,editor.selectionEnd);$('languageQuery').value=(selection||'').trim().slice(0,180);const pair=translationPairsLocal().find(p=>p.target?.id===selected||p.source.id===selected);if(pair){$('lookupFrom').value=pair.from;$('lookupTo').value=pair.to;}renderLanguageTools();$('languageDialog').showModal();$('languageQuery').focus();}
bind('languageToolsBtn',openLanguageTools);bind('translationDictionaryBtn',openLanguageTools);
$('languageQuery').oninput=renderLanguageTools;$('lookupFrom').oninput=renderLanguageTools;$('lookupTo').oninput=renderLanguageTools;
bind('newGlossaryBtn',()=>{$('glossaryForm').reset();$('glossaryTerm').value=$('languageQuery').value;$('glossaryDialog').showModal();});
$('glossaryForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{await flush();const input={term:$('glossaryTerm').value,from:$('lookupFrom').value.trim(),to:$('lookupTo').value.trim()};for(const key of ['definition','synonyms','equivalents','context','provenance'])input[key]=$('glossary'+key[0].toUpperCase()+key.slice(1)).value;await api(`projects/${project.id}/glossary`,'POST',input);$('glossaryDialog').close();await refresh();renderLanguageTools();status('Verbete salvo no projeto e incluído nos próximos backups.');});};
bind('exportGlossaryBtn',async()=>{await flush();download('# Glossário — '+project.name+'\n\n'+glossaryNodes().map(n=>project.documents[n.id]).join('\n\n---\n\n'),safeName(project.name)+'-glossario.md','text/markdown');});

let extractionDraft=null,machineForInitial=false,machinePreviewInput=null;
async function openExtraction(asset){await flush();const key=project.id;status('Extraindo texto localmente…');const result=await api(`projects/${key}/extract-attachment`,'POST',{asset_id:asset.id});if(project.id!==key)return;extractionDraft={...result,key};$('extractionTitle').value=asset.name.replace(/\.[^.]+$/,'').slice(0,150);$('extractionText').value=result.text;$('extractionInfo').textContent=asset.name+' · '+result.warnings.join(' ');$('extractionResearchBtn').disabled=!result.text.trim();$('extractionTranslationBtn').disabled=!result.text.trim();$('extractionDialog').showModal();status('Extração concluída. Revise a prévia antes de criar um documento.');}
async function useExtraction(mode){if(!extractionDraft||extractionDraft.key!==project?.id)throw new Error('Reabra a prévia do anexo');await flush();const field=$('extractionText'),text=field.selectionEnd>field.selectionStart?field.value.slice(field.selectionStart,field.selectionEnd):field.value;if(!text.trim()||text.length>200000)throw new Error('Selecione um trecho ou mantenha na prévia até 200 mil caracteres para este documento.');const result=await api(`projects/${project.id}/use-extraction`,'POST',{asset_id:extractionDraft.asset_id,sha256:extractionDraft.sha256,text,title:$('extractionTitle').value,mode,from:$('extractionFrom').value.trim(),to:$('extractionTo').value.trim()});$('extractionDialog').close();extractionDraft=null;view=mode==='translation'?'translation':'write';selected=result.id||result.target_id;await refresh();status('Documento criado e vinculado ao anexo; original preservado.');}
$('extractionText').oninput=()=>{const empty=!$('extractionText').value.trim();$('extractionResearchBtn').disabled=empty;$('extractionTranslationBtn').disabled=empty;};
bind('extractionResearchBtn',()=>useExtraction('research'));bind('extractionTranslationBtn',()=>useExtraction('translation'));
bind('localDictionaryBtn',async()=>{const term=$('languageQuery').value.trim(),language=$('lookupFrom').value.trim();if(!term)throw new Error('Informe uma palavra');$('localDictionaryResults').textContent='Consultando bases locais…';const [synonyms,lexicon]=await Promise.all([api('language/synonyms','POST',{term,language}),api('language/lexicon','POST',{operation:'lookup',term,language})]);const lines=[synonyms.source||'MyThes',synonyms.notice,...synonyms.senses.map(s=>s.label+': '+s.words.join('; '))];if(lexicon.name)lines.push('\n'+lexicon.name+' · '+lexicon.entries+' verbetes\nFonte: '+lexicon.source+'\nLicença: '+lexicon.license);for(const e of lexicon.results)lines.push('\n'+e.term+': '+e.definition+'\nSinônimos: '+e.synonyms.join('; ')+'\nTraduções: '+e.translations.map(t=>t.language+': '+t.text).join('; '));if(!lexicon.results.length)lines.push('Sem definição na base lexical importada para este termo/idioma.');$('localDictionaryResults').textContent=lines.join('\n');});
bind('importLexiconBtn',()=>$('lexiconFile').click(),false);
$('lexiconFile').onchange=()=>perform(async()=>{const file=$('lexiconFile').files?.[0];if(!file)return;try{if(file.size>10000000)throw new Error('Base lexical limitada a 10 MB');const data=JSON.parse(await file.text());if(!confirm('Substituir a base lexical compartilhada por todos os projetos? Baixe a base atual antes, se quiser preservá-la. Importe apenas dados que você pode utilizar.'))return;const result=await api('language/lexicon','POST',{operation:'import',confirm:true,data});$('localDictionaryResults').textContent=result.name+' — '+result.entries+' verbetes disponíveis offline.';}finally{$('lexiconFile').value='';}});
bind('exportLexiconBtn',async()=>{const data=await api('language/lexicon');if(!data)throw new Error('Nenhuma base lexical importada');download(JSON.stringify(data,null,2),'writingroom-lexicon.json','application/json');});
bind('lexiconExampleBtn',()=>download(JSON.stringify({format:'writingroom-lexicon-1',name:'Meu dicionário',source:'Definições autorais',license:'Uso autorizado pelo autor',entries:[{term:'casa',language:'pt-BR',definition:'Exemplo autoral: lugar de moradia.',synonyms:['lar'],translations:[{language:'en',text:'house'}]}]},null,2),'modelo-lexicon.json','application/json'));
async function openMachine(initial=false){machineForInitial=initial;machinePreviewInput=null;for(const id of ['machineInput','machineFrom','machineTo'])$(id).readOnly=initial;const input=initial?$('translationOriginal').value:$('languageQuery').value;if(input.length>10000)throw new Error('Selecione até 10 mil caracteres para tradução automática');$('machineInput').value=input;$('machineFrom').value=initial?$('translationFrom').value:$('lookupFrom').value;$('machineTo').value=initial?$('translationTo').value:$('lookupTo').value;$('machineOutput').value='';$('machineConsent').checked=false;const info=await api('language/status');$('machineProvider').textContent=info.translator?info.translator.label+' · '+info.translator.origin:'Sem serviço configurado. Configure WRITINGROOM_TRANSLATE_URL no servidor (LibreTranslate local ou HTTPS).';$('machineRequestBtn').disabled=!info.translator;$('machineUseBtn').disabled=true;$('machineDialog').showModal();}
bind('translateInitialBtn',()=>openMachine(true));bind('openMachineTranslationBtn',()=>openMachine(false));
bind('machineRequestBtn',async()=>{const input={text:$('machineInput').value,from:$('machineFrom').value.trim(),to:$('machineTo').value.trim(),consent:$('machineConsent').checked};$('machineOutput').value='';$('machineUseBtn').disabled=true;machinePreviewInput=null;const result=await api('language/translate','POST',input);machinePreviewInput=input;$('machineOutput').value=result.text;$('machineUseBtn').disabled=false;$('machineProvider').textContent='Prévia recebida de '+result.provider+'. Revise antes de usar.';});
bind('machineUseBtn',()=>{if(!machinePreviewInput||machinePreviewInput.text!==$('machineInput').value||machinePreviewInput.from!==$('machineFrom').value.trim()||machinePreviewInput.to!==$('machineTo').value.trim())throw new Error('Texto ou idiomas mudaram. Solicite uma nova prévia antes de usar.');if(!machineForInitial){$('translationForm').reset();$('translationTitle').value='Tradução de consulta';$('translationOriginal').value=$('machineInput').value;$('translationFrom').value=$('machineFrom').value;$('translationTo').value=$('machineTo').value;$('translationDialog').showModal();}$('translationInitial').value=$('machineOutput').value;$('machineDialog').close();status('Prévia copiada para tradução inicial; Criar trecho confirma.');});

let comparisonContext=null,comparisonResult=null,comparisonPage=500,comparisonPosition=-1;
async function openVersionComparison(saved,id,left){
 comparisonContext={projectId:saved.id,nodeId:id,saved};for(const side of ['Left','Right']){const select=$('comparison'+side);select.replaceChildren();const current=el('option','Texto atual no disco');current.value='current';select.append(current);for(const version of saved.snapshots.filter(s=>s.node_id===id).slice().reverse()){const option=el('option',version.label+' · '+new Date(version.created_at).toLocaleString('pt-BR'));option.value=version.id;select.append(option);}}
 $('comparisonLeft').value=left||saved.snapshots.filter(s=>s.node_id===id).at(-1)?.id||'current';$('comparisonRight').value='current';$('comparisonOnlyChanges').checked=false;$('comparisonDialog').showModal();await runVersionComparison();
}
async function runVersionComparison(){if(!comparisonContext||project?.id!==comparisonContext.projectId)throw new Error('Reabra as versões do documento.');await flush();const data=await api(`projects/${comparisonContext.projectId}/compare-versions`,'POST',{node_id:comparisonContext.nodeId,left:$('comparisonLeft').value,right:$('comparisonRight').value});comparisonResult=data;comparisonPage=500;comparisonPosition=-1;$('comparisonLeftLabel').textContent='Esquerda: '+data.left.label;$('comparisonRightLabel').textContent='Direita: '+data.right.label;$('comparisonSummary').textContent=data.equal?'Textos idênticos.':data.added+' linhas inseridas · '+data.removed+' removidas · '+data.unchanged+' iguais';$('comparisonNotice').textContent=[data.semantic_difference?'Há diferença de formatação, anotações ou modo visual. Os destaques abaixo comparam somente o texto.':'Comparação textual por linhas; quebras de linha também contam como alteração.',data.coarse?'Trecho grande: comparação simplificada por bloco para limitar o uso de memória; inserções e exclusões podem incluir linhas iguais internas.':''].filter(Boolean).join(' ');renderComparisonRows();}
function renderComparisonRows(){const list=$('comparisonRows');list.replaceChildren();if(!comparisonResult)return;const rows=comparisonResult.rows.filter(r=>!$('comparisonOnlyChanges').checked||r.kind!=='same');for(const row of rows.slice(0,comparisonPage)){const item=el('section',undefined,'version-diff-row');item.setAttribute('data-kind',row.kind);item.tabIndex=-1;item.setAttribute('aria-label',row.kind==='same'?'Linha igual':row.kind==='change'?'Linha alterada':row.kind==='add'?'Linha inserida':'Linha removida');for(const side of ['left','right']){const cell=el('div',undefined,'version-diff-cell'),content=el('div');content.append(el('span',side==='left'?'Esquerda':'Direita','version-side-label'),el('pre',row[side]??'∅'));cell.append(el('span',row[side+'_line']===null?'—':String(row[side+'_line']),'version-line-number'),content);item.append(cell);}list.append(item);}if(!rows.length)list.append(el('p','Nenhuma linha diferente neste filtro.'));$('comparisonMoreBtn').hidden=rows.length<=comparisonPage;comparisonPosition=-1;}
function navigateComparison(delta){const changes=Array.from($('comparisonRows').querySelectorAll('.version-diff-row:not([data-kind="same"])'));if(!changes.length)return;comparisonPosition=comparisonPosition<0?(delta>0?0:changes.length-1):(comparisonPosition+delta+changes.length)%changes.length;changes[comparisonPosition].focus();changes[comparisonPosition].scrollIntoView({block:'nearest'});}
bind('openComparisonBtn',async()=>{if(!comparisonContext)return;const saved=await api('projects/'+comparisonContext.projectId);await openVersionComparison(saved,comparisonContext.nodeId);});
bind('comparisonRunBtn',runVersionComparison);bind('comparisonSwapBtn',async()=>{const left=$('comparisonLeft').value;$('comparisonLeft').value=$('comparisonRight').value;$('comparisonRight').value=left;await runVersionComparison();});
bind('comparisonPreviousBtn',()=>navigateComparison(-1),false);bind('comparisonNextBtn',()=>navigateComparison(1),false);
for(const side of ['Left','Right'])$('comparison'+side).onchange=()=>{comparisonResult=null;renderComparisonRows();$('comparisonMoreBtn').hidden=true;$('comparisonSummary').textContent='Seleção alterada. Clique Comparar para consultar os textos.';$('comparisonLeftLabel').textContent='';$('comparisonRightLabel').textContent='';$('comparisonNotice').textContent='';};
$('comparisonOnlyChanges').onchange=renderComparisonRows;bind('comparisonMoreBtn',()=>{comparisonPage+=500;renderComparisonRows();},false);

let proposalDraft=null,reviewDecisionDraft=null;
function updateProposalPreview(){if(!proposalDraft)return;const original=$('proposalSource').value.slice(proposalDraft.start,proposalDraft.end);$('proposalRemoved').textContent=original||'∅ — inserção no cursor';$('proposalInserted').textContent=$('proposalReplacement').value||'∅ — exclusão';$('proposalRangeInfo').textContent=original.length+' caracteres selecionados · '+(proposalDraft.visual?'Documento visual':'Texto simples');}
async function openProposal(){if(node(selected)?.kind!=='text')throw new Error('Abra uma cena antes de propor alterações.');const source=$('editor'),visual=isVisual(),quote=visual?richController?.selectedText||'':source.value.slice(source.selectionStart,source.selectionEnd);let start=visual?0:source.selectionStart,end=visual?0:source.selectionEnd;await flush();const text=project.documents[selected];if(visual&&quote&&text.indexOf(quote)===text.lastIndexOf(quote)){start=text.indexOf(quote);end=start+quote.length;}proposalDraft={projectId:project.id,nodeId:selected,base_hash:project.rich_hashes[selected],start,end,visual};$('proposalForm').reset();$('proposalRole').value=perspective==='editor'?'editor':'writer';$('proposalSource').value=text;$('proposalSource').setSelectionRange(start,end);$('proposalAuthor').value=readLocal('writingroom.review-author')||'';updateProposalPreview();$('proposalDialog').showModal();}
bind('proposeReviewBtn',openProposal);bind('newReviewBtn',openProposal);
bind('proposalSelectionBtn',()=>{if(!proposalDraft)return;proposalDraft.start=$('proposalSource').selectionStart;proposalDraft.end=$('proposalSource').selectionEnd;updateProposalPreview();},false);
$('proposalReplacement').oninput=updateProposalPreview;
$('proposalForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{if(!proposalDraft||proposalDraft.projectId!==project?.id)throw new Error('Reabra a proposta.');await flush();const input={node_id:proposalDraft.nodeId,start:proposalDraft.start,end:proposalDraft.end,base_hash:proposalDraft.base_hash,replacement:$('proposalReplacement').value,author:$('proposalAuthor').value,role:$('proposalRole').value,reason:$('proposalReason').value};await api(`projects/${project.id}/review-propose`,'POST',input);writeLocal('writingroom.review-author',input.author);$('proposalDialog').close();proposalDraft=null;view='review';await refresh();status('Proposta guardada; o texto permanece inalterado.');});};
function renderReviews(){renderEditorialRounds();const list=$('reviewCards');list.replaceChildren();$('newReviewBtn').disabled=node(selected)?.kind!=='text';const all=project.reviews||[],active=all.filter(r=>node(r.node_id)&&!trashed(node(r.node_id)));$('reviewSummary').textContent=active.length+' propostas · '+active.filter(r=>r.status==='pending').length+' pendentes · '+active.filter(r=>r.status==='accepted').length+' aceitas';for(const r of active.filter(r=>(!$('reviewStatusFilter').value||r.status===$('reviewStatusFilter').value)&&(!$('reviewRoleFilter').value||r.role===$('reviewRoleFilter').value)).slice().reverse()){
 const stale=r.status==='pending'&&r.base_hash!==project.rich_hashes[r.node_id],card=el('article',undefined,'scene-card');card.append(el('span',(r.role==='editor'?'Editor':'Escritor')+' · '+r.author+' · '+new Date(r.created_at).toLocaleString('pt-BR'),'card-path'),el('h2',node(r.node_id).title),el('p',({pending:'Pendente',accepted:'Aceita — histórico',rejected:'Rejeitada'})[r.status]+(stale?' · Conflito: documento alterado':'')));const preview=el('div',undefined,'redline-preview');preview.append(el('del',r.original||'∅ — inserção'),el('ins',r.replacement||'∅ — exclusão'));card.append(preview,el('p',r.reason||'Sem justificativa.'));if(r.decision)card.append(el('p','Decisão de '+r.decision.author+' · '+new Date(r.decision.at).toLocaleString('pt-BR')+' · '+r.decision.reason,'muted'));
 if(r.exchange){const linked=project.editorial_rounds?.find(x=>x.id===r.exchange.round_id);if(linked)card.append(el('p','Vinculada à rodada '+linked.title+' · chave do revisor '+linked.reviewer_fingerprint+' · Nome de autoria declarado.','muted'));}const actions=el('div',undefined,'review-actions'),open=el('button','Abrir cena');open.onclick=()=>perform(()=>select(r.node_id));actions.append(open);if(r.status==='pending'){const accept=el('button','Aceitar'),reject=el('button','Rejeitar');accept.disabled=stale;accept.onclick=()=>perform(()=>openReviewDecision(r,'accept'));reject.onclick=()=>perform(()=>openReviewDecision(r,'reject'));actions.append(accept,reject);if(stale){const repropose=el('button','Nova proposta no texto atual');repropose.onclick=()=>perform(async()=>{await select(r.node_id);await openProposal();$('proposalReplacement').value=r.replacement;$('proposalReason').value=r.reason;updateProposalPreview();});actions.append(repropose);}}card.append(actions);list.append(card);
 }if(!list.children.length)list.append(el('p','Nenhuma proposta neste filtro. Selecione texto em uma cena e use Propor alteração.'));}
async function openReviewDecision(r,operation){await flush();reviewDecisionDraft={projectId:project.id,id:r.id,operation,base_review_hash:project.review_hashes[r.id],base_hash:project.rich_hashes[r.node_id]};$('reviewDecisionForm').reset();$('reviewDecisionAuthor').value=readLocal('writingroom.review-author')||'';$('reviewDecisionHeading').textContent=operation==='accept'?'Aceitar proposta':'Rejeitar proposta';$('reviewDecisionInfo').textContent=operation==='accept'?'Aplicar a alteração de '+r.author+' e guardar versão anterior. Outras propostas sobre a base antiga poderão ficar em conflito.':'Rejeitar a proposta de '+r.author+' sem alterar o texto.';$('reviewDecisionSubmit').textContent=operation==='accept'?'Aceitar e preservar versão':'Rejeitar proposta';$('reviewDecisionDialog').showModal();}
$('reviewDecisionForm').onsubmit=event=>{event.preventDefault();return perform(async()=>{if(!reviewDecisionDraft||reviewDecisionDraft.projectId!==project?.id)throw new Error('Atualize as propostas.');await api(`projects/${project.id}/review-decide`,'POST',{...reviewDecisionDraft,author:$('reviewDecisionAuthor').value,reason:$('reviewDecisionReason').value});writeLocal('writingroom.review-author',$('reviewDecisionAuthor').value);$('reviewDecisionDialog').close();reviewDecisionDraft=null;await refresh();status('Decisão guardada. O histórico da proposta foi preservado.');});};
bind('refreshReviewsBtn',async()=>{await flush();await refresh();});$('reviewStatusFilter').onchange=renderReviews;$('reviewRoleFilter').onchange=renderReviews;

let perspective=readLocal('writingroom.perspective')==='editor'?'editor':'writer',editorialData=[],trackingContext=null;
const stageNames={unassigned:'Sem etapa',assessment:'Avaliação',editing:'Edição','author-review':'Revisão do escritor',ready:'Pronta'};
function perspectiveLabel(){$('perspectiveBtn').textContent='Configurações · '+(perspective==='editor'?'Editor':'Escritor');}
perspectiveLabel();
bind('perspectiveBtn',()=>{$('perspectiveMode').value=perspective;$('perspectiveDialog').showModal();});
$('perspectiveForm').onsubmit=event=>{event.preventDefault();perform(async()=>{await flush();const next=$('perspectiveMode').value;if(!writeLocal('writingroom.perspective',next))throw new Error('Não foi possível guardar a preferência neste navegador.');perspective=next;perspectiveLabel();$('perspectiveDialog').close();await library();});};
async function renderEditorialDashboard(archived=false){
 const enabled=perspective==='editor'&&!archived;$('editorialDashboard').classList.toggle('hidden',!enabled);$('bookList').classList.toggle('hidden',enabled);$('libraryHeading').textContent=perspective==='editor'?'Sua mesa editorial.':'Uma casa para as suas histórias.';if(!enabled)return;
 $('libraryEmpty').classList.add('hidden');editorialData=await api('editorial');renderEditorialCards();
}
function renderEditorialCards(){
 const list=$('editorialCards');list.replaceChildren();const stage=$('editorialStageFilter').value,pending=$('editorialPendingFilter').value;
 const filtered=editorialData.filter(p=>p.state==='unavailable'||((!stage||p.tracking.stage===stage)&&(!pending||p[pending]>0)));
 $('editorialCount').textContent=filtered.length+' de '+editorialData.length+' obras locais';
 for(const p of filtered){const card=el('article',undefined,'scene-card');card.append(el('h3',p.name));if(p.state==='unavailable'){card.append(el('p','Projeto indisponível. Preserve a pasta e consulte a biblioteca no modo Escritor.'));list.append(card);continue;}
 card.append(el('p',p.pending+' propostas pendentes · '+p.conflicts+' conflitos · '+p.comments+' comentários abertos'),el('p',stageNames[p.tracking.stage]+' · Responsável declarado: '+(p.tracking.responsible||'Não informado')),el('p',p.tracking.notes),el('p','Próximos passos: '+(p.tracking.next_steps||'Não informados')));
 const actions=el('div',undefined,'review-actions');for(const [label,action] of [['Abrir revisão',()=>openProject(p.id)],['Acompanhar obra',()=>openTracking(p)]]){const b=el('button',label);b.onclick=()=>perform(action);actions.append(b);}card.append(actions);
 for(const scene of p.scenes){const row=el('div',undefined,'editorial-scene');row.append(el('strong',scene.title),el('p',scene.pending+' pendentes · '+scene.conflicts+' conflitos · '+scene.comments+' comentários · '+scene.history+' decisões · '+scene.versions+' versões'));const buttons=el('div',undefined,'review-actions');for(const [label,target] of [['Abrir cena','write'],['Histórico de propostas','review'],['Versões / comparar','versions']]){const b=el('button',label);b.onclick=()=>perform(async()=>{await openProject(p.id);await select(scene.id);if(target==='review'){$('reviewStatusFilter').value='';view='review';renderView();}if(target==='versions')await openVersions();});buttons.append(b);}row.append(buttons);card.append(row);}list.append(card);
 }if(!filtered.length)list.append(el('p','Nenhuma obra neste filtro.'));
}
async function openTracking(p){const current=await api('projects/'+p.id);trackingContext={id:p.id,base_hash:current.tracking_hash};const t=current.editorial_tracking||{responsible:'',stage:'unassigned',notes:'',next_steps:''};$('trackingTitle').textContent='Acompanhamento · '+current.name;for(const [id,key] of [['trackingResponsible','responsible'],['trackingStage','stage'],['trackingNotes','notes'],['trackingNext','next_steps']])$(id).value=t[key];$('trackingError').textContent='';$('trackingDialog').showModal();}
$('trackingForm').onsubmit=event=>{event.preventDefault();perform(async()=>{if(!trackingContext)return;try{await api('projects/'+trackingContext.id+'/editorial-tracking','POST',{base_hash:trackingContext.base_hash,tracking:{responsible:$('trackingResponsible').value,stage:$('trackingStage').value,notes:$('trackingNotes').value,next_steps:$('trackingNext').value}});}catch(error){$('trackingError').textContent=error.message+' Seus campos foram preservados. Cancele e reabra para consultar o estado atual.';status(error.message);return;}$('trackingDialog').close();trackingContext=null;await library();status('Acompanhamento editorial guardado na obra.');});};
$('editorialStageFilter').onchange=renderEditorialCards;$('editorialPendingFilter').onchange=renderEditorialCards;bind('editorialRefreshBtn',()=>renderEditorialDashboard());
let packagePreviewState=null,packageOpenState=null,packageOpeningGeneration=0,packageRoundMode=false;
function exportPackageFields(){return {...($('packageSignatureMode').value==='signed'?{signature_mode:'signed',identity_hash:identityData?.hash,sender_fingerprint:identityData?.active_fingerprint,recipient_fingerprint:$('packageKeyRecipient').value}:{signature_mode:'unsigned'}),title:$('packageTitle').value,sender:$('packageSender').value,recipient:$('packageRecipient').value,node_ids:[...$('packageSceneChoices').querySelectorAll('input:checked')].map(i=>i.value)};}
function invalidatePackagePreview(){packagePreviewState=null;$('packageEncryptBtn').disabled=true;$('packageExportPreview').replaceChildren();$('packageExportStatus').textContent='Confira a prévia após escolher as cenas e identificações.';}
function showPackageContent(container,content){container.replaceChildren();container.append(el('h3',content.title),el('p','Remetente declarado: '+content.sender+' · Destinatário declarado: '+content.recipient));if(content.created_at)container.append(el('p','Cópia criada em '+new Date(content.created_at).toLocaleString('pt-BR')));for(const scene of content.scenes){const row=el('section');row.append(el('h4',scene.title),el('pre',scene.text));if(scene.rich_document){const notes=[];function walk(n){for(const m of n.marks||[])if(m.type==='footnote'&&!notes.some(a=>a.id===m.attrs.id))notes.push(m.attrs);for(const child of n.content||[])walk(child);}walk(scene.rich_document.doc);for(const note of notes)row.append(el('p','Nota de publicação: '+note.body));}container.append(row);}}
async function openPackageExport(round=false){packageRoundMode=round;await flush();$('packageExportForm').reset();identityData=await api('identities');populatePackageSigning();$('packageTitle').value=project.name.slice(0,180);const choices=$('packageSceneChoices');choices.replaceChildren();for(const n of await api('projects/'+project.id+'/package-candidates')){const label=el('label'),input=el('input');input.type='checkbox';input.value=n.id;input.onchange=invalidatePackagePreview;label.append(input,document.createTextNode(n.title));choices.append(label);}invalidatePackagePreview();$('packageExportDialog').showModal();$('packageSignatureMode').disabled=round;if(round){$('packageSignatureMode').value='signed';updatePackageSigningFields();}$('packageExportHeading').textContent=round?'Nova rodada editorial — base congelada':'Pacote editorial cifrado';$('packageEncryptBtn').textContent=round?'Criar rodada e baixar':'Cifrar e baixar';}
bind('exportPackageBtn',()=>openPackageExport(false));bind('newRoundBtn',()=>openPackageExport(true));
for(const id of ['packageTitle','packageSender','packageRecipient'])$(id).oninput=invalidatePackagePreview;
bind('packagePreviewBtn',async()=>{await flush();invalidatePackagePreview();try{const input=exportPackageFields(),preview=await api('projects/'+project.id+(packageRoundMode?'/round-preview':'/package-preview'),'POST',input);packagePreviewState={projectId:project.id,input,hash:preview.hash};showPackageContent($('packageExportPreview'),preview.content);if(preview.signing)$('packageExportPreview').append(el('p','Assinatura: '+preview.signing.sender_name+' · '+preview.signing.sender_fingerprint+' → '+preview.signing.recipient_name+' · '+preview.signing.recipient_fingerprint));$('packageExportPreview').append(el('p',preview.omitted));$('packageExportStatus').textContent=preview.content.scenes.length+' cenas · '+preview.bytes+' bytes em claro. Confira texto, links e notas antes de cifrar.';$('packageEncryptBtn').disabled=false;}catch(error){$('packageExportStatus').textContent=error.message;}});
$('packageExportForm').onsubmit=event=>{event.preventDefault();perform(async()=>{if(!packagePreviewState||packagePreviewState.projectId!==project?.id)return;try{const input=exportPackageFields();if(JSON.stringify(input)!==JSON.stringify(packagePreviewState.input)){invalidatePackagePreview();return;}await flush();const creatingRound=packageRoundMode;$('packageExportForm').inert=creatingRound;const data=await api('projects/'+project.id+(creatingRound?'/round-create':'/package-export'),'POST',{...input,preview_hash:packagePreviewState.hash,passphrase:$('packagePassphrase').value,confirm_passphrase:$('packagePassphraseConfirm').value,key_passphrase:$('packageKeyPassphrase').value});const encrypted=creatingRound?data.package:data;if(!$('packageExportDialog').open)return;download(JSON.stringify(encrypted),creatingRound?'editorial.wroom-round.json':'editorial.wroom-package.json','application/json');$('packageExportDialog').close();if(creatingRound)await refresh();status('Pacote cifrado preparado para download. Nenhum envio realizado.');}catch(error){if(error.status===409)invalidatePackagePreview();$('packageExportStatus').textContent=error.message;}finally{$('packageExportForm').inert=false;$('packagePassphrase').value='';$('packagePassphraseConfirm').value='';$('packageKeyPassphrase').value='';}});};
$('packageExportDialog').oncancel=event=>{if(packageRoundMode&&busy)event.preventDefault();};
$('packageExportDialog').addEventListener?.('close',()=>{packagePreviewState=null;$('packageKeyPassphrase').value='';$('packagePassphrase').value='';$('packagePassphraseConfirm').value='';$('packageExportPreview').replaceChildren();});
async function discardPackageStaging(){const old=packageOpenState;packageOpenState=null;packageOpeningGeneration++;$('packageImportBtn').disabled=true;$('packageOpenPreview').replaceChildren();if(old)await api('packages/cancel','POST',{token:old.token});}
bind('openPackageLibraryBtn',async()=>{await flush();await discardPackageStaging();$('packageOpenForm').reset();$('packageOpenStatus').textContent='Escolha o pacote e informe a frase combinada.';$('packageOpenDialog').showModal();});
$('packageOpenForm').onsubmit=event=>{event.preventDefault();perform(async()=>{await discardPackageStaging();const generation=packageOpeningGeneration;try{const file=$('packageFile').files?.[0];if(!file||file.size>11000000)throw new Error('Escolha um pacote de até 11 MB.');$('packageOpenStatus').textContent='Decifrando e verificando integridade…';const result=await api('packages/open','POST',{file:await file.text(),passphrase:$('packageOpenPassphrase').value,recipient:$('packageExpectedRecipient').value,require_signature:$('packageRequireSignature').checked});if(generation!==packageOpeningGeneration||!$('packageOpenDialog').open){await api('packages/cancel','POST',{token:result.token});return;}packageOpenState={token:result.token};showPackageContent($('packageOpenPreview'),result.content);$('packageOpenStatus').textContent=result.content.scenes.length+' cenas · '+(result.verification?.kind==='pinned-key'?'Assinatura conferida da chave de '+result.verification.contact_name+' · '+result.verification.sender_fingerprint:'Sem assinatura: remetente somente declarado.')+' Sem verificação de e-mail. A assinatura não será anexada à obra independente.';$('packageImportBtn').disabled=false;}catch(error){$('packageOpenStatus').textContent=error.message;}finally{$('packageOpenPassphrase').value='';}});};
for(const id of ['packageFile','packageExpectedRecipient','packageOpenPassphrase','packageRequireSignature'])$(id).oninput=()=>{packageOpeningGeneration++;if(packageOpenState)discardPackageStaging().catch(report);$('packageOpenStatus').textContent='Entrada alterada. Decifre e confira novamente.';};
bind('packageImportBtn',async()=>{if(!packageOpenState)return;try{const result=await api('packages/confirm','POST',{token:packageOpenState.token,confirm:true});packageOpenState=null;$('packageOpenDialog').close();await openProject(result.id);status('Cópia independente criada. Obra de origem preservada.');}catch(error){$('packageOpenStatus').textContent=error.message;}});
bind('packageCancelOpenBtn',async()=>{await discardPackageStaging();$('packageOpenDialog').close();});
$('packageOpenDialog').addEventListener?.('close',()=>{$('packageOpenPassphrase').value='';$('packageFile').value='';discardPackageStaging().catch(report);});

let identityData=null,identityCardDraft=null;
function cardFromPublic(i){return {format:'writingroom-public-key',version:1,name:i.name,public_key:i.public_key,fingerprint:i.fingerprint};}
function renderIdentities(){const own=$('identityOwnList'),contacts=$('identityContactsList');own.replaceChildren();contacts.replaceChildren();for(const i of identityData.identities){const row=el('section',undefined,'identity-row');row.append(el('h4',i.name+' · '+(i.retired?'Inativa':'Ativa')),el('code',i.fingerprint));const actions=el('div',undefined,'review-actions'),card=el('button','Baixar cartão público'),backup=el('button','Backup cifrado da chave');card.onclick=()=>download(JSON.stringify(cardFromPublic(i),null,2),'identidade.wroom-public-key.json','application/json');backup.onclick=()=>perform(async()=>{try{const record=await api('identities/backup','POST',{fingerprint:i.fingerprint});download(JSON.stringify(record,null,2),'identidade.wroom-key.json','application/json');$('identityStatus').textContent='Backup cifrado preparado. Guarde a frase da chave separadamente.';}catch(error){$('identityStatus').textContent=error.message;}});actions.append(card,backup);row.append(actions);own.append(row);}if(!identityData.identities.length)own.append(el('p','Nenhuma chave local. Crie ou restaure uma identidade.'));for(const c of identityData.contacts){const row=el('section',undefined,'identity-row');row.append(el('h4',c.card.name+' · '+(c.revoked_at?'Revogada':'Conferida por outro canal')),el('code',c.card.fingerprint));if(!c.revoked_at){const revoke=el('button','Revogar confiança');revoke.onclick=()=>perform(async()=>{if(!confirm('Revogar esta chave nesta instalação? Cópias e pacotes já entregues permanecem disponíveis.'))return;try{identityData=await api('identities/revoke','POST',{fingerprint:c.card.fingerprint,base_hash:identityData.hash});renderIdentities();$('identityStatus').textContent='Chave revogada nesta instalação.';}catch(error){$('identityStatus').textContent=error.message;}});row.append(revoke);}contacts.append(row);}if(!identityData.contacts.length)contacts.append(el('p','Nenhum contato conferido.'));}
bind('identitiesBtn',async()=>{await flush();identityData=await api('identities');identityCardDraft=null;for(const id of ['identityCreateForm','identityRestoreForm','identityTrustForm'])$(id).reset();$('identityReplaceFingerprint').value='';$('identityTrustBtn').disabled=true;$('identityCardPreview').replaceChildren();$('identityStatus').textContent='As chaves ficam separadas das obras. Nomes são declarados.';renderIdentities();$('identitiesDialog').showModal();});
$('identityCreateForm').onsubmit=event=>{event.preventDefault();perform(async()=>{try{identityData=await api('identities/create','POST',{name:$('identityName').value,passphrase:$('identityPassphrase').value,confirm_passphrase:$('identityPassphraseConfirm').value,base_hash:identityData.hash,replace_fingerprint:$('identityReplaceFingerprint').value});renderIdentities();$('identityReplaceFingerprint').value='';$('identityStatus').textContent='Chave criada e protegida. Baixe seu backup cifrado e confira cartões por outro canal.';}catch(error){$('identityStatus').textContent=error.message;}finally{$('identityPassphrase').value='';$('identityPassphraseConfirm').value='';}});};
$('identityRestoreForm').onsubmit=event=>{event.preventDefault();perform(async()=>{try{const file=$('identityBackupFile').files?.[0];if(!file||file.size>8192)throw new Error('Selecione backup de chave de até 8 KB.');identityData=await api('identities/restore','POST',{file:await file.text(),passphrase:$('identityRestorePassphrase').value,base_hash:identityData.hash,replace_fingerprint:$('identityReplaceFingerprint').value});renderIdentities();$('identityStatus').textContent='Chave conferida e restaurada. Contatos não foram importados.';$('identityBackupFile').value='';$('identityReplaceFingerprint').value='';}catch(error){$('identityStatus').textContent=error.message;}finally{$('identityRestorePassphrase').value='';}});};
function invalidateIdentityCard(){identityCardDraft=null;$('identityTrustBtn').disabled=true;$('identityConfirmedFingerprint').value='';$('identityCardPreview').replaceChildren();}
$('identityCardFile').onchange=invalidateIdentityCard;
bind('identityCardPreviewBtn',async()=>{invalidateIdentityCard();try{const file=$('identityCardFile').files?.[0];if(!file||file.size>4096)throw new Error('Selecione cartão público de até 4 KB.');const text=await file.text(),card=await api('identities/trust-preview','POST',{file:text});identityCardDraft={file:text,card};$('identityCardPreview').append(el('p',card.name+' · Nome declarado'),el('code',card.fingerprint));$('identityStatus').textContent='Compare a impressão completa por outro canal antes de registrar.';}catch(error){$('identityStatus').textContent=error.message;}});
$('identityConfirmedFingerprint').oninput=()=>{$('identityTrustBtn').disabled=!identityCardDraft||$('identityConfirmedFingerprint').value!==identityCardDraft.card.fingerprint;};
$('identityTrustForm').onsubmit=event=>{event.preventDefault();perform(async()=>{if(!identityCardDraft)return;try{identityData=await api('identities/trust','POST',{file:identityCardDraft.file,confirmed_fingerprint:$('identityConfirmedFingerprint').value,base_hash:identityData.hash});renderIdentities();invalidateIdentityCard();$('identityCardFile').value='';$('identityStatus').textContent='Chave registrada com a conferência declarada por você.';}catch(error){$('identityStatus').textContent=error.message;}});};
$('identitiesDialog').addEventListener?.('close',()=>{for(const id of ['identityPassphrase','identityPassphraseConfirm','identityRestorePassphrase'])$(id).value='';identityCardDraft=null;});
function populatePackageSigning(){const select=$('packageKeyRecipient');select.replaceChildren();const empty=el('option','Selecione uma chave conferida');empty.value='';select.append(empty);for(const c of identityData.contacts.filter(c=>!c.revoked_at)){const option=el('option',c.card.name+' · '+c.card.fingerprint);option.value=c.card.fingerprint;select.append(option);}const active=identityData.identities.find(i=>i.fingerprint===identityData.active_fingerprint);$('packageSigningInfo').textContent=active?'Sua chave ativa: '+active.name+' · '+active.fingerprint:'Crie uma identidade em Biblioteca → Chaves editoriais antes de assinar.';updatePackageSigningFields();}
function updatePackageSigningFields(){const signed=$('packageSignatureMode').value==='signed';$('packageSigningFields').classList.toggle('hidden',!signed);$('packageKeyPassphrase').required=signed;}
$('packageSignatureMode').onchange=()=>{updatePackageSigningFields();invalidatePackagePreview();};$('packageKeyRecipient').onchange=invalidatePackagePreview;

let roundTransferContext=null,roundOpenState=null,roundOpeningGeneration=0,roundCommitting=false;
function renderEditorialRounds(){const list=$('roundCards');list.replaceChildren();for(const r of project.editorial_rounds||[]){const row=el('article',undefined,'round-card');if(r.role==='reviewer')row.append(el('p','Para devolver, mantenha as propostas pendentes. Aceitar na cópia não altera o original.'));row.append(el('h3',r.title),el('p',(r.role==='owner'?'Rodada enviada':'Cópia de trabalho recebida')+' · '+(r.status==='open'?'Aberta':'Encerrada')+' · '+r.scenes.length+' cenas · '+r.receipts.length+' propostas recebidas'),el('p','Base congelada. Alterar texto/formatação pode impedir a devolutiva.'));if(r.status==='open'){const actions=el('div',undefined,'review-actions'),transfer=el('button',r.role==='owner'?'Baixar rodada novamente':'Preparar devolutiva');transfer.onclick=()=>perform(()=>openRoundTransfer(r,r.role==='owner'?'offer':'return'));actions.append(transfer);if(r.role==='owner'){const close=el('button','Encerrar rodada');close.onclick=()=>perform(async()=>{await flush();if(!confirm('Encerrar esta rodada para novos recebimentos? Propostas já importadas permanecem pendentes para decisão.'))return;await api('projects/'+project.id+'/round-close','POST',{round_id:r.id,base_hash:project.round_hashes[r.id]});await refresh();});actions.append(close);}row.append(actions);}list.append(row);}}
function showRoundPayload(container,payload,preview){if(payload.kind==='offer'){showPackageContent(container,payload);return;}container.replaceChildren();container.append(el('h3',payload.title),el('p',payload.proposals.length+' propostas da base congelada'));for(const item of preview?.items||payload.proposals){const row=el('section');row.append(el('h4',item.title||'Trecho proposto'),el('p',item.conflict?'Conflito: cena ou anotações mudaram':item.duplicate?'Já recebida — não será duplicada':'Nova proposta pendente'));const diff=el('div',undefined,'redline-preview');diff.append(el('del',item.original||'∅ — inserção'),el('ins',item.replacement||'∅ — exclusão'));row.append(diff,el('p',item.reason||'Sem justificativa'));container.append(row);}}
async function openRoundTransfer(round,kind){await flush();const state=await api('identities');roundTransferContext={projectId:project.id,round_id:round.id,kind,identity_hash:state.hash,hash:null};$('roundTransferForm').reset();$('roundTransferPreview').replaceChildren();$('roundTransferDownloadBtn').disabled=true;$('roundTransferHeading').textContent=kind==='offer'?'Baixar base congelada da rodada':'Devolver propostas pendentes';$('roundTransferStatus').textContent='Confira a prévia antes de assinar. Nada será enviado.';$('roundTransferDialog').showModal();}
bind('roundTransferPreviewBtn',async()=>{if(!roundTransferContext)return;await flush();const c=roundTransferContext;try{const preview=await api('projects/'+c.projectId+'/round-'+c.kind+'-preview','POST',{round_id:c.round_id,identity_hash:c.identity_hash});if(c!==roundTransferContext)return;c.hash=preview.hash;showRoundPayload($('roundTransferPreview'),preview.payload);$('roundTransferStatus').textContent='Prévia da base '+preview.payload.base_hash+' · chave e destinatário da rodada serão usados.';$('roundTransferDownloadBtn').disabled=false;}catch(error){$('roundTransferStatus').textContent=error.message;$('roundTransferDownloadBtn').disabled=true;}});
$('roundTransferForm').onsubmit=event=>{event.preventDefault();perform(async()=>{const c=roundTransferContext;if(!c?.hash)return;try{await flush();const pack=await api('projects/'+c.projectId+'/round-'+c.kind+'-export','POST',{round_id:c.round_id,identity_hash:c.identity_hash,preview_hash:c.hash,key_passphrase:$('roundTransferKeyPhrase').value,passphrase:$('roundTransferPhrase').value,confirm_passphrase:$('roundTransferConfirm').value});if(c!==roundTransferContext||!$('roundTransferDialog').open)return;download(JSON.stringify(pack),'editorial.wroom-round.json','application/json');$('roundTransferDialog').close();status('Pacote da rodada preparado. Nenhum envio realizado.');}catch(error){$('roundTransferStatus').textContent=error.message;if(error.status===409){c.hash=null;$('roundTransferDownloadBtn').disabled=true;}}finally{for(const id of ['roundTransferKeyPhrase','roundTransferPhrase','roundTransferConfirm'])$(id).value='';}});};
$('roundTransferDialog').addEventListener?.('close',()=>{roundTransferContext=null;for(const id of ['roundTransferKeyPhrase','roundTransferPhrase','roundTransferConfirm'])$(id).value='';$('roundTransferPreview').replaceChildren();});
async function discardRoundStaging(){const old=roundOpenState;roundOpenState=null;roundOpeningGeneration++;$('roundOpenCommitBtn').disabled=true;$('roundOpenPreview').replaceChildren();if(old)await api('round-packages/cancel','POST',{token:old.token});}
async function openRoundImport(){await flush();await discardRoundStaging();$('roundOpenForm').reset();const select=$('roundTargetProject');select.replaceChildren();const empty=el('option','Selecione a origem para devolutiva; rodada recebida cria cópia');empty.value='';select.append(empty);for(const p of await api('projects'))if(p.state==='ready'){const option=el('option',p.name);option.value=p.id;select.append(option);}select.value=project?.editorial_rounds?.some(r=>r.role==='owner')?project.id:'';$('roundOpenStatus').textContent='Somente pacotes de rodada v3 assinados são aceitos.';$('roundOpenDialog').showModal();}
bind('openRoundLibraryBtn',openRoundImport);bind('receiveRoundBtn',openRoundImport);
$('roundOpenForm').onsubmit=event=>{event.preventDefault();perform(async()=>{await discardRoundStaging();const generation=roundOpeningGeneration;try{const file=$('roundFile').files?.[0];if(!file||file.size>11000000)throw new Error('Escolha pacote de até 11 MB.');$('roundOpenStatus').textContent='Verificando assinatura e base…';const result=await api('round-packages/open','POST',{file:await file.text(),passphrase:$('roundOpenPhrase').value,recipient:$('roundExpectedRecipient').value,project_id:$('roundTargetProject').value||undefined});if(generation!==roundOpeningGeneration||!$('roundOpenDialog').open){await api('round-packages/cancel','POST',{token:result.token});return;}roundOpenState={token:result.token,kind:result.payload.kind};showRoundPayload($('roundOpenPreview'),result.payload,result.preview);$('roundOpenStatus').textContent='Assinatura conferida de '+result.verification.contact_name+' · '+result.verification.sender_fingerprint+(result.preview?' · '+result.preview.imported+' novas · '+result.preview.duplicates+' já recebidas · '+result.preview.conflicts+' conflitos':' · Nova cópia de trabalho, sem mudar a origem.');$('roundOpenCommitBtn').textContent=result.payload.kind==='offer'?'Criar cópia da rodada':'Registrar propostas pendentes';$('roundOpenCommitBtn').disabled=!!result.preview?.conflicts;}catch(error){$('roundOpenStatus').textContent=error.message;}finally{$('roundOpenPhrase').value='';}});};
for(const id of ['roundFile','roundExpectedRecipient','roundTargetProject','roundOpenPhrase'])$(id).oninput=()=>{roundOpeningGeneration++;if(roundOpenState)discardRoundStaging().catch(report);$('roundOpenStatus').textContent='Entrada alterada. Confira novamente.';};
bind('roundOpenCommitBtn',async()=>{if(!roundOpenState)return;roundCommitting=true;$('roundOpenForm').inert=true;$('roundOpenCancelBtn').disabled=true;try{const result=await api('round-packages/confirm','POST',{token:roundOpenState.token,confirm:true});roundOpenState=null;$('roundOpenDialog').close();await openProject(result.id);view='review';renderView();status(result.kind==='offer'?'Cópia da rodada criada. Proponha sobre a base congelada.':result.imported+' propostas recebidas · '+result.duplicates+' já recebidas. O manuscrito não foi alterado.');}catch(error){$('roundOpenStatus').textContent=error.message;}finally{roundCommitting=false;$('roundOpenForm').inert=false;$('roundOpenCancelBtn').disabled=false;}});
$('roundOpenDialog').oncancel=event=>{if(roundCommitting)event.preventDefault();};
bind('roundOpenCancelBtn',async()=>{await discardRoundStaging();$('roundOpenDialog').close();});$('roundOpenDialog').addEventListener?.('close',()=>{$('roundOpenPhrase').value='';$('roundFile').value='';discardRoundStaging().catch(report);});

library().catch(report);

function incompatibleServer(){serverCompatible=false;$('serverNotice').classList.remove('hidden');$('workspace').inert=true;$('library').inert=true;status('Atualização pendente: reinicie o servidor.');}
if(globalThis.location)api('status').then(info=>{if(info.interface!=='studio-19')incompatibleServer();}).catch(incompatibleServer);

// Mobile drawers keep a visible way back to the text and expose their state.
function closeMobilePanels(){const trigger=document.body.classList.contains('show-tree')?'toggleTreeBtn':'toggleInspectorBtn';document.body.classList.remove('show-tree','show-inspector');$('main').inert=false;$(trigger).focus();}
bind('closeTreeBtn',()=>{closeMobilePanels();$('toggleTreeBtn').focus();},false);
bind('closeInspectorBtn',()=>{closeMobilePanels();$('toggleInspectorBtn').focus();},false);
bind('panelBackdrop',closeMobilePanels,false);
function syncMobilePanels(){
 const mobile=globalThis.innerWidth<=650,tree=mobile&&document.body.classList.contains('show-tree'),inspector=mobile&&document.body.classList.contains('show-inspector');
 $('panelBackdrop').hidden=!(tree||inspector);
 $('toggleTreeBtn').setAttribute('aria-expanded',String(tree));
 $('toggleInspectorBtn').setAttribute('aria-expanded',String(globalThis.innerWidth<=900?document.body.classList.contains('show-inspector'):!document.body.classList.contains('hide-inspector')));
 $('main').inert=tree||inspector;
 $('focusBtn').setAttribute('aria-pressed',String(document.body.classList.contains('focus')));
 $('focusBtn').textContent=document.body.classList.contains('focus')?'Sair do foco':'Foco';
}
if(typeof MutationObserver!=='undefined'){new MutationObserver(syncMobilePanels).observe(document.body,{attributes:true,attributeFilter:['class']});globalThis.addEventListener('resize',syncMobilePanels);syncMobilePanels();}

bind('mobileToolsBtn',()=>{const open=document.body.classList.toggle('mobile-tools-open');$('mobileToolsBtn').setAttribute('aria-expanded',String(open));},false);

bind('closeReferenceBtn',()=>{if(!$('referencePanel').classList.contains('hidden'))$('referenceBtn').click();$('mobileToolsBtn').focus();},false);

function applyReadingSize(value){const size=['18','21','24'].includes(value)?value:'18';$('readingSize').value=size;$('readView').style.setProperty('--reading-size',size+'px');return size;}
applyReadingSize(readLocal('writingroom.reading-size'));
$('readingSize').onchange=()=>writeLocal('writingroom.reading-size',applyReadingSize($('readingSize').value));
