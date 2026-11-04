import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {makeProject,addNode,updateText,moveNode,compileProject,validate,saveProject,loadProject,trashNode,restoreNode,snapshot,restoreSnapshot,search} from '../src/core.mjs';

test('novo projeto tem três raízes e é válido',()=>{const p=makeProject('Livro');assert.equal(p.nodes.length,3);assert.ok(validate(p));});
test('cena salva, reabre e compila sem perder texto',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'writingroom-'));try{const p=makeProject('Livro');const n=addNode(p,p.roots.draft,'Cena 1');updateText(p,n,'Olá, mundo!');await saveProject(dir,p);const reopened=await loadProject(dir);assert.match(compileProject(reopened),/Olá, mundo!/);assert.equal(reopened.documents[n],'Olá, mundo!');}finally{await rm(dir,{recursive:true,force:true});}});
test('reordenar altera ordem de exportação preservando ids',()=>{const p=makeProject('Livro'),a=addNode(p,p.roots.draft,'Primeira'),b=addNode(p,p.roots.draft,'Segunda');moveNode(p,b,p.roots.draft,0);const out=compileProject(p);assert.ok(out.indexOf('Segunda')<out.indexOf('Primeira'));assert.equal(p.documents[a],'');});
test('não permite loops de hierarquia',()=>{const p=makeProject(),a=addNode(p,p.roots.draft,'A','folder'),b=addNode(p,a,'B','folder');assert.throws(()=>moveNode(p,a,b),/circular/);});
test('lixeira e restauração',()=>{const p=makeProject(),id=addNode(p,p.roots.draft,'Texto');trashNode(p,id);assert.ok(!compileProject(p).includes('Texto'));restoreNode(p,id);assert.ok(compileProject(p).includes('Texto'));});
test('snapshot restaura e retém anterior',()=>{const p=makeProject(),id=addNode(p,p.roots.draft,'Texto');updateText(p,id,'antes');const s=snapshot(p,id,'Versão 1');updateText(p,id,'depois');restoreSnapshot(p,s);assert.equal(p.documents[id],'antes');assert.equal(p.snapshots.length,2);});
test('buscar por conteúdo e sinopse',()=>{const p=makeProject(),id=addNode(p,p.roots.draft,'Cena');updateText(p,id,'dragão azul');assert.equal(search(p,'DRAGÃO').length,1);});
test('não exporta conteúdo da pesquisa',()=>{const p=makeProject(),id=addNode(p,p.roots.research,'Rascunho');updateText(p,id,'segredo');assert.ok(!compileProject(p).includes('segredo'));});
