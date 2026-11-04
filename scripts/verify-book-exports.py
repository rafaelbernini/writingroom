"""Validate synthetic exports with Python XML/ZIP and LibreOffice, in temporary paths only."""
from pathlib import Path
import json
import re
import subprocess
import tempfile
from zipfile import ZipFile,ZIP_STORED
import xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
base=Path(tempfile.mkdtemp(prefix='writingroom-export-'))
script=r"""
import {writeFile} from 'node:fs/promises';
import {makeProject,addNode,updateText,updateNode} from './packages/core/src/core.mjs';
import {annotateDocument} from './packages/editor/src/annotations.mjs';
import {saveRichDocument} from './packages/core/src/rich-service.mjs';
import {exportDocx,exportEpub} from './packages/core/src/book-export.mjs';
const p=makeProject('Livro de prova & marés');const a=addNode(p,p.roots.draft,'Capítulo Um'),b=addNode(p,p.roots.draft,'Capítulo Dois'),c=addNode(p,p.roots.draft,'FORA DA PUBLICAÇÃO');
updateText(p,a,'Olá, mundo!\n\nUma frase com acentuação e Unicode 🌱.');updateText(p,b,'Texto final preservado.');updateNode(p,c,{include_in_compile:false});
saveRichDocument(p,b,{schema_version:1,doc:{type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Título visual'}]},{type:'paragraph',content:[{type:'text',text:'Texto final preservado.',marks:[{type:'strong'},{type:'em'}]}]},{type:'bullet_list',content:[{type:'list_item',content:[{type:'paragraph',content:[{type:'text',text:'Item visual'}]}]}]}]}});
let annotated=annotateDocument(p.rich_documents[b],{type:'comment',id:'n-00000000-0000-4000-8000-000000000001',body:'SEGREDO DE REVISÃO',from:1,to:7});annotated=annotateDocument(annotated,{type:'footnote',id:'n-00000000-0000-4000-8000-000000000002',body:'Fonte editorial preservada.',from:1,to:7});saveRichDocument(p,b,annotated);
await writeFile(process.argv[1]+'/book.docx',exportDocx(p));await writeFile(process.argv[1]+'/book.epub',exportEpub(p));
"""
subprocess.run(['node','--input-type=module','-e',script,str(base)],cwd=root,check=True)
for name in ['book.docx','book.epub']:
 with ZipFile(base/name) as archive:
  assert archive.testzip() is None
  for item in archive.namelist():
   assert '..' not in item.split('/') and not item.startswith('/')
   if item.endswith(('.xml','.rels','.opf','.xhtml')):ET.fromstring(archive.read(item));assert b'SEGREDO' not in archive.read(item)
with ZipFile(base/'book.docx') as archive:
 document=ET.fromstring(archive.read('word/document.xml'));w={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 assert document.find('.//w:b',w) is not None and document.find('.//w:i',w) is not None
with ZipFile(base/'book.epub') as archive:
 assert archive.infolist()[0].filename=='mimetype'
 assert archive.infolist()[0].compress_type==ZIP_STORED
 assert archive.read('mimetype')==b'application/epub+zip'
 body=ET.fromstring(archive.read('EPUB/book.xhtml'));x={'x':'http://www.w3.org/1999/xhtml'};assert body.find('.//x:strong',x) is not None and body.find('.//x:ul',x) is not None
 opf=ET.fromstring(archive.read('EPUB/package.opf'))
 ns={'o':'http://www.idpf.org/2007/opf','dc':'http://purl.org/dc/elements/1.1/'}
 assert opf.find('o:metadata/dc:title',ns).text=='Livro de prova & marés'
 manifest={item.attrib['id']:item for item in opf.findall('o:manifest/o:item',ns)}
 for item in manifest.values():assert 'EPUB/'+item.attrib['href'] in archive.namelist()
 for item in opf.findall('o:spine/o:itemref',ns):assert item.attrib['idref'] in manifest
 assert any(item.attrib.get('properties')=='nav' for item in manifest.values())
profile=base/'lo-profile'
result=subprocess.run(['libreoffice','-env:UserInstallation='+profile.as_uri(),'--headless','--convert-to','pdf','--outdir',str(base),str(base/'book.docx')],capture_output=True,text=True,timeout=40)
assert result.returncode==0,result.stderr
assert (base/'book.pdf').exists(),result.stdout+result.stderr
subprocess.run(['pdftotext',str(base/'book.pdf'),str(base/'book.txt')],check=True)
text=re.sub(r'\[\d+\]', '', (base/'book.txt').read_text())
for expected in ['Livro de prova & marés','Capítulo Um','Capítulo Dois','Olá, mundo!','Texto final preservado.','Título visual','Item visual','Fonte editorial preservada.']:assert expected in text,expected
assert 'FORA DA PUBLICAÇÃO' not in text
print(json.dumps({'ok':True,'docx':'opened in LibreOffice and converted to readable PDF','epub':'ZIP/XML/manifest/spine validated; EPUBCheck not installed','artifacts':str(base)},ensure_ascii=False))
