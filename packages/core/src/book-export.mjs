import {compilation} from './workspace.mjs';
import {normalizeRichDocument,richHtml,richAnnotations} from '../../editor/src/schema.mjs';
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
// Store-only ZIP writer. Fixed entry paths, UTF-8 names, no macros or executable content.
function zip(entries){
 const local=[],central=[];let offset=0,total=0;
 for(const [name,value] of entries){
  if(name.startsWith('/')||name.split('/').includes('..'))throw new Error('Caminho de exportação inválido');
  const filename=Buffer.from(name),data=Buffer.from(value),crc=crc32(data);total+=data.length;
  if(total>100000000||entries.length>60000)throw new Error('Exportação grande demais');
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
  local.push(header,filename,data);
  const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50,0);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(data.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);central.push(directory,filename);offset+=header.length+filename.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
function xml(value){
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value)||Array.from(value).some(c=>c.codePointAt(0)>=0xd800&&c.codePointAt(0)<=0xdfff))throw new Error('Caractere não suportado por XML');
 return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function planFor(project){const plan=compilation(project);if(!plan.sections.length)throw new Error('Inclua uma cena antes de exportar');if(plan.sections.length>5000)throw new Error('Limite de 5000 cenas');return plan;}
function wordParagraph(text,style='Normal'){
 const runs=text.split('\t').map(piece=>'<w:t xml:space="preserve">'+xml(piece)+'</w:t>').join('<w:tab/>');
 return '<w:p><w:pPr><w:pStyle w:val="'+style+'"/></w:pPr><w:r>'+runs+'</w:r></w:p>';
}
function visualWord(value,links){
 const doc=normalizeRichDocument(value).doc,notes=richAnnotations(value).filter(a=>a.type==='footnote'),remaining=new Map();
 function count(node){for(const m of node.marks||[])if(m.type==='footnote')remaining.set(m.attrs.id,(remaining.get(m.attrs.id)||0)+1);for(const child of node.content||[])count(child);}count(doc);
 function inline(node){
  if(node.type==='hard_break')return '<w:r><w:br/></w:r>';
  if(node.type!=='text')return '';
  let props='';for(const mark of node.marks||[]){if(mark.type==='strong')props+='<w:b/>';if(mark.type==='em')props+='<w:i/>';if(mark.type==='underline'||mark.type==='link')props+='<w:u w:val="single"/>';if(mark.type==='strike')props+='<w:strike/>';if(mark.type==='code')props+='<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>';}
  let suffix='';for(const mark of node.marks||[])if(mark.type==='footnote'){const left=remaining.get(mark.attrs.id)-1;remaining.set(mark.attrs.id,left);if(!left)suffix+='<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>['+(notes.findIndex(n=>n.id===mark.attrs.id)+1)+']</w:t></w:r>';}
  const run='<w:r>'+(props?'<w:rPr>'+props+'</w:rPr>':'')+node.text.split('\t').map(piece=>'<w:t xml:space="preserve">'+xml(piece)+'</w:t>').join('<w:tab/>')+'</w:r>';
  const link=(node.marks||[]).find(m=>m.type==='link');if(link){let id=links.ids.get(link.attrs.href);if(!id){id='link'+links.items.length;links.ids.set(link.attrs.href,id);links.items.push({id,href:link.attrs.href});}return '<w:hyperlink r:id="'+id+'">'+run+'</w:hyperlink>'+suffix;}return run+suffix;
 }
 function blocks(node,prefix='',quote=false){
  if(['paragraph','heading','code_block'].includes(node.type)){
   const style=node.type==='heading'?'Heading'+((node.attrs?.level||1)+1):node.type==='code_block'?'CodeBlock':'Normal';
   return '<w:p><w:pPr><w:pStyle w:val="'+style+'"/>'+(quote?'<w:ind w:left="720"/>':'')+'</w:pPr>'+(prefix?'<w:r><w:t xml:space="preserve">'+xml(prefix)+'</w:t></w:r>':'')+(node.content||[]).map(inline).join('')+'</w:p>';
  }
  if(node.type==='horizontal_rule')return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4"/></w:pBdr></w:pPr></w:p>';
  if(node.type==='bullet_list'||node.type==='ordered_list')return (node.content||[]).map((item,i)=>blocks(item,node.type==='bullet_list'?'• ':String((node.attrs?.order||1)+i)+'. ',quote)).join('');
  return (node.content||[]).map((child,i)=>blocks(child,i===0?prefix:'',quote||node.type==='blockquote')).join('');
 }return blocks(doc)+(notes.length?wordParagraph('Notas','Heading2')+notes.map((note,index)=>note.body.split(/\r\n|\n|\r/).map((line,i)=>wordParagraph((i?'':'['+(index+1)+'] ')+line)).join('')).join(''):'');
}
export function exportDocx(project){
 const links={ids:new Map(),items:[]};const plan=planFor(project),w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const body=wordParagraph(plan.title,'Title')+(plan.author?wordParagraph(plan.author):'')+plan.sections.map(s=>wordParagraph(s.title,'Heading1')+(project.rich_documents?.[s.id]?visualWord(project.rich_documents[s.id],links):s.text.split(/\r\n|\n|\r/).map(line=>wordParagraph(line)).join(''))).join('');
 return zip([
  ['[Content_Types].xml',declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
  ['_rels/.rels',declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="properties" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
  ['word/document.xml',declaration+'<w:document xmlns:w="'+w+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>'],
  ['word/_rels/document.xml.rels',declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+links.items.map(link=>'<Relationship Id="'+link.id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="'+xml(link.href)+'" TargetMode="External"/>').join('')+'</Relationships>'],
  ['word/styles.xml',declaration+'<w:styles xmlns:w="'+w+'"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="48"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>'],
  ['docProps/core.xml',declaration+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+xml(plan.title)+'</dc:title><dc:creator>'+xml(plan.author)+'</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+new Date(project.created_at).toISOString()+'</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">'+new Date(project.updated_at).toISOString()+'</dcterms:modified></cp:coreProperties>']
 ]);
}
function xhtmlRich(value,prefix){const output=richHtml(value,{prefix});xml(output);return output;}
export function exportEpub(project){
 const plan=planFor(project),language=project.settings?.language==='en-US'?'en-US':'pt-BR';
 const head='<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="'+language+'" lang="'+language+'"><head><title>'+xml(plan.title)+'</title><meta charset="utf-8"/><link rel="stylesheet" type="text/css" href="style.css"/></head>';
 const content=head+'<body><header><h1>'+xml(plan.title)+'</h1><p>'+xml(plan.author)+'</p></header>'+plan.sections.map((s,i)=>'<section id="c'+i+'"><h2>'+xml(s.title)+'</h2>'+(project.rich_documents?.[s.id]?xhtmlRich(project.rich_documents[s.id],s.id):s.text.split(/\r\n|\n|\r/).map(line=>'<p>'+xml(line)+'</p>').join(''))+'</section>').join('')+'</body></html>';
 return zip([
  ['mimetype','application/epub+zip'],
  ['META-INF/container.xml','<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'],
  ['EPUB/package.opf','<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:'+xml(project.id)+'</dc:identifier><dc:title>'+xml(plan.title)+'</dc:title><dc:language>'+language+'</dc:language>'+(plan.author?'<dc:creator>'+xml(plan.author)+'</dc:creator>':'')+'<meta property="dcterms:modified">'+new Date(project.updated_at).toISOString().replace(/\.\d{3}Z$/,'Z')+'</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="book" href="book.xhtml" media-type="application/xhtml+xml"/><item id="style" href="style.css" media-type="text/css"/></manifest><spine><itemref idref="book"/></spine></package>'],
  ['EPUB/nav.xhtml',head+'<body><nav epub:type="toc" id="toc"><h1>Sumário</h1><ol>'+plan.sections.map((s,i)=>'<li><a href="book.xhtml#c'+i+'">'+xml(s.title)+'</a></li>').join('')+'</ol></nav></body></html>'],
  ['EPUB/book.xhtml',content],
  ['EPUB/style.css','body{font-family:serif;line-height:1.6;margin:1em}p{white-space:pre-wrap;margin:.6em 0}section{break-before:page}li{white-space:pre-wrap}h1,h2{line-height:1.2}']
 ]);
}
