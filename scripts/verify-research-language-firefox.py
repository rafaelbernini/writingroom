"""Attachment extraction, offline lookup and machine-translation preview using synthetic data only."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler,HTTPServer
from threading import Thread
import json
received=[]
class Provider(BaseHTTPRequestHandler):
 def do_POST(self):
  received.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'translatedText':'A casa traduzida em 1920.'}).encode())
 def log_message(self,*args):pass
provider=HTTPServer(('127.0.0.1',0),Provider);Thread(target=provider.serve_forever,daemon=True).start()
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
prefix=prefix.replace('env=dict(os.environ,PORT=', 'env=dict(os.environ,WRITINGROOM_TRANSLATE_URL='+repr('http://127.0.0.1:'+str(provider.server_port)+'/translate')+',WRITINGROOM_TRANSLATE_KEY="SYNTHETIC-KEY",WRITINGROOM_TRANSLATE_LABEL="Serviço local de teste",PORT=')
cleanup=source[source.index('\nexcept Exception:\n try:\n  screenshot')+1:]
body=''' js('document.getElementById("newProjectBtn").click();return true;');wait('document.getElementById("newProjectDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("newProjectName").value="Pesquisa e tradução de anexo";document.getElementById("newProjectForm").requestSubmit();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 encoded=subprocess.check_output(['node','--input-type=module','-e',"import {makeProject,addNode,updateText} from './packages/core/src/core.mjs';import {exportDocx} from './packages/core/src/book-export.mjs';const p=makeProject(),id=addNode(p,p.roots.draft,'Chapter');updateText(p,id,'The house was built in 1920. Unique evidence.');process.stdout.write(exportDocx(p).toString('base64'));"],cwd=root,text=True)
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert')
 js('document.getElementById("assetsModeBtn").click();return true;');wait('!document.getElementById("workspace").inert')
 js('const f=new DataTransfer();f.items.add(new File([Uint8Array.from(atob('+json.dumps(encoded)+'),c=>c.charCodeAt(0))],"Source.docx"));document.getElementById("attachmentFile").files=f.files;document.getElementById("attachmentFile").dispatchEvent(new Event("change"));return true;');wait('document.getElementById("attachmentDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("confirmAttachmentBtn").click();return true;');wait('!document.getElementById("attachmentDialog").open && !document.getElementById("attachmentView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll("#attachmentView button")).find(b=>b.textContent.includes("Extrair texto")).click();return true;');wait('document.getElementById("extractionDialog").open && !document.getElementById("workspace").inert')
 assert 'Unique evidence' in js('return document.getElementById("extractionText").value')
 screenshot('01-docx-extraction.png')
 js('const t=document.getElementById("extractionText");t.setSelectionRange(t.value.indexOf("The house"),t.value.length);return true;')
 js('document.getElementById("extractionResearchBtn").click();return true;');wait('!document.getElementById("extractionDialog").open && document.getElementById("editor").value.includes("Unique evidence") && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("editor").value').startswith('The house')
 js('document.getElementById("languageToolsBtn").click();return true;');wait('document.getElementById("languageDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("lookupFrom").value="pt-BR";document.getElementById("languageQuery").value="casa";document.getElementById("localDictionaryBtn").click();return true;');wait('document.getElementById("localDictionaryResults").textContent.includes("MyThes") || document.getElementById("localDictionaryResults").textContent.includes("th_pt")')
 wait('!document.getElementById("workspace").inert')
 glossary={'format':'writingroom-lexicon-1','name':'Base de teste','source':'Autor do teste','license':'Uso autorizado','entries':[{'term':'casa','language':'pt-BR','definition':'DEFINICAO-OFFLINE-UNICA','synonyms':['lar'],'translations':[{'language':'en','text':'house'}]}]}
 js('const f=new DataTransfer();f.items.add(new File(['+json.dumps(json.dumps(glossary))+'],"lexicon.json"));document.getElementById("lexiconFile").files=f.files;document.getElementById("lexiconFile").dispatchEvent(new Event("change"));return true;');accept_alert();wait('document.getElementById("localDictionaryResults").textContent.includes("1 verbetes") && !document.getElementById("workspace").inert')
 js('document.getElementById("localDictionaryBtn").click();return true;');wait('document.getElementById("localDictionaryResults").textContent.includes("DEFINICAO-OFFLINE-UNICA") && !document.getElementById("workspace").inert')
 screenshot('02-offline-dictionary.png')
 js('document.getElementById("lookupFrom").value="en";document.getElementById("lookupTo").value="pt-BR";document.getElementById("languageQuery").value="The house in 1920.";document.getElementById("openMachineTranslationBtn").click();return true;');wait('document.getElementById("machineDialog").open && !document.getElementById("workspace").inert')
 assert not received
 js('document.getElementById("machineConsent").checked=true;document.getElementById("machineRequestBtn").click();return true;');wait('document.getElementById("machineOutput").value.includes("A casa traduzida") && !document.getElementById("workspace").inert')
 assert len(received)==1 and received[0]['q']=='The house in 1920.' and received[0]['api_key']=='SYNTHETIC-KEY'
 screenshot('03-machine-preview.png')
 js('document.getElementById("machineInput").value+=" changed";document.getElementById("machineUseBtn").click();return true;');accept_alert();wait('!document.getElementById("workspace").inert');assert js('return document.getElementById("machineDialog").open')
 js('document.getElementById("machineInput").value="The house in 1920.";return true;')
 js('document.getElementById("machineUseBtn").click();return true;');wait('document.getElementById("translationDialog").open && !document.getElementById("machineDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("translationInitial").value')=='A casa traduzida em 1920.'
 js('document.getElementById("languageDialog").close();document.getElementById("translationForm").requestSubmit();return true;');wait('!document.getElementById("translationDialog").open && !document.getElementById("translationView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#translationCards .scene-card").length')==1
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===1')
 js('document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("translationTab").click();return true;');wait('!document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#translationCards .scene-card").length')==1
 print(json.dumps({'ok':True,'checks':['docx-attachment-import-extract-preview','research-from-attachment-selection','system-synonyms-query','lexicon-import-offline-query','machine-service-explicit-consent-preview','machine-use-before-confirm-reload'],'artifacts':str(artifacts)}),flush=True)
'''
try:exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__','received':received})
finally:provider.shutdown();provider.server_close()
