import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {makeProject,addNode,updateText,updateNode,trashNode,loadProject,validate} from '../src/core.mjs';
import {previewReplace,applyReplace} from '../src/editorial.mjs';
import {createEntity,changeCollection,collectionMembers,updateScratchpad,captureScratchpad} from '../src/notebook.mjs';
import {projectBackup,restoreProjectBackup,compilation} from '../src/workspace.mjs';
const query=(find,replacement,extra={})=>({find,replacement,scope:'project',case_sensitive:true,whole_word:false,...extra});
function fixture(){const p=makeProject(),a=addNode(p,p.roots.draft,'Cena A'),b=addNode(p,p.roots.draft,'Cena B'),r=addNode(p,p.roots.research,'Pesquisa');return {p,a,b,r};}
const apply=(p,plan,ids=plan.occurrences.map(o=>o.id))=>applyReplace(p,{query:plan.query,fingerprint:plan.fingerprint,occurrence_ids:ids});

test('substituição tem prévia pura e escolha individual, notas não são alteradas',()=>{
 const {p,a,b}=fixture();updateText(p,a,'Lia encontrou Lia.');updateText(p,b,'Lia voltou.');updateNode(p,a,{notes:'Lia privada'});const before=structuredClone(p);
 const plan=previewReplace(p,query('Lia','Mira'));assert.equal(plan.occurrences.length,3);assert.deepEqual(p,before);
 const selected=plan.occurrences.find(o=>o.node_id===a&&o.start===0);const result=apply(p,plan,[selected.id]);assert.deepEqual(result,{documents:1,replacements:1});assert.equal(p.documents[a],'Mira encontrou Lia.');assert.equal(p.documents[b],'Lia voltou.');assert.equal(p.nodes.find(n=>n.id===a).notes,'Lia privada');assert.equal(p.snapshots[0].content,'Lia encontrou Lia.');
});
test('escopos respeitam manuscrito/pesquisa e ignoram lixeira e descendentes',()=>{
 const {p,a,b,r}=fixture();for(const id of [a,b,r])updateText(p,id,'palavra');trashNode(p,b);
 assert.equal(previewReplace(p,query('palavra','nova',{scope:'draft'})).occurrences.length,1);
 assert.equal(previewReplace(p,query('palavra','nova')).occurrences.length,2);
 assert.equal(previewReplace(p,query('palavra','nova',{scope:'document',node_id:r})).occurrences.length,1);
 assert.throws(()=>previewReplace(p,query('palavra','nova',{scope:'document',node_id:b})));
});
test('Unicode, palavra inteira e case-folding funcionam sem regex do usuário',()=>{
 const {p,a}=fixture();updateText(p,a,'Lia LIA Julia Lia_2 lia. ação reação 🌱 [x] $&');
 let plan=previewReplace(p,query('lia','Mira',{case_sensitive:false,whole_word:true}));assert.equal(plan.occurrences.length,3);apply(p,plan);assert.match(p.documents[a],/Mira Mira Julia Lia_2 Mira/);
 plan=previewReplace(p,query('[x]','$&'));apply(p,plan);assert.ok(p.documents[a].includes('🌱 $& $&'));
 assert.equal(previewReplace(p,query('ação','A',{whole_word:true})).occurrences.length,1);
});
test('qualquer alteração de texto invalida o lote inteiro, sem snapshots parciais',()=>{
 const {p,a,b}=fixture();updateText(p,a,'antes');updateText(p,b,'antes');const plan=previewReplace(p,query('antes','depois'));updateText(p,b,'outra sessão');const before=structuredClone(p);
 assert.throws(()=>apply(p,plan),{code:'CONFLICT'});assert.deepEqual(p,before);
});
test('mudança de escopo e de parâmetros após a prévia é rejeitada',()=>{
 const {p,a}=fixture();updateText(p,a,'antes');const plan=previewReplace(p,query('antes','depois'));const newId=addNode(p,p.roots.draft,'Nova');updateText(p,newId,'antes');const before=structuredClone(p);assert.throws(()=>apply(p,plan),{code:'CONFLICT'});assert.deepEqual(p,before);
 const current=previewReplace(p,query('antes','depois'));assert.throws(()=>applyReplace(p,{query:{...current.query,replacement:'outro'},fingerprint:current.fingerprint,occurrence_ids:current.occurrences.map(o=>o.id)}),{code:'CONFLICT'});
});
test('seleções inválidas, limite de resultado e busca vazia não deixam mutação',()=>{
 const {p,a}=fixture();updateText(p,a,'abc');const plan=previewReplace(p,query('a','x'));const before=structuredClone(p);
 for(const ids of [[],['unknown'],[plan.occurrences[0].id,plan.occurrences[0].id]]){assert.throws(()=>apply(p,plan,ids));assert.deepEqual(p,before);}
 assert.throws(()=>previewReplace(p,query('','x')));updateText(p,a,'a'.repeat(5001));assert.throws(()=>previewReplace(p,query('a','x')));
 updateText(p,a,'a'.repeat(200));const large=previewReplace(p,query('a','x'.repeat(10000)));const current=structuredClone(p);assert.throws(()=>apply(p,large));assert.deepEqual(p,current);
});
test('substituir pelo mesmo texto não cria snapshots e exclusão literal funciona',()=>{
 const {p,a}=fixture();updateText(p,a,'a a');let plan=previewReplace(p,query('a','a'));assert.deepEqual(apply(p,plan),{documents:0,replacements:0});assert.equal(p.snapshots.length,0);plan=previewReplace(p,query('a',''));apply(p,plan);assert.equal(p.documents[a],' ');
});
test('fichas são documentos de pesquisa editáveis, preservados fora da compilação',()=>{
 const {p}=fixture();for(const type of ['character','location','object','organization','event','concept']){const id=createEntity(p,{type,title:'Ficha '+type});assert.equal(p.nodes.find(n=>n.id===id).entity_type,type);assert.match(p.documents[id],/^# Ficha/);assert.ok(!compilation(p).sections.some(n=>n.id===id));}
 const before=structuredClone(p);assert.throws(()=>createEntity(p,{type:'__proto__',title:'Maliciosa'}));assert.deepEqual(p,before);
});
test('coleção manual não copia documentos, remoção/exclusão preservam conteúdo',()=>{
 const {p,a}=fixture();updateText(p,a,'Texto original');const id=changeCollection(p,{operation:'create',name:'Arco',type:'manual'});
 changeCollection(p,{operation:'add',id,node_id:a});changeCollection(p,{operation:'add',id,node_id:a});assert.equal(collectionMembers(p,p.collections[0])[0].id,a);assert.equal(p.collections[0].node_ids.length,1);
 changeCollection(p,{operation:'remove',id,node_id:a});assert.equal(p.documents[a],'Texto original');changeCollection(p,{operation:'delete',id});assert.equal(p.documents[a],'Texto original');assert.equal(p.collections.length,0);
});
test('coleções dinâmicas refletem busca/estado e ocultam itens na lixeira',()=>{
 const {p,a,b}=fixture();updateNode(p,a,{keywords:['Lia'],status:'review'});updateNode(p,b,{notes:'Lia',status:'draft'});
 changeCollection(p,{operation:'create',name:'Revisar Lia',type:'query',query:'lia',status:'review'});assert.deepEqual(collectionMembers(p,p.collections[0]).map(n=>n.id),[a]);updateNode(p,b,{status:'review'});assert.equal(collectionMembers(p,p.collections[0]).length,2);trashNode(p,a);assert.deepEqual(collectionMembers(p,p.collections[0]).map(n=>n.id),[b]);
});
test('coleções rejeitam raiz/referência inexistente/nomes vazios atomicamente',()=>{
 const {p}=fixture();const id=changeCollection(p,{operation:'create',name:'Válida',type:'manual'});const before=structuredClone(p);
 for(const node_id of [p.roots.draft,'missing']){assert.throws(()=>changeCollection(p,{operation:'add',id,node_id}));assert.deepEqual(p,before);}
 assert.throws(()=>changeCollection(p,{operation:'rename',id,name:' '}));assert.deepEqual(p,before);assert.ok(validate(p));
});
test('capturas copiam para cena sem consumir a origem nem publicar automaticamente',()=>{
 const {p}=fixture();updateScratchpad(p,'Ideia 🌱\r\n');assert.equal(compilation(p).words,0);const id=captureScratchpad(p,{parent_id:p.roots.draft,title:'Uma ideia'});assert.equal(p.documents[id],p.scratchpad);updateText(p,id,'Desenvolvida');assert.equal(p.scratchpad,'Ideia 🌱\r\n');
 const before=structuredClone(p);assert.throws(()=>updateScratchpad(p,null));assert.deepEqual(p,before);
});
test('backup remapeia coleções e fichas, preservando capturas e versões',async t=>{
 const {p,a}=fixture();const entity=createEntity(p,{type:'character',title:'Lia'});const id=changeCollection(p,{operation:'create',name:'Favoritos',type:'manual'});changeCollection(p,{operation:'add',id,node_id:entity});changeCollection(p,{operation:'add',id,node_id:a});updateScratchpad(p,'Rascunho');
 const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-notebook-'));t.after(()=>rm(base,{recursive:true,force:true}));const restored=await restoreProjectBackup(base,projectBackup(p));assert.equal(restored.scratchpad,'Rascunho');assert.notEqual(restored.collections[0].id,id);assert.ok(restored.collections[0].node_ids.every(id=>restored.nodes.some(n=>n.id===id)));assert.ok(restored.collections[0].node_ids.every(id=>!p.nodes.some(n=>n.id===id)));assert.equal(restored.nodes.find(n=>n.title==='Lia').entity_type,'character');
});
