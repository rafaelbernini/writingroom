import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {makeProject,addNode,updateText,validate,snapshot,restoreSnapshot,compileProject} from '../src/core.mjs';
import {richSchema,plainToRich,normalizeRichDocument,richText,richHtml,safeLink} from '../../editor/src/schema.mjs';
import {convertToRich,saveRichDocument,convertToPlain,richHash} from '../src/rich-service.mjs';
import {projectBackup,restoreProjectBackup,exportHtml} from '../src/workspace.mjs';
import {previewReplace,applyReplace} from '../src/editorial.mjs';
import {exportDocx,exportEpub} from '../src/book-export.mjs';
function fixture(){const p=makeProject('Livro visual'),id=addNode(p,p.roots.draft,'Cena');return {p,id};}
const visual=text=>({schema_version:1,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text,marks:[{type:'strong'}]}]}]}});
test('legado abre sem conversão; conversão explícita preserva original CRLF em snapshot',()=>{
 const {p,id}=fixture();updateText(p,id,'Olá 🌱\r\n\r\n**literal**\r\n');assert.equal(p.rich_documents,undefined);const original=p.documents[id];convertToRich(p,id);assert.equal(p.snapshots[0].content,original);assert.equal(p.documents[id],'Olá 🌱\n\n**literal**\n');assert.ok(validate(p));
});
test('projeção de parágrafos vazios, listas e quebras é determinística',()=>{
 assert.equal(richText(plainToRich('\nA\n\n')),'\nA\n\n');const value={schema_version:1,doc:{type:'doc',content:[{type:'bullet_list',content:[{type:'list_item',content:[{type:'paragraph',content:[{type:'text',text:'Um'}]}]},{type:'list_item',content:[{type:'paragraph',content:[{type:'text',text:'Dois'},{type:'hard_break'},{type:'text',text:'Fim'}]}]}]}]}};assert.equal(richText(value),'Um\nDois\nFim');
});
test('schema rejeita HTML livre, imagens, atributos desconhecidos e links perigosos',()=>{
 for(const doc of [{type:'doc',content:[{type:'image',attrs:{src:'https://evil.test/x'}}]},{type:'doc',content:[{type:'paragraph',attrs:{onclick:'evil()'}}]},{type:'doc',content:[{type:'heading',attrs:{level:6}}]}])assert.throws(()=>normalizeRichDocument({schema_version:1,doc}));
 for(const href of ['javascript:alert(1)','data:text/html,x','file:///etc/passwd','https://a.test/ x','\nhttps://a.test'])assert.equal(safeLink(href),false);
 const bad=visual('Link');bad.doc.content[0].content[0].marks=[{type:'link',attrs:{href:'javascript:evil()'}}];assert.throws(()=>normalizeRichDocument(bad));assert.ok(safeLink('https://example.org/path'));assert.ok(safeLink('mailto:a@example.org'));
});
test('schema tem limites de profundidade/nós/bytes e não modifica projeto ao rejeitar',()=>{
 const {p,id}=fixture(),before=structuredClone(p);let node={type:'paragraph'};for(let i=0;i<35;i++)node={type:'blockquote',content:[node]};assert.throws(()=>saveRichDocument(p,id,{schema_version:1,doc:{type:'doc',content:[node]}}));assert.deepEqual(p,before);assert.throws(()=>saveRichDocument(p,id,visual('a'.repeat(1500001))));assert.deepEqual(p,before);
});
test('alteração somente de formato muda hash completo e bloqueia escrita legada',()=>{
 const {p,id}=fixture();updateText(p,id,'Igual');convertToRich(p,id);const before=richHash(p,id);saveRichDocument(p,id,visual('Igual'));assert.notEqual(richHash(p,id),before);assert.equal(p.documents[id],'Igual');assert.throws(()=>updateText(p,id,'Sobrescrever'));assert.ok(validate(p));
});
test('snapshot, modo texto e restauração preservam conteúdo e formatação',()=>{
 const {p,id}=fixture();saveRichDocument(p,id,visual('Negrito'));const version=snapshot(p,id,'Visual');convertToPlain(p,id);assert.equal(p.rich_documents[id],undefined);assert.equal(p.snapshots.at(-1).rich_document.doc.content[0].content[0].marks[0].type,'strong');restoreSnapshot(p,version);assert.ok(p.rich_documents[id]);assert.equal(p.documents[id],'Negrito');assert.ok(validate(p));
});
test('backup restaura IDs e snapshots semânticos sem alterar origem',async t=>{
 const {p,id}=fixture();saveRichDocument(p,id,visual('Preservado 🌱'));snapshot(p,id,'Marco');const before=structuredClone(p),base=await mkdtemp(path.join(os.tmpdir(),'writingroom-rich-'));t.after(()=>rm(base,{recursive:true,force:true}));const restored=await restoreProjectBackup(base,projectBackup(p)),newId=Object.keys(restored.documents)[0];assert.notEqual(newId,id);assert.deepEqual(restored.rich_documents[newId],p.rich_documents[id]);assert.equal(restored.snapshots.at(-1).node_id,newId);assert.deepEqual(restored.snapshots.at(-1).rich_document,p.rich_documents[id]);assert.deepEqual(p,before);
});
test('substituição inline preserva marcas e snapshot semântico; formato invalida prévia',()=>{
 const {p,id}=fixture();saveRichDocument(p,id,visual('Lia voltou'));const query={find:'Lia',replacement:'Mira',scope:'document',node_id:id,case_sensitive:true,whole_word:true};const plan=previewReplace(p,query);applyReplace(p,{query,fingerprint:plan.fingerprint,occurrence_ids:plan.occurrences.map(o=>o.id)});assert.equal(p.documents[id],'Mira voltou');assert.equal(p.rich_documents[id].doc.content[0].content[0].marks[0].type,'strong');assert.ok(p.snapshots.at(-1).rich_document);
 const second=previewReplace(p,{...query,find:'Mira'});const changed=plainToRich(p.documents[id]);saveRichDocument(p,id,changed);assert.throws(()=>applyReplace(p,{query:second.query,fingerprint:second.fingerprint,occurrence_ids:second.occurrences.map(o=>o.id)}),{code:'CONFLICT'});
});
test('substituição entre blocos visuais é sinalizada e rejeitada sem alteração parcial',()=>{
 const {p,id}=fixture();saveRichDocument(p,id,plainToRich('Um\nDois'));const query={find:'Um\nDois',replacement:'Outro',scope:'document',node_id:id,case_sensitive:true,whole_word:false},plan=previewReplace(p,query),before=structuredClone(p);assert.equal(plan.occurrences[0].unsupported,true);assert.throws(()=>applyReplace(p,{query,fingerprint:plan.fingerprint,occurrence_ids:plan.occurrences.map(o=>o.id)}));assert.deepEqual(p,before);
});
test('preview e exportações semânticas escapam conteúdo e preservam marcas',()=>{
 const {p,id}=fixture();saveRichDocument(p,id,visual('<script>literal</script>'));assert.match(richHtml(p.rich_documents[id]),/<strong>&lt;script&gt;/);assert.ok(!exportHtml(p).includes('<script>'));assert.match(compileProject(p,'md'),/\*\*/);assert.equal(exportDocx(p).readUInt32LE(0),0x04034b50);assert.equal(exportEpub(p).readUInt32LE(0),0x04034b50);
 const invalid=visual('x\u0000y');saveRichDocument(p,id,invalid);assert.throws(()=>exportDocx(p));assert.throws(()=>exportEpub(p));
});
test('schema serializa links seguros e rejeita divergência de texto compatível',()=>{
 const {p,id}=fixture(),value=visual('Site');value.doc.content[0].content[0].marks=[{type:'link',attrs:{href:'https://example.org?a=1&b=2',title:'Referência'}}];saveRichDocument(p,id,value);assert.match(richHtml(p.rich_documents[id]),/href="https:\/\/example.org\?a=1&amp;b=2"/);p.documents[id]='divergente';assert.throws(()=>validate(p));
});
