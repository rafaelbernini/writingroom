import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,addNode,updateNode,updateText,moveNode,trashNode,restoreNode,compileProject,search,snapshot,restoreSnapshot,validate} from '../src/core.mjs';

function unchanged(p, action) {const before=structuredClone(p);assert.throws(action);assert.deepEqual(p,before);}
test('metadados rejeitados não deixam alterações parciais',()=>{
 const p=makeProject(),id=addNode(p,p.roots.draft);
 unchanged(p,()=>updateNode(p,id,{title:'Alterado',synopsis:42}));
 unchanged(p,()=>updateNode(p,id,{title:'   ',status:'done'}));
});
test('excluir raiz rejeita sem gravar proveniência',()=>{
 const p=makeProject();for(const id of Object.values(p.roots))unchanged(p,()=>trashNode(p,id));
});
test('movimento com posição inválida preserva árvore',()=>{
 const p=makeProject(),id=addNode(p,p.roots.draft);
 for(const index of [NaN,1.5,'0',-1])unchanged(p,()=>moveNode(p,id,p.roots.research,index));
});
test('cenas em capítulos herdam inclusão e compilam em ordem',()=>{
 const p=makeProject(),chapter=addNode(p,p.roots.draft,'Capítulo','folder');
 const a=addNode(p,chapter,'A'),b=addNode(p,chapter,'B');updateText(p,a,'primeiro');updateText(p,b,'segundo');
 assert.match(compileProject(p),/primeiro[\s\S]*segundo/);
 updateNode(p,chapter,{include_in_compile:false});assert.doesNotMatch(compileProject(p),/primeiro/);
});
test('lixeira oculta subárvore da busca e restaura texto e ordem',()=>{
 const p=makeProject(),chapter=addNode(p,p.roots.draft,'Capítulo','folder'),id=addNode(p,chapter,'Tesouro');updateText(p,id,'dragão');
 const order=p.nodes.find(n=>n.id===id).sort_key;
 trashNode(p,chapter);assert.equal(search(p,'dragão').length,0);assert.equal(search(p,'Tesouro').length,0);
 restoreNode(p,chapter);assert.equal(search(p,'dragão')[0].id,id);assert.match(compileProject(p),/dragão/);assert.equal(p.nodes.find(n=>n.id===id).sort_key,order);
});
test('restauração usa manuscrito se pai original estiver na lixeira',()=>{
 const p=makeProject(),folder=addNode(p,p.roots.draft,'Pasta','folder'),id=addNode(p,folder,'Cena');
 trashNode(p,id);trashNode(p,folder);restoreNode(p,id);
 assert.equal(p.nodes.find(n=>n.id===id).parent_id,p.roots.draft);assert.equal(search(p,'Cena').length,1);
});
test('snapshots só aceitam texto e restauração preserva versões anteriores',()=>{
 const p=makeProject();unchanged(p,()=>snapshot(p,p.roots.draft));
 const id=addNode(p,p.roots.draft);updateText(p,id,'antes 🌱');const version=snapshot(p,id,'Primeira');updateText(p,id,'depois');
 const original=structuredClone(p.snapshots[0]);restoreSnapshot(p,version);assert.deepEqual(p.snapshots[0],original);assert.equal(p.snapshots[1].content,'depois');assert.equal(p.documents[id],'antes 🌱');
});
test('validação rejeita raízes duplicadas e documentos sem texto',()=>{
 const p=makeProject();p.roots.research=p.roots.draft;assert.throws(()=>validate(p));
 const q=makeProject(),id=addNode(q,q.roots.draft);q.documents[id]=3;assert.throws(()=>validate(q));
});
test('compilação é pura e mover preserva ID e conteúdo',()=>{
 const p=makeProject(),id=addNode(p,p.roots.draft,'Cena');updateText(p,id,'á ç 漢字');const before=structuredClone(p);
 compileProject(p,'md');compileProject(p,'txt');assert.deepEqual(p,before);
 moveNode(p,id,p.roots.research);assert.equal(p.documents[id],'á ç 漢字');assert.ok(validate(p));
});

test('validação rejeita documents em array e datas inválidas antes de qualquer escrita',()=>{
 const p=makeProject();p.documents=[];assert.throws(()=>validate(p));
 for(const field of ['created_at','updated_at']){
  const q=makeProject();q[field]=42;assert.throws(()=>validate(q));
 }
});
