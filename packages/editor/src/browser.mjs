import {EditorState,TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {DOMSerializer,Slice} from 'prosemirror-model';
import {keymap} from 'prosemirror-keymap';
import {baseKeymap,toggleMark,setBlockType,wrapIn,lift} from 'prosemirror-commands';
import {history,undo,redo,closeHistory} from 'prosemirror-history';
import {wrapInList,splitListItem,liftListItem,sinkListItem} from 'prosemirror-schema-list';
import {annotateDocument,reviseAnnotation} from './annotations.mjs';
import {richSchema,normalizeRichDocument,plainToRich,richText,safeLink,richAnnotations} from './schema.mjs';
export {plainToRich,richText,normalizeRichDocument,richAnnotations};
export function renderRichPreview(element,value){
 const normalized=normalizeRichDocument(value),notes=richAnnotations(normalized).filter(a=>a.type==='footnote');
 function strip(node){if(node.marks)node.marks=node.marks.filter(m=>m.type!=='comment');for(const child of node.content||[])strip(child);}strip(normalized.doc);
 const doc=richSchema.nodeFromJSON(normalized.doc);element.replaceChildren(DOMSerializer.fromSchema(richSchema).serializeFragment(doc.content,{document:element.ownerDocument}));
 if(notes.length){const heading=document.createElement('h3');heading.textContent='Notas';const list=document.createElement('ol'),prefix='preview-'+crypto.randomUUID();
  notes.forEach((note,index)=>{const spans=element.querySelectorAll('[data-footnote="'+note.id+'"]'),last=spans[spans.length-1],marker=document.createElement('sup'),link=document.createElement('a'),item=document.createElement('li');item.id=prefix+'-'+note.id;item.textContent=note.body;link.href='#'+item.id;link.textContent='['+(index+1)+']';marker.append(link);last?.after(marker);list.append(item);});element.append(heading,list);
 }
}
export function createRichEditor(element,{onChange,onError,onToolbar}){
 let currentId=null,currentFingerprint=null;const cache=new Map();
 const commands={bold:toggleMark(richSchema.marks.strong),italic:toggleMark(richSchema.marks.em),underline:toggleMark(richSchema.marks.underline),strike:toggleMark(richSchema.marks.strike),code:toggleMark(richSchema.marks.code),undo,redo};
 const plugins=[history(),keymap({'Mod-b':commands.bold,'Mod-i':commands.italic,'Mod-u':commands.underline,'Mod-z':undo,'Shift-Mod-z':redo,'Mod-y':redo,Enter:splitListItem(richSchema.nodes.list_item),Tab:sinkListItem(richSchema.nodes.list_item),'Shift-Tab':liftListItem(richSchema.nodes.list_item)}),keymap(baseKeymap)];
 const initial=EditorState.create({schema:richSchema,plugins});
 function toolbar(){
  const state=view.state,{from,to,$from,empty}=state.selection,marks=state.storedMarks||$from.marks(),result={};
  for(const [name,type] of Object.entries({bold:'strong',italic:'em',underline:'underline',strike:'strike',code:'code'}))result[name]=empty?marks.some(m=>m.type===richSchema.marks[type]):state.doc.rangeHasMark(from,to,richSchema.marks[type]);
  result.block=$from.parent.type===richSchema.nodes.heading?'h'+$from.parent.attrs.level:$from.parent.type===richSchema.nodes.code_block?'code':'paragraph';onToolbar?.(result);
 }
 function pasteText(text){
  if(!text)return;const content=richSchema.nodeFromJSON(plainToRich(text).doc).content;
  view.dispatch(view.state.tr.replaceSelection(new Slice(content,0,0)).scrollIntoView());
 }
 function applyAnnotations(value){
  const doc=richSchema.nodeFromJSON(value.doc),tr=view.state.tr;
  for(const type of ['comment','footnote'])tr.removeMark(0,tr.doc.content.size,richSchema.marks[type]);
  doc.descendants((node,pos)=>{if(node.isText)for(const mark of node.marks)if(['comment','footnote'].includes(mark.type.name))tr.addMark(pos,pos+node.nodeSize,mark);});
  view.dispatch(closeHistory(tr));view.focus();
 }
 const view=new EditorView(element,{
  state:initial,
  attributes:{role:'textbox','aria-label':'Editor visual da cena','aria-multiline':'true',spellcheck:'true'},
  handleDOMEvents:{
   paste(_view,event){event.preventDefault();pasteText(event.clipboardData?.getData('text/plain')||'');return true;},
   drop(_view,event){event.preventDefault();onError?.('Arraste de conteúdo não é suportado aqui. Cole como texto.');return true;}
  },
  dispatchTransaction(transaction){
   const next=view.state.apply(transaction);
   let value;
   try{if(transaction.docChanged)value=normalizeRichDocument({schema_version:1,doc:next.doc.toJSON()});}
   catch(error){view.updateState(view.state);onError?.(error.message);return;}
   view.updateState(next);
   if(value){currentFingerprint=JSON.stringify(value);if(currentId)cache.set(currentId,{state:next,fingerprint:currentFingerprint});onChange(value,richText(value));}
   toolbar();
  }
 });
 return {
  load(id,value,language='pt-BR'){
   const normalized=normalizeRichDocument(value),fingerprint=JSON.stringify(normalized);
   view.setProps({attributes:{role:'textbox','aria-label':'Editor visual da cena','aria-multiline':'true',lang:language==='none'?'':language,spellcheck:language==='none'?'false':'true'}});
   if(currentId===id&&currentFingerprint===fingerprint){toolbar();return;}
   if(currentId)cache.set(currentId,{state:view.state,fingerprint:currentFingerprint});
   const old=cache.get(id);currentId=id;currentFingerprint=fingerprint;
   view.updateState(old?.fingerprint===fingerprint?old.state:EditorState.create({schema:richSchema,doc:richSchema.nodeFromJSON(normalized.doc),plugins}));toolbar();
  },
  run(name,value){
   let command=commands[name];
   if(name==='block'&&value==='code'&&['comment','footnote'].some(type=>view.state.doc.rangeHasMark(view.state.selection.$from.start(),view.state.selection.$to.end(),richSchema.marks[type]))){onError?.('Este bloco contém anotações. Preserve-as antes de convertê-lo em código.');return false;}
   if(name==='block')command=value==='paragraph'?setBlockType(richSchema.nodes.paragraph):value==='code'?setBlockType(richSchema.nodes.code_block):setBlockType(richSchema.nodes.heading,{level:Number(value.slice(1))});
   if(name==='quote'){let inside=false;for(let depth=view.state.selection.$from.depth;depth>0;depth--)if(view.state.selection.$from.node(depth).type===richSchema.nodes.blockquote)inside=true;command=inside?lift:wrapIn(richSchema.nodes.blockquote);}
   if(name==='bullets'||name==='numbers'){
    const type=name==='bullets'?richSchema.nodes.bullet_list:richSchema.nodes.ordered_list;let inside=false;for(let depth=view.state.selection.$from.depth;depth>0;depth--)if(view.state.selection.$from.node(depth).type===type)inside=true;
    command=inside?liftListItem(richSchema.nodes.list_item):wrapInList(type);
   }
   if(name==='link'){if(value&&!safeLink(value)){onError?.('Use um link completo http, https ou mailto.');return false;}command=value?toggleMark(richSchema.marks.link,{href:value,title:null}):(state,dispatch)=>{if(dispatch)dispatch(state.tr.removeMark(state.selection.from,state.selection.to,richSchema.marks.link));return true;};}
   if(command){const result=command(view.state,view.dispatch,view);view.focus();toolbar();return result;}return false;
  },
  addAnnotation(type,body){
   const {from,to}=view.state.selection,value=annotateDocument({schema_version:1,doc:view.state.doc.toJSON()},{type,id:'n-'+crypto.randomUUID(),body,from,to});applyAnnotations(value);
  },
  reviseAnnotation(id,patch){applyAnnotations(reviseAnnotation({schema_version:1,doc:view.state.doc.toJSON()},id,patch));},
  selectAnnotation(id){let from=null,to=null;view.state.doc.descendants((node,pos)=>{if(node.isText&&node.marks.some(m=>m.attrs.id===id)){from??=pos;to=pos+node.nodeSize;}});if(from!==null){view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,from,to)).scrollIntoView());view.focus();}},
  focus(){view.focus();},
  selectAll(){view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,0,view.state.doc.content.size)));view.focus();},
  get selectedText(){return view.state.doc.textBetween(view.state.selection.from,view.state.selection.to,'\n');},
  get composing(){return view.composing;},
  get value(){return normalizeRichDocument({schema_version:1,doc:view.state.doc.toJSON()});},
  destroy(){view.destroy();cache.clear();}
 };
}
