import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,addNode,updateText,updateNode} from '../src/core.mjs';
import {exportDocx,exportEpub} from '../src/book-export.mjs';
function entries(zip){
 const result=new Map();let offset=0;
 while(zip.readUInt32LE(offset)===0x04034b50){
  const size=zip.readUInt32LE(offset+18),length=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28);assert.equal(zip.readUInt16LE(offset+8),0);assert.equal(extra,0);
  const name=zip.subarray(offset+30,offset+30+length).toString('utf8'),data=zip.subarray(offset+30+length,offset+30+length+size);let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
  assert.equal((crc^0xffffffff)>>>0,zip.readUInt32LE(offset+14));assert.ok(!result.has(name));result.set(name,data.toString('utf8'));offset+=30+length+size;
 }
 assert.equal(zip.readUInt32LE(offset),0x02014b50);assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);return result;
}
function fixture(){const p=makeProject('Livro & <Teste>'),id=addNode(p,p.roots.draft,'Título <cena>'),excluded=addNode(p,p.roots.draft,'FORA');updateNode(p,excluded,{include_in_compile:false});updateText(p,id,'Olá 🌱\r\nSegundo parágrafo & texto.\n<script>literal</script>');return {p,id};}
test('DOCX contém partes OpenXML, CRC válido, Unicode e apenas cenas incluídas',()=>{
 const {p}=fixture(),before=structuredClone(p),zip=entries(exportDocx(p));
 for(const name of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/_rels/document.xml.rels','docProps/core.xml'])assert.ok(zip.has(name));
 assert.match(zip.get('word/document.xml'),/Olá 🌱/);assert.match(zip.get('word/document.xml'),/&lt;script&gt;/);assert.ok(!zip.get('word/document.xml').includes('FORA'));assert.deepEqual(p,before);
});
test('EPUB usa mimetype primeiro, container, metadados, navegação e spine',()=>{
 const {p}=fixture(),zip=entries(exportEpub(p));assert.equal([...zip.keys()][0],'mimetype');assert.equal(zip.get('mimetype'),'application/epub+zip');assert.match(zip.get('META-INF/container.xml'),/EPUB\/package.opf/);assert.match(zip.get('EPUB/package.opf'),/unique-identifier="book-id"/);assert.match(zip.get('EPUB/package.opf'),/properties="nav"/);assert.match(zip.get('EPUB/nav.xhtml'),/book.xhtml#c0/);assert.match(zip.get('EPUB/book.xhtml'),/Olá 🌱/);assert.ok(!zip.get('EPUB/book.xhtml').includes('<script>'));
});
test('exportação binária rejeita caracteres XML inválidos e livro sem cenas',()=>{
 const {p,id}=fixture();updateText(p,id,'x\u0000y');assert.throws(()=>exportDocx(p));assert.throws(()=>exportEpub(p));assert.throws(()=>exportDocx(makeProject()));
});
