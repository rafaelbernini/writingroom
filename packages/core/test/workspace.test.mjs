import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {makeProject,addNode,updateNode,updateText,loadProject,search,validate} from '../src/core.mjs';
import {updateSettings,applyTemplate,inspectImport,importText,splitScene,compilation,exportHtml,projectBackup,restoreProjectBackup} from '../src/workspace.mjs';

test('modelos criam cenas editáveis e pesquisa fora da compilação',()=>{
 for(const template of ['novel','nonfiction']){const p=makeProject();applyTemplate(p,template);assert.ok(validate(p));assert.equal(compilation(p).sections.length,1);assert.ok(p.nodes.some(n=>n.parent_id===p.roots.research));}
 const p=makeProject(),before=structuredClone(p);assert.throws(()=>applyTemplate(p,'malicious'));assert.deepEqual(p,before);
});
test('notas, etiquetas, keywords e metas persistem no nó e participam da busca',()=>{
 const p=makeProject(),id=addNode(p,p.roots.draft);updateNode(p,id,{notes:'Motivo secreto',label:'sage',keywords:['arco','personagem'],target_words:500});
 assert.equal(search(p,'secreto')[0].id,id);assert.equal(search(p,'personagem')[0].id,id);assert.ok(validate(p));assert.equal(compilation(p).words,0);
 const before=structuredClone(p);assert.throws(()=>updateNode(p,id,{notes:'Mudança parcial',target_words:-1}));assert.deepEqual(p,before);
 assert.throws(()=>updateNode(p,id,{keywords:[42]}));assert.throws(()=>updateNode(p,id,{label:'red; background:url(x)'}));
});
test('configurações são opcionais no legado, validadas e atômicas',()=>{
 const p=makeProject();assert.ok(validate(p));updateSettings(p,{name:'Livro',author:'Autora',language:'en-US',target_words:1000});assert.equal(p.name,'Livro');assert.equal(p.settings.author,'Autora');
 const before=structuredClone(p);assert.throws(()=>updateSettings(p,{name:'Outro',target_words:1.5}));assert.deepEqual(p,before);assert.throws(()=>updateSettings(p,{language:'bad'}));
});
test('preview Markdown preserva CRLF e ignora títulos dentro de blocos de código',()=>{
 const text='# Um\r\nTexto 🌱\r\n```md\r\n# Não dividir\r\n```\r\n## Dois\r\nFim\r\n';
 const plan=inspectImport({text,filename:'Livro.md',split:true});assert.equal(plan.sections.length,2);assert.equal(plan.sections[0].title,'Um');assert.equal(plan.sections[0].text,'Texto 🌱\r\n```md\r\n# Não dividir\r\n```\r\n');assert.equal(plan.sections[1].text,'Fim\r\n');
 assert.equal(inspectImport({text,split:false}).sections[0].text,text);
});
test('importação preserva preâmbulo e Unicode, não executa HTML e rejeita binários/limites',()=>{
 const text='Prefácio\n# Cena\n<script>literal</script>';const plan=inspectImport({text,filename:'Livro.md',split:true});assert.equal(plan.sections[0].text,'Prefácio\n');assert.equal(plan.sections[1].text,'<script>literal</script>');
 assert.throws(()=>inspectImport({text:'x\0y'}));assert.throws(()=>inspectImport({text:'# Cena\n'.repeat(201),split:true}));assert.throws(()=>inspectImport({text:'á'.repeat(750001)}));
});
test('importação usa os mesmos IDs da árvore e rejeição não deixa itens parciais',()=>{
 const p=makeProject(),input={text:'# Um\nA\n# Dois\nB',split:true};const before=structuredClone(p);assert.throws(()=>importText(p,p.roots.trash,input));assert.deepEqual(p,before);
 const result=importText(p,p.roots.draft,input);assert.equal(result.ids.length,2);assert.deepEqual(compilation(p).sections.map(n=>n.id),result.ids);assert.equal(p.documents[result.ids[0]],'A\n');
});
test('dividir cena conserva conteúdo, ordem, metadados e snapshot anterior',()=>{
 const p=makeProject(),id=addNode(p,p.roots.draft,'Original');updateText(p,id,'Olá 🌱 final');updateNode(p,id,{label:'blue',keywords:['tema'],notes:'Fica no original'});
 const suffix=splitScene(p,id,7,'Continuação');assert.equal(p.documents[id]+p.documents[suffix],'Olá 🌱 final');assert.equal(p.snapshots[0].content,'Olá 🌱 final');assert.equal(p.nodes.find(n=>n.id===suffix).label,'blue');assert.equal(p.nodes.find(n=>n.id===suffix).notes,undefined);assert.deepEqual(compilation(p).sections.map(n=>n.id),[id,suffix]);
});
test('divisão rejeita limites e metade de emoji sem alterar agregado',()=>{
 const p=makeProject(),id=addNode(p,p.roots.draft);updateText(p,id,'A🌱B');const before=structuredClone(p);
 for(const offset of [0,2,4,-1,1.5]){assert.throws(()=>splitScene(p,id,offset));assert.deepEqual(p,before);}
});
test('HTML escapado, diagnóstico de omissões e compilação pura',()=>{
 const p=makeProject('<script>Livro</script>'),a=addNode(p,p.roots.draft,'<img onerror=evil()>'),b=addNode(p,p.roots.draft,'Excluída');updateText(p,a,'<script>alert(1)</script>');updateNode(p,b,{include_in_compile:false});
 const before=structuredClone(p),plan=compilation(p),html=exportHtml(p);assert.equal(plan.sections.length,1);assert.equal(plan.omitted[0].id,b);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.deepEqual(p,before);
});
test('backup JSON restaura novo projeto com IDs remapeados e fonte intacta',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-backup-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const p=makeProject(),id=addNode(p,p.roots.draft,'Cena');updateText(p,id,'Olá 🌱\r\n');updateNode(p,id,{notes:'Notas',keywords:['arco'],target_words:100});const bundle=projectBackup(p),before=structuredClone(bundle);
 const restored=await restoreProjectBackup(base,bundle);assert.notEqual(restored.id,p.id);assert.equal(restored.documents[id],undefined);const newId=Object.keys(restored.documents)[0];assert.equal(restored.documents[newId],'Olá 🌱\r\n');assert.equal(restored.nodes.find(n=>n.id===newId).notes,'Notas');assert.deepEqual(bundle,before);
 assert.deepEqual(await loadProject(path.join(base,restored.id+'.wroom')),restored);bundle.project.name='Corrompido';await assert.rejects(restoreProjectBackup(base,bundle));
});
