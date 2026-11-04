import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {makeProject,saveProject,loadProject,addNode,updateText} from '../src/core.mjs';

test('temporários únicos evitam colisão em gravações simultâneas de arquivos completos',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'writingroom-storage-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const p=makeProject(),id=addNode(p,p.roots.draft);
 const copies=Array.from({length:12},(_,index)=>{const copy=structuredClone(p);updateText(copy,id,'Conteúdo '+index);return copy;});
 await Promise.all(copies.map(copy=>saveProject(dir,copy)));
 const reopened=await loadProject(dir);assert.ok(copies.some(copy=>copy.documents[id]===reopened.documents[id]));
 assert.deepEqual(await readdir(dir),['project.json']);
 // This does not promise semantic merging or a process lock: one complete writer wins.
});
test('falha no rename preserva destino e remove somente o temporário da operação',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'writingroom-storage-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await mkdir(path.join(dir,'project.json'));await writeFile(path.join(dir,'project.json','marker'),'Preservar');
 await writeFile(path.join(dir,'project.json.unrelated.tmp'),'Outro processo');
 await assert.rejects(saveProject(dir,makeProject()));
 assert.equal(await readFile(path.join(dir,'project.json','marker'),'utf8'),'Preservar');
 assert.deepEqual((await readdir(dir)).sort(),['project.json','project.json.unrelated.tmp']);
});
