"""Bounded text extraction from XML office archives; no macros, links or objects execute."""
import sys,zipfile,json,xml.etree.ElementTree as ET
try:
 import resource
 resource.setrlimit(resource.RLIMIT_AS,(384*1024*1024,384*1024*1024))
 resource.setrlimit(resource.RLIMIT_CPU,(10,10))
except (ImportError,ValueError):pass
filename,kind=sys.argv[1:]
with zipfile.ZipFile(filename) as archive:
 items=archive.infolist()
 if len(items)>4000 or sum(i.file_size for i in items)>32000000 or any(i.flag_bits&1 for i in items):raise ValueError('Archive exceeds limits or is encrypted')
 if kind=='docx': names=['word/document.xml']; paragraph='p'; texttag='t'
 elif kind=='odt':names=['content.xml'];paragraph='p';texttag=None
 else:raise ValueError('Unsupported archive')
 output=[]
 for name in names:
  entry=archive.getinfo(name)
  if entry.file_size>8000000:raise ValueError('XML exceeds limit')
  data=archive.read(entry)
  if b'\0' in data or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():raise ValueError('DTD forbidden')
  root=ET.fromstring(data)
  for element in root.iter():
   if element.tag.split('}')[-1] in ([paragraph] if kind=='docx' else ['p','h']):
    value=''.join((child.text or '') if child.tag.split('}')[-1]==texttag else '\t' if child.tag.split('}')[-1]=='tab' else '\n' if child.tag.split('}')[-1] in ['br','cr'] else '' for child in element.iter()) if texttag else ''.join(element.itertext())
    output.append(value)
 text='\n\n'.join(output)
 if len(text)>1000000:raise ValueError('Extracted text exceeds limit')
 print(json.dumps({'text':text},ensure_ascii=False))
