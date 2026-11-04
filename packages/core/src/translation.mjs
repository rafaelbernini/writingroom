import {validate,addNode,updateNode,updateText} from './core.mjs';
import {changeSource} from './research.mjs';
const text=(value,max)=>typeof value==='string'&&value.length<=max&&!value.includes('\u0000');
export function languageCode(value){return typeof value==='string'&&/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(value);}
function languages(input,distinct=true){if(!languageCode(input.from)||!languageCode(input.to)||(distinct&&input.from===input.to))throw new Error('Idiomas de origem e destino distintos obrigatórios');}
function folder(project,root,title){return project.nodes.find(n=>n.parent_id===root&&n.kind==='folder'&&!n.deleted&&n.title===title)?.id||addNode(project,root,title,'folder');}
export function createTranslation(project,input){
 validate(project);languages(input);
 if(!text(input.title,160)||!input.title.trim()||!text(input.original,200000)||!text(input.translation??'',200000)||!input.original.trim())throw new Error('Trecho inválido');
 const draft=structuredClone(project),target=addNode(draft,folder(draft,draft.roots.draft,'Tradução'),input.title.trim());
 updateText(draft,target,input.translation??'');updateNode(draft,target,{status:'todo',synopsis:'Tradução '+input.from+' → '+input.to+'. Revisar fidelidade, terminologia e fluência.'});
 const {id:source}=changeSource(draft,{operation:'create',title:'Original — '+input.title.trim(),source:{url:'',author:'',publisher:'',date:'',accessed:'',basis:'documented',refs:[target]}});
 updateNode(draft,source,{keywords:['translation:source','translation:from:'+input.from,'translation:to:'+input.to]});
 // source creation is validated at Research root; then organize it outside publication.
 const n=draft.nodes.find(n=>n.id===source);n.parent_id=folder(draft,draft.roots.research,'Originais para tradução');n.sort_key=draft.nodes.filter(x=>x.parent_id===n.parent_id).length;
 updateText(draft,source,input.original);validate(draft);Object.assign(project,draft);return {source_id:source,target_id:target};
}
export function translationPairs(project){
 const visible=n=>{while(n){if(n.deleted||n.id===project.roots.trash)return false;n=project.nodes.find(x=>x.id===n.parent_id);}return true;};
 return project.nodes.filter(n=>n.source&&n.keywords?.includes('translation:source')&&visible(n)).map(n=>({source:n,target:project.nodes.find(t=>n.source.refs.includes(t.id)&&t.kind==='text'&&!t.source&&visible(t)),from:n.keywords.find(k=>k.startsWith('translation:from:'))?.slice(17)||'',to:n.keywords.find(k=>k.startsWith('translation:to:'))?.slice(15)||''}));
}
export function createGlossaryEntry(project,input){
 validate(project);languages(input,false);
 if(!text(input.term,180)||!input.term.trim())throw new Error('Termo obrigatório');
 for(const key of ['definition','synonyms','equivalents','context','provenance'])if(!text(input[key]??'',10000))throw new Error('Verbete inválido');
 const draft=structuredClone(project),{id}=changeSource(draft,{operation:'create',title:input.term.trim(),source:{url:'',author:'',publisher:'',date:'',accessed:'',basis:'unclassified',refs:[]}});
 updateNode(draft,id,{keywords:['language:glossary','translation:from:'+input.from,'translation:to:'+input.to]});
 const n=draft.nodes.find(n=>n.id===id);n.parent_id=folder(draft,draft.roots.research,'Glossário e decisões terminológicas');n.sort_key=draft.nodes.filter(x=>x.parent_id===n.parent_id).length;
 updateText(draft,id,'# '+input.term.trim()+'\n\nIdiomas: '+input.from+' → '+input.to+'\n\n'+[['Definição','definition'],['Sinônimos / antônimos','synonyms'],['Traduções / equivalentes preferidos','equivalents'],['Contexto / restrições de uso','context'],['Fonte / data / decisão','provenance']].map(([label,key])=>'## '+label+'\n\n'+(input[key]||'')+'\n').join('\n'));
 validate(draft);Object.assign(project,draft);return {id};
}
export function bilingualReview(project){
 validate(project);return '# '+project.name+' — revisão bilíngue\n\n'+translationPairs(project).map(({source,target,from,to})=>'## '+(target?.title||source.title)+' ('+from+' → '+to+')\n\nEstado: '+(target?.status||'destino indisponível')+'\n\n### Original\n\n'+project.documents[source.id]+'\n\n### Tradução\n\n'+(target?project.documents[target.id]:'[Destino removido ou na lixeira]')).join('\n\n---\n\n');
}
// Derived state for a single command: no hash is hidden in manuscript text.
export function translationSourceState(project){return new Map(project.nodes.filter(n=>n.source&&n.keywords?.includes('translation:source')).map(n=>[n.id,{text:project.documents[n.id],refs:[...n.source.refs]}]));}
export function invalidateTranslationReviews(project,previous){
 const changed=[];for(const pair of translationPairs(project)){const before=previous.get(pair.source.id);if(before&&before.text!==project.documents[pair.source.id]&&pair.target?.status==='done'){updateNode(project,pair.target.id,{status:'review'});changed.push({id:pair.target.id,status:'review'});}}return changed;
}
