"""Real Firefox smoke test. Uses an isolated profile and synthetic project in /tmp.
Requires Firefox, Python stdlib, and loopback permissions; never uses the user's profile.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request

root=Path(__file__).resolve().parents[1]
artifacts=Path(tempfile.mkdtemp(prefix='writingroom-browser-'))
server=browser=None
connection=None
try:
 subprocess.run(['npm','run','build:editor'],cwd=root,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 env=dict(os.environ,PORT='0',WRITINGROOM_HOME=str(artifacts/'projects'),WRITINGROOM_BACKUP_HOME=str(artifacts/'migration-backups'),WRITINGROOM_BACKUP_DESTINATIONS=json.dumps({'local':str(artifacts/'migration-backups'/'managed')}))
 server=subprocess.Popen(['node','apps/web/server.mjs'],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 line=server.stdout.readline().strip()
 if not line.startswith('Writingroom Alpha: '):raise RuntimeError('Server did not start: '+line)
 url=line.split(': ',1)[1]
 profile=artifacts/'profile';profile.mkdir();(artifacts/'downloads').mkdir()
 with socket.socket() as probe:
  probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
 prefs={'browser.download.folderList':2,'browser.download.dir':str(artifacts/'downloads'),'browser.download.useDownloadDir':True,'browser.helperApps.neverAsk.saveToDisk':'application/json,text/markdown,text/plain,text/html,application/octet-stream,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document','marionette.port':port,'browser.shell.checkDefaultBrowser':False,'browser.startup.homepage':'about:blank','browser.startup.page':0,'browser.aboutwelcome.enabled':False,'browser.startup.firstrunSkipsHomepage':True,'datareporting.policy.dataSubmissionEnabled':False,'datareporting.healthreport.uploadEnabled':False,'toolkit.telemetry.enabled':False,'network.captive-portal-service.enabled':False,'network.connectivity-service.enabled':False,'app.update.auto':False,'browser.newtabpage.enabled':False}
 (profile/'user.js').write_text('\n'.join('user_pref('+json.dumps(k)+','+json.dumps(v)+');' for k,v in prefs.items()))
 browser_env=dict(os.environ,MOZ_HEADLESS_WIDTH='1440',MOZ_HEADLESS_HEIGHT='1000',XDG_CACHE_HOME=str(artifacts/'cache'))
 browser=subprocess.Popen(['firefox','--headless','--no-remote','--profile',str(profile),'--marionette','about:blank'],env=browser_env,stdout=open(artifacts/'firefox.log','w'),stderr=subprocess.STDOUT)
 for _ in range(100):
  try:connection=socket.create_connection(('127.0.0.1',port),timeout=1);break
  except OSError:
   if browser.poll() is not None:raise RuntimeError('Firefox exited; inspect '+str(artifacts/'firefox.log'))
   time.sleep(.1)
 if connection is None:raise RuntimeError('Marionette did not start')
 connection.settimeout(20)
 def receive():
  prefix=b''
  while not prefix.endswith(b':'):
   chunk=connection.recv(1)
   if not chunk:raise RuntimeError('Firefox closed connection')
   prefix+=chunk
  length=int(prefix[:-1]);data=b''
  while len(data)<length:data+=connection.recv(length-len(data))
  return json.loads(data)
 receive();sequence=0
 def command(name,params=None):
  global sequence
  sequence+=1;payload=json.dumps([0,sequence,name,params or {}],ensure_ascii=False).encode();connection.sendall(str(len(payload)).encode()+b':'+payload)
  response=receive()
  if response[0]!=1 or response[1]!=sequence:raise RuntimeError('Unexpected message')
  if response[2]:raise RuntimeError(json.dumps(response[2]))
  return response[3]
 def js(script):
  result=command('WebDriver:ExecuteScript',{'script':script,'args':[],'newSandbox':False,'sandbox':None,'line':1,'filename':'studio-smoke.py'})
  return result.get('value') if isinstance(result,dict) and 'value' in result else result
 def wait(expression):
  for _ in range(100):
   if js('return Boolean('+expression+');'):return
   time.sleep(.1)
  raise RuntimeError('Timed out: '+expression+'; status='+str(js('return document.getElementById("saveStatus").textContent')))
 def accept_alert(text=None):
  for _ in range(100):
   try:
    command('WebDriver:GetAlertText')
    if text is not None:command('WebDriver:SendAlertText',{'text':text})
    command('WebDriver:AcceptAlert');return
   except RuntimeError as error:
    if 'no such alert' not in str(error):raise
    time.sleep(.1)
  raise RuntimeError('Native dialog did not appear')
 def screenshot(name):
  result=command('WebDriver:TakeScreenshot',{'id':None,'highlights':[],'full':True})
  if isinstance(result,dict):result=result['value']
  (artifacts/name).write_bytes(base64.b64decode(result))
 command('WebDriver:NewSession',{'capabilities':{'alwaysMatch':{'acceptInsecureCerts':True,'unhandledPromptBehavior':'ignore'}}})
 command('WebDriver:Navigate',{'url':url})
 wait('document.getElementById("libraryEmpty") && !document.getElementById("libraryEmpty").classList.contains("hidden")')
 screenshot('01-library.png')
 js('document.getElementById("newProjectBtn").click();return true;')
 assert js('return document.getElementById("newProjectDialog").open;')
 js('document.getElementById("newProjectName").value="O mapa das marés";document.getElementById("projectTemplate").value="novel";document.getElementById("newProjectForm").requestSubmit();return true;')
 wait('!document.getElementById("workspace").classList.contains("hidden") && document.getElementById("documentTitle").value==="A primeira cena"')
 content='O farol acendeu antes da noite.\n\nLia abriu o mapa e encontrou uma ilha que não existia ontem. 🌊'
 js('document.getElementById("editor").value='+json.dumps(content)+';document.getElementById("editor").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("storyTab").click();return true;')
 wait('!document.getElementById("storyView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll(".scene-card").length')==2
 js('document.getElementById("outlineBtn").click();return true;');wait('!document.getElementById("outline").classList.contains("hidden")')
 assert js('return document.querySelectorAll("#outline tbody tr").length')==2
 js('document.getElementById("cardsBtn").click();return true;');wait('!document.getElementById("cards").classList.contains("hidden")')
 screenshot('02-cards.png')
 js('document.getElementById("writeTab").click();return true;');wait('!document.getElementById("writeView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("editor").value')==content
 js('document.getElementById("notes").value="A maré revela os caminhos.";document.getElementById("notes").dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("sceneGoal").value="500";document.getElementById("sceneGoal").dispatchEvent(new Event("change",{bubbles:true}));return true;')
 wait('document.getElementById("saveStatus").textContent.includes("Salvo")')
 js('document.getElementById("referenceBtn").click();return true;');wait('!document.getElementById("referencePanel").classList.contains("hidden")')
 screenshot('03-editor.png')
 js('document.getElementById("readTab").click();return true;');wait('!document.getElementById("readView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("manuscript").textContent').find(content)>=0
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 screenshot('04-publish.png')
 # Browser DOM and server disk must refer to the same document after actual UI saves.
 with urllib.request.urlopen(url+'/api/projects') as response:projects=json.load(response)
 project_id=projects[0]['id']
 with urllib.request.urlopen(url+'/api/projects/'+project_id) as response:saved=json.load(response)
 scene_id=next(iter(saved['documents']))
 assert saved['documents'][scene_id]==content
 assert next(n for n in saved['nodes'] if n['id']==scene_id)['notes']=='A maré revela os caminhos.'
 # Reopen the actual page and project: notes, goal and content must persist.
 command('WebDriver:Navigate',{'url':url})
 wait('document.querySelectorAll(".book").length===1')
 js('document.querySelector(".book").click();return true;')
 wait('!document.getElementById("workspace").classList.contains("hidden") && document.getElementById("editor").value.includes("farol")')
 assert js('return document.getElementById("notes").value')=='A maré revela os caminhos.'
 assert js('return document.getElementById("sceneGoal").value')=='500'
 # Import through the real file control (synthetic File, UTF-8 decoding and preview API).
 js('document.getElementById("importBtn").click();return true;')
 wait('document.getElementById("importDialog").open')
 import_text='# A ilha\nUm caminho sob a água.\n## O retorno\nA luz do farol permaneceu acesa.'
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(import_text)+'],"Cenas.md",{type:"text/markdown"}));document.getElementById("importFile").files=transfer.files;document.getElementById("importSplit").checked=true;document.getElementById("importFile").dispatchEvent(new Event("change",{bubbles:true}));return true;')
 wait('!document.getElementById("confirmImportBtn").disabled && !document.getElementById("workspace").inert')
 assert '2 cenas' in js('return document.getElementById("importPreview").textContent')
 js('document.getElementById("confirmImportBtn").click();return true;')
 wait('!document.getElementById("importDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll(".scene-card").length')==3
 # Open the original scene, snapshot, edit, compare and restore from the actual dialog.
 js('document.querySelector(".scene-card .card-actions button").click();return true;')
 wait('document.getElementById("documentTitle").value==="A primeira cena" && !document.getElementById("workspace").inert')
 js('document.getElementById("snapshotBtn").click();return true;')
 accept_alert('Marco Firefox')
 wait('document.getElementById("saveStatus").textContent.includes("Versão guardada") && !document.getElementById("workspace").inert')
 js('document.getElementById("editor").value+=" Revisão posterior.";document.getElementById("editor").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("versionsBtn").click();return true;')
 wait('document.getElementById("versionsDialog").open && !document.getElementById("workspace").inert')
 js('document.querySelectorAll("#versionsList button")[1].click();return true;')
 assert 'Revisão posterior' in js('return document.getElementById("versionsList").textContent')
 screenshot('06-versions.png')
 js('document.getElementById("openComparisonBtn").click();return true;');wait('document.getElementById("comparisonDialog").open && document.querySelectorAll(".version-diff-row").length>0 && !document.getElementById("workspace").inert')
 assert 'Revisão posterior' in js('return document.getElementById("comparisonRows").textContent')
 js('document.getElementById("comparisonOnlyChanges").checked=true;document.getElementById("comparisonOnlyChanges").dispatchEvent(new Event("change"));document.getElementById("comparisonNextBtn").click();return true;')
 assert js('return document.querySelectorAll("#comparisonRows [data-kind=same]").length')==0
 screenshot('26-comparison.png')
 js('document.querySelector("#comparisonDialog [data-close]").click();return true;');wait('!document.getElementById("comparisonDialog").open')
 js('document.querySelector("#versionsList button").click();return true;')
 accept_alert()
 wait('!document.getElementById("versionsDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("editor").value')==content
 # Split by the real cursor; the original version remains available.
 js('document.getElementById("editor").focus();document.getElementById("editor").setSelectionRange(30,30);document.getElementById("splitBtn").click();return true;')
 accept_alert('Cena dividida')
 wait('document.getElementById("documentTitle").value==="Cena dividida" && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("editor").value')==content[30:]
 # Settings and theme are visible, real and persistent.
 js('document.getElementById("settingsBtn").click();return true;');wait('document.getElementById("settingsDialog").open')
 js('document.getElementById("settingsAuthor").value="Mira";document.getElementById("settingsGoal").value="30000";document.getElementById("settingsForm").requestSubmit();return true;')
 wait('!document.getElementById("settingsDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("themeBtn").click();return true;');wait('document.getElementById("appearanceDialog").open')
 js('document.querySelector("input[name=appearance-theme][value=classic-dark]").click();document.getElementById("appearanceApplyBtn").click();return true;');wait('document.body.classList.contains("dark") && !document.getElementById("appearanceDialog").open')
 assert js('return getComputedStyle(document.body).color')=='rgb(226, 230, 218)'
 wait('getComputedStyle(document.getElementById("versionsBtn")).backgroundColor === "rgb(37, 46, 39)"')
 time.sleep(.15)
 screenshot('07-dark.png')
 js('document.getElementById("themeBtn").click();return true;');wait('document.getElementById("appearanceDialog").open')
 js('document.querySelector("input[name=appearance-theme][value=classic-light]").click();document.getElementById("appearanceApplyBtn").click();document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 # Download a real JSON backup in the isolated browser download directory.
 js('document.getElementById("backupBtn").click();return true;')
 for _ in range(100):
  backups=list((artifacts/'downloads').glob('*.json'))
  if backups and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert backups,'Backup download did not appear in isolated directory'
 backup=json.loads(backups[0].read_text());assert backup['format']=='writingroom-json-backup';assert backup['project']['settings']['author']=='Mira'
 # A deliberately failed save keeps the latest local draft, and a real server change prompts conflict resolution.
 js('document.getElementById("writeTab").click();return true;');wait('!document.getElementById("writeView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 local_text=content[30:]+' Texto local a preservar.'
 saved_file=artifacts/'projects'/(project_id+'.wroom')/'project.json'
 parked_file=saved_file.with_name('test-preserved.json');saved_file.rename(parked_file)
 js('document.getElementById("editor").value='+json.dumps(local_text)+';document.getElementById("editor").dispatchEvent(new Event("input",{bubbles:true}));return true;')
 wait('!document.getElementById("retryBtn").classList.contains("hidden")')
 parked_file.rename(saved_file)
 with urllib.request.urlopen(url+'/api/projects/'+project_id) as response:remote=json.load(response)
 split_id=next(n['id'] for n in remote['nodes'] if n['title']=='Cena dividida')
 request=urllib.request.Request(url+'/api/projects/'+project_id+'/text',data=json.dumps({'id':split_id,'text':'Texto de outra sessão','base_hash':remote['document_hashes'][split_id]}).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(request) as response:assert response.status==200
 js('document.getElementById("retryBtn").click();return true;');wait('document.getElementById("conflictDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("localConflict").textContent')==local_text
 assert js('return document.getElementById("remoteConflict").textContent')=='Texto de outra sessão'
 js('document.getElementById("keepLocalBtn").click();return true;');wait('!document.getElementById("conflictDialog").open && !document.getElementById("workspace").inert')
 with urllib.request.urlopen(url+'/api/projects/'+project_id) as response:resolved=json.load(response)
 assert resolved['documents'][split_id]==local_text
 assert any(s['content']=='Texto de outra sessão' for s in resolved['snapshots'])
 # Restore the downloaded backup through the library file control into a new project.
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 backup_text=json.dumps(backup,ensure_ascii=False)
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(backup_text)+'],"backup.json",{type:"application/json"}));document.getElementById("backupFile").files=transfer.files;document.getElementById("backupFile").dispatchEvent(new Event("change",{bubbles:true}));return true;')
 accept_alert()
 wait('document.getElementById("projectName").textContent.includes("(restaurado)") && !document.getElementById("workspace").inert')
 with urllib.request.urlopen(url+'/api/projects') as response:assert len(json.load(response))==2
 # New editorial tools: selective preview, apply and preserved snapshots.
 js('document.getElementById("findReplaceBtn").click();return true;');wait('document.getElementById("replaceDialog").open')
 js('document.getElementById("replaceFind").value="farol";document.getElementById("replaceWith").value="observatório";document.getElementById("replaceScope").value="draft";document.getElementById("previewReplaceBtn").click();return true;')
 wait('document.querySelectorAll(".replace-occurrence").length>0 && !document.getElementById("workspace").inert')
 assert 'ocorrências selecionadas' in js('return document.getElementById("replaceSummary").textContent')
 screenshot('08-replace-preview.png')
 js('document.getElementById("clearReplaceBtn").click();return true;');wait('document.getElementById("applyReplaceBtn").disabled')
 js('document.getElementById("selectAllReplaceBtn").click();return true;');wait('!document.getElementById("applyReplaceBtn").disabled')
 js('document.getElementById("applyReplaceBtn").click();return true;');accept_alert()
 wait('!document.getElementById("replaceDialog").open && !document.getElementById("workspace").inert')
 assert 'observatório' in js('return document.getElementById("editor").value')
 # Create a real character document, then reference it from a collection.
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("newEntityBtn").click();return true;');wait('document.getElementById("entityDialog").open')
 js('document.getElementById("entityName").value="Lia";document.getElementById("entityType").value="character";document.getElementById("entityForm").requestSubmit();return true;')
 wait('document.getElementById("documentTitle").value==="Lia" && !document.getElementById("workspace").inert')
 assert 'Desejo e necessidade' in js('return document.getElementById("editor").value')
 js('document.getElementById("editor").value+="A cartógrafa do arquipélago.";document.getElementById("editor").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("notebookTab").click();return true;')
 wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert 'Lia' in js('return document.getElementById("entityCards").textContent')
 screenshot('09-notebook.png')
 js('document.getElementById("collectionsModeBtn").click();return true;');wait('!document.getElementById("collectionsPanel").classList.contains("hidden")')
 js('document.getElementById("newCollectionBtn").click();return true;');wait('document.getElementById("collectionDialog").open')
 js('document.getElementById("collectionName").value="Elenco";document.getElementById("collectionType").value="manual";document.getElementById("collectionForm").requestSubmit();return true;')
 wait('!document.getElementById("collectionDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("collectionNode").value=Array.from(document.getElementById("collectionNode").options).find(o=>o.textContent.endsWith("/ Lia")).value;document.getElementById("addCollectionNodeBtn").click();return true;')
 wait('document.querySelectorAll("#collectionMembers .collection-row").length===1 && !document.getElementById("workspace").inert')
 assert 'Lia' in js('return document.getElementById("collectionMembers").textContent')
 js('Array.from(document.querySelectorAll("#collectionMembers button")).find(b=>b.textContent==="Remover referência").click();return true;')
 wait('document.querySelectorAll("#collectionMembers .collection-row").length===0 && !document.getElementById("workspace").inert')
 assert 'Lia' in js('return document.getElementById("entityCards").textContent')
 js('document.getElementById("addCollectionNodeBtn").click();return true;');wait('document.querySelectorAll("#collectionMembers .collection-row").length===1 && !document.getElementById("workspace").inert')
 js('document.getElementById("newCollectionBtn").click();return true;');wait('document.getElementById("collectionDialog").open')
 js('document.getElementById("collectionName").value="Tudo sobre Lia";document.getElementById("collectionType").value="query";document.getElementById("collectionQuery").value="Lia";document.getElementById("collectionForm").requestSubmit();return true;')
 wait('!document.getElementById("collectionDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("addCollectionNodeBtn").disabled')
 assert 'Lia' in js('return document.getElementById("collectionMembers").textContent')
 js('document.getElementById("scratchModeBtn").click();return true;');wait('!document.getElementById("scratchPanel").classList.contains("hidden")')
 capture='Uma carta escondida na biblioteca.'
 js('document.getElementById("scratchpad").value='+json.dumps(capture)+';document.getElementById("scratchpad").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("saveScratchBtn").click();return true;')
 wait('document.getElementById("scratchStatus").textContent.includes("salva") && !document.getElementById("workspace").inert')
 js('document.getElementById("captureSceneBtn").click();return true;');wait('document.getElementById("captureDialog").open')
 js('document.getElementById("captureTitle").value="A carta";document.getElementById("captureForm").requestSubmit();return true;')
 wait('document.getElementById("documentTitle").value==="A carta" && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("editor").value')==capture
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert')
 assert js('return document.getElementById("scratchpad").value')==capture
 # Download the actual new export formats, not a renamed text file.
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 for fmt in ['docx','epub']:
  js('document.getElementById("exportFormat").value='+json.dumps(fmt)+';document.getElementById("exportBtn").click();return true;')
  for _ in range(100):
   files=list((artifacts/'downloads').glob('*.'+fmt))
   if files and not list((artifacts/'downloads').glob('*.part')):break
   time.sleep(.1)
  assert files,fmt+' download missing'
  assert files[0].read_bytes()[:4]==b'PK\x03\x04'
  wait('!document.getElementById("workspace").inert')
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===2')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("(restaurado)")).click();return true;')
 wait('!document.getElementById("workspace").inert && document.getElementById("projectName").textContent.includes("(restaurado)")')
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert 'Lia' in js('return document.getElementById("entityCards").textContent')
 js('document.getElementById("scratchModeBtn").click();return true;');wait('!document.getElementById("scratchPanel").classList.contains("hidden")')
 assert js('return document.getElementById("scratchpad").value')==capture
 # Semantic editor: explicit conversion, native keyboard input and real controls.
 js('document.getElementById("writeTab").click();return true;');wait('!document.getElementById("workspace").inert')
 js('document.getElementById("newSceneBtn").click();return true;');accept_alert('Cena visual')
 wait('document.getElementById("documentTitle").value==="Cena visual" && !document.getElementById("workspace").inert')
 js('document.getElementById("editor").value="Texto original **literal**";document.getElementById("editor").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("enableRichBtn").click();return true;');accept_alert()
 wait('!document.getElementById("richEditor").classList.contains("hidden") && document.querySelector("#richEditor .ProseMirror") && !document.getElementById("workspace").inert')
 assert '**literal**' in js('return document.getElementById("richEditor").textContent')
 def editor_element():
  result=command('WebDriver:FindElement',{'using':'css selector','value':'#richEditor .ProseMirror'})
  if isinstance(result,dict) and 'value' in result:result=result['value']
  return result.get('element-6066-11e4-a52e-4f735466cecf') or result.get('ELEMENT')
 def select_all_visual():
  js('document.querySelector("#richEditor .ProseMirror").focus();return true;')
  command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'editor-keyboard','actions':[{'type':'keyDown','value':'\ue009'},{'type':'keyDown','value':'a'},{'type':'keyUp','value':'a'},{'type':'keyUp','value':'\ue009'}]}]})
  command('WebDriver:ReleaseActions')
 visual_text='Cena com voz própria. 🌱'
 select_all_visual();command('WebDriver:ElementSendKeys',{'id':editor_element(),'text':visual_text})
 wait('document.querySelector("#richEditor .ProseMirror").textContent.includes("voz própria")')
 select_all_visual();js('document.getElementById("boldBtn").click();return true;')
 wait('document.querySelector("#richEditor strong")')
 js('document.getElementById("undoBtn").click();return true;');wait('!document.querySelector("#richEditor strong")')
 js('document.getElementById("redoBtn").click();return true;');wait('document.querySelector("#richEditor strong")')
 js('document.getElementById("blockStyle").value="h2";document.getElementById("blockStyle").dispatchEvent(new Event("change",{bubbles:true}));return true;')
 wait('document.querySelector("#richEditor h2 strong")')
 js('document.getElementById("blockStyle").value="paragraph";document.getElementById("blockStyle").dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("bulletListBtn").click();return true;')
 wait('document.querySelector("#richEditor ul li")')
 js('const p=document.querySelector("#richEditor ul li:last-child p");const range=document.createRange();range.selectNodeContents(p);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return true;')
 wait('window.getSelection().isCollapsed')
 command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'list-keyboard','actions':[{'type':'keyDown','value':'\ue007'},{'type':'keyUp','value':'\ue007'}]}]})
 command('WebDriver:ReleaseActions')
 wait('document.querySelectorAll("#richEditor ul li").length===2')
 command('WebDriver:ElementSendKeys',{'id':editor_element(),'text':'Segundo item visual'})
 wait('document.querySelectorAll("#richEditor ul li").length===2')
 select_all_visual();js('document.getElementById("linkBtn").click();return true;');accept_alert('https://example.org/referencia')
 wait('document.querySelector("#richEditor a") && document.querySelector("#richEditor a").getAttribute("href")==="https://example.org/referencia"')
 # The DOM paste hook receives plain text and never parses the hostile HTML clipboard.
 js('const p=document.querySelector("#richEditor ul li:last-child p");const r=document.createRange();r.selectNodeContents(p);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);return true;')
 wait('window.getSelection().isCollapsed')
 clipboard=js('const transfer=new DataTransfer();transfer.setData("text/plain"," Texto colado seguro.");transfer.setData("text/html","<img src=https://evil.invalid/track><script>window.badPaste=true</script>");const event=new ClipboardEvent("paste",{clipboardData:transfer,dataType:"text/plain",data:" Texto colado seguro.",bubbles:true,cancelable:true});const available=event.clipboardData?.getData("text/plain");document.querySelector("#richEditor .ProseMirror").dispatchEvent(event);return {available,prevented:event.defaultPrevented};')
 assert clipboard['available']==' Texto colado seguro.',clipboard
 assert clipboard['prevented'],clipboard
 wait('document.getElementById("richEditor").textContent.includes("Texto colado seguro")')
 assert js('return document.querySelectorAll("#richEditor img, #richEditor script").length')==0
 js('document.getElementById("storyTab").click();return true;');wait('!document.getElementById("storyView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("writeTab").click();return true;');wait('!document.getElementById("writeView").classList.contains("hidden")')
 assert js('return document.querySelectorAll("#richEditor ul li").length')==2
 # Anchored review is edited through the visible form and persists with the scene.
 js('const walker=document.createTreeWalker(document.querySelector("#richEditor strong"),NodeFilter.SHOW_TEXT);const text=walker.nextNode();const r=document.createRange();r.setStart(text,0);r.setEnd(text,4);window.getSelection().removeAllRanges();window.getSelection().addRange(r);return true;')
 js('document.getElementById("addCommentBtn").click();return true;')
 wait('document.getElementById("annotationDialog").open')
 js('document.getElementById("annotationBody").value="COMENTÁRIO PRIVADO: rever voz";document.getElementById("annotationForm").requestSubmit();return true;')
 wait('!document.getElementById("annotationDialog").open && document.querySelector("#richEditor [data-comment]") && document.getElementById("saveStatus").textContent.includes("guardada")')
 assert js('return document.querySelector("#reviewList .review-entry").textContent').find('COMENTÁRIO PRIVADO')>=0
 # Resolve/reopen and edit operate on the same anchor rather than copying the text.
 js('Array.from(document.querySelectorAll("#reviewList button")).find(b=>b.textContent==="Resolver").click();return true;')
 wait('document.getElementById("reviewSummary").textContent.startsWith("0 comentários")')
 js('document.getElementById("reviewFilter").value="all";document.getElementById("reviewFilter").dispatchEvent(new Event("change"));Array.from(document.querySelectorAll("#reviewList button")).find(b=>b.textContent==="Reabrir").click();return true;')
 wait('document.getElementById("reviewSummary").textContent.startsWith("1 comentários")')
 js('Array.from(document.querySelectorAll("#reviewList button")).find(b=>b.textContent==="Editar").click();return true;');wait('document.getElementById("annotationDialog").open')
 js('document.getElementById("annotationBody").value="COMENTÁRIO PRIVADO revisado";document.getElementById("annotationForm").requestSubmit();return true;')
 wait('!document.getElementById("annotationDialog").open && document.getElementById("reviewList").textContent.includes("PRIVADO revisado")')
 js('const text=document.querySelector("#richEditor [data-comment]");const r=document.createRange();r.selectNodeContents(text);window.getSelection().removeAllRanges();window.getSelection().addRange(r);return true;')
 js('document.getElementById("addFootnoteBtn").click();return true;')
 wait('document.getElementById("annotationDialog").open')
 js('document.getElementById("annotationBody").value="Fonte editorial pública & contexto.";document.getElementById("annotationForm").requestSubmit();return true;')
 wait('!document.getElementById("annotationDialog").open && document.querySelector("#richEditor [data-footnote]") && document.getElementById("saveStatus").textContent.includes("guardada")')
 assert js('return document.querySelectorAll("#reviewList .review-entry").length')==2
 js('document.getElementById("reviewSearch").value="pública";document.getElementById("reviewSearch").dispatchEvent(new Event("input"));return true;')
 assert js('return document.querySelectorAll("#reviewList .review-entry").length')==1
 js('document.getElementById("reviewSearch").value="";document.getElementById("reviewSearch").dispatchEvent(new Event("input"));const note=Array.from(document.querySelectorAll("#reviewList .review-entry")).find(row=>row.querySelector("h4").textContent==="Nota de publicação");Array.from(note.querySelectorAll("button")).find(b=>b.textContent==="Excluir").click();return true;');accept_alert()
 wait('!document.querySelector("#richEditor [data-footnote]") && !document.getElementById("workspace").inert')
 js('document.getElementById("undoBtn").click();return true;')
 wait('document.querySelector("#richEditor [data-footnote]") && document.querySelectorAll("#reviewList .review-entry").length===2')
 screenshot('12-anchored-review.png')
 screenshot('10-visual-editor.png')
 js('document.getElementById("snapshotBtn").click();return true;');accept_alert('Versão visual');wait('document.getElementById("saveStatus").textContent.includes("Versão guardada") && !document.getElementById("workspace").inert')
 js('document.getElementById("disableRichBtn").click();return true;');accept_alert();wait('document.getElementById("richEditor").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("versionsBtn").click();return true;');wait('document.getElementById("versionsDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#versionsList .rich-preview strong").length')>0
 js('document.querySelector("#versionsList button").click();return true;');accept_alert()
 wait('!document.getElementById("versionsDialog").open && !document.getElementById("richEditor").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#richEditor ul li").length')==2
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && document.querySelector("#publishPreview .rich-preview strong") && !document.getElementById("workspace").inert')
 wait('document.getElementById("publishPreview").textContent.includes("Fonte editorial pública")')
 assert not js('return document.getElementById("publishPreview").textContent.includes("COMENTÁRIO PRIVADO")')
 assert js('return document.querySelectorAll("#publishPreview [data-comment]").length')==0
 js('window.originalPrint=window.print;window.print=()=>{window.printedContent=document.getElementById("publishPreview").textContent;};document.getElementById("printBtn").click();return true;')
 wait('window.printedContent && !document.getElementById("workspace").inert')
 assert 'Fonte editorial pública' in js('return window.printedContent')
 assert 'COMENTÁRIO PRIVADO' not in js('return window.printedContent')
 js('window.print=window.originalPrint;return true;')
 screenshot('11-visual-publication.png')
 for fmt in ['docx','epub']:
  before_files=set((artifacts/'downloads').glob('*.'+fmt))
  js('document.getElementById("exportFormat").value='+json.dumps(fmt)+';document.getElementById("exportBtn").click();return true;')
  for _ in range(100):
   new_files=set((artifacts/'downloads').glob('*.'+fmt))-before_files
   if new_files and not list((artifacts/'downloads').glob('*.part')):break
   time.sleep(.1)
  assert new_files,fmt+' semantic download missing'
  from zipfile import ZipFile
  with ZipFile(next(iter(new_files))) as archive:
   content_file='word/document.xml' if fmt=='docx' else 'EPUB/book.xhtml'
   markup=archive.read(content_file).decode()
   assert ('<w:b/>' if fmt=='docx' else '<strong>') in markup
   assert 'voz própria' in markup
   assert 'Fonte editorial pública' in markup
   assert 'COMENTÁRIO PRIVADO' not in markup
  wait('!document.getElementById("workspace").inert')
 # Research files use the real file input, explicit preview and confirmed import.
 asset_originals={}
 for kind in ['text','png','jpeg','pdf']:
  js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
  js('document.getElementById("assetsModeBtn").click();return true;');wait('!document.getElementById("assetsPanel").classList.contains("hidden") && !document.getElementById("workspace").inert')
  if kind=='text':
   name='Fonte de pesquisa.md';encoded=base64.b64encode('# Fonte local\r\nMarés & vozes 🌱. <img src=https://evil.invalid/test> literal.'.encode()).decode()
  elif kind in ['png','jpeg']:
   name='Mapa de pesquisa.'+('png' if kind=='png' else 'jpg')
   encoded=js('const c=document.createElement("canvas");c.width=96;c.height=64;const x=c.getContext("2d");x.fillStyle="#527957";x.fillRect(0,0,96,64);x.fillStyle="#fff";x.fillText("Mapa local",10,30);return c.toDataURL('+json.dumps('image/'+kind)+').split(",")[1];')
  else:
   name='Documento local.pdf'
   objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>']
   pdf=b'%PDF-1.4\n';offsets=[]
   for i,obj in enumerate(objects,1):offsets.append(len(pdf));pdf+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
   start=len(pdf);pdf+=b'xref\n0 4\n0000000000 65535 f \n'+b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets)+b'trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n'+str(start).encode()+b'\n%%EOF\n';encoded=base64.b64encode(pdf).decode()
  asset_originals[name]=encoded
  js('const raw=atob('+json.dumps(encoded)+');const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(raw,c=>c.charCodeAt(0))],'+json.dumps(name)+'));document.getElementById("attachmentFile").files=transfer.files;document.getElementById("attachmentFile").dispatchEvent(new Event("change",{bubbles:true}));return true;')
  wait('document.getElementById("attachmentDialog").open && !document.getElementById("workspace").inert')
  assert name in js('return document.getElementById("attachmentPreview").textContent')
  if kind=='text':
   assert js('return document.querySelectorAll("#attachmentPreview img").length')==0
   assert '<img src=https://' in js('return document.getElementById("attachmentPreview").textContent')
  if kind=='text':
   js('document.querySelector("#attachmentDialog [data-close]").click();return true;');wait('!document.getElementById("attachmentDialog").open')
   assert js('return document.querySelectorAll("#attachmentCards .scene-card").length')==0
   js('const raw=atob('+json.dumps(encoded)+');const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(raw,c=>c.charCodeAt(0))],'+json.dumps(name)+'));document.getElementById("attachmentFile").files=transfer.files;document.getElementById("attachmentFile").dispatchEvent(new Event("change",{bubbles:true}));return true;')
   wait('document.getElementById("attachmentDialog").open && !document.getElementById("workspace").inert')
  js('document.getElementById("confirmAttachmentBtn").click();return true;')
  wait('!document.getElementById("attachmentDialog").open && !document.getElementById("attachmentView").classList.contains("hidden") && !document.getElementById("workspace").inert')
  assert js('return document.getElementById("documentTitle").value')==name
  assert js('return document.getElementById("include").disabled')
  if kind in ['png','jpeg']:wait('document.querySelector("#attachmentView img").complete && document.querySelector("#attachmentView img").naturalWidth===96')
  if kind=='pdf':assert js('return document.querySelectorAll("#attachmentView iframe,#attachmentView object,#attachmentView embed").length')==0
  before_files=set((artifacts/'downloads').glob('*'))
  js('document.querySelector("#attachmentView button").click();return true;')
  for _ in range(100):
   new_files=set((artifacts/'downloads').glob('*'))-before_files
   if new_files and not list((artifacts/'downloads').glob('*.part')):break
   time.sleep(.1)
  assert new_files,'research download missing'
  assert next(iter(new_files)).read_bytes()==base64.b64decode(encoded)
  if kind=='png':screenshot('13-research-image.png')
 # Lixeira retains the bytes; restoring the research node makes the file available again.
 js('document.getElementById("deleteBtn").click();return true;');accept_alert();wait('!document.getElementById("workspace").inert')
 js('document.getElementById("trashBtn").click();return true;');wait('document.getElementById("trashDialog").open && !document.getElementById("workspace").inert')
 js('const row=Array.from(document.querySelectorAll("#trashList>div")).find(r=>r.textContent.includes("Documento local.pdf"));row.querySelector("button").click();return true;')
 wait('!document.getElementById("trashDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("trashDialog").close();document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("assetsModeBtn").click();return true;');wait('document.querySelectorAll("#attachmentCards .scene-card").length===4 && !document.getElementById("workspace").inert')
 js('document.getElementById("attachmentSearch").value="Fonte";document.getElementById("attachmentSearch").dispatchEvent(new Event("input"));return true;')
 assert js('return document.querySelectorAll("#attachmentCards .scene-card").length')==1
 js('document.getElementById("attachmentSearch").value="";document.getElementById("attachmentSearch").dispatchEvent(new Event("input"));document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert 'Documento local.pdf' not in js('return document.getElementById("publishPreview").textContent')
 # Actual backup download and restoration preserve semantic data with remapped IDs.
 previous_backups=set((artifacts/'downloads').glob('*.json'))
 js('document.getElementById("backupBtn").click();return true;')
 for _ in range(100):
  new_backups=set((artifacts/'downloads').glob('*.json'))-previous_backups
  if new_backups and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert new_backups
 semantic_backup=json.loads(next(iter(new_backups)).read_text());assert semantic_backup['project']['rich_documents']
 assert semantic_backup['project']['schema_version']==3
 assert len(semantic_backup['project']['attachments'])==4
 for asset in semantic_backup['project']['attachments']:
  assert asset['data_base64']==asset_originals[asset['name']]
  assert asset['sha256']==hashlib.sha256(base64.b64decode(asset['data_base64'])).hexdigest()
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(json.dumps(semantic_backup,ensure_ascii=False))+'],"visual-backup.json",{type:"application/json"}));document.getElementById("backupFile").files=transfer.files;document.getElementById("backupFile").dispatchEvent(new Event("change",{bubbles:true}));return true;');accept_alert()
 wait('!document.getElementById("workspace").inert && document.getElementById("projectName").textContent.includes("(restaurado) (restaurado)")')
 js('Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.textContent.includes("Cena visual")).click();return true;')
 wait('document.getElementById("documentTitle").value==="Cena visual" && document.querySelector("#richEditor strong") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#richEditor ul li").length')==2
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===3')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("(restaurado) (restaurado)")).click();return true;');wait('document.getElementById("projectName").textContent.includes("(restaurado) (restaurado)") && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.textContent.includes("Cena visual")).click();return true;');wait('document.querySelector("#richEditor strong") && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("richEditor").textContent').find('Texto colado seguro')>=0
 assert js('return document.querySelectorAll("#reviewList .review-entry").length')==2
 assert js('return document.getElementById("reviewList").textContent').find('PRIVADO revisado')>=0
 # Restored files are readable after ID remapping and a full browser reload.
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("assetsModeBtn").click();return true;');wait('document.querySelectorAll("#attachmentCards .scene-card").length===4 && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll("#attachmentCards .scene-card")).find(c=>c.textContent.includes("Mapa de pesquisa.png")).querySelector("button").click();return true;');wait('document.querySelector("#attachmentView img")?.naturalWidth===96 && !document.getElementById("workspace").inert')
 # Project actions are outside the cover button, with no accidental opening.
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.querySelector(".book-tile .action-menu summary").click();return true;')
 js('Array.from(document.querySelectorAll(".book-tile .action-menu[open] button")).find(b=>b.textContent==="Editar dados / renomear").click();return true;');wait('document.getElementById("settingsDialog").open && !document.getElementById("workspace").inert')
 assert not js('return document.getElementById("library").classList.contains("hidden")')
 js('document.getElementById("settingsName").value="Projeto de ações";document.getElementById("settingsForm").requestSubmit();return true;');wait('!document.getElementById("settingsDialog").open && document.querySelector(".book").textContent.includes("Projeto de ações") && !document.getElementById("workspace").inert')
 def project_action(title,action):
  js('const tile=Array.from(document.querySelectorAll(".book-tile")).find(t=>t.querySelector(".book").textContent.includes('+json.dumps(title)+'));tile.querySelector("summary").click();return true;')
  js('const menu=document.querySelector(".book-tile .action-menu[open]");Array.from(menu.querySelectorAll("button")).find(b=>b.textContent==='+json.dumps(action)+').click();return true;')
 before_backups=set((artifacts/'downloads').glob('*.json'));project_action('Projeto de ações','Baixar backup')
 for _ in range(100):
  added=set((artifacts/'downloads').glob('*.json'))-before_backups
  if added and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert added and json.loads(next(iter(added)).read_text())['format']=='writingroom-json-backup'
 wait('!document.getElementById("workspace").inert');project_action('Projeto de ações','Duplicar');accept_alert('Cópia de ações');wait('document.querySelectorAll(".book").length===4 && !document.getElementById("workspace").inert')
 project_action('Cópia de ações','Arquivar / remover da lista ativa');accept_alert();wait('document.querySelectorAll(".book").length===3 && !document.getElementById("workspace").inert')
 js('document.getElementById("libraryFilter").value="archived";document.getElementById("libraryFilter").dispatchEvent(new Event("change"));return true;');wait('document.querySelectorAll(".book").length===1 && document.querySelector(".book").textContent.includes("Cópia de ações") && !document.getElementById("workspace").inert')
 screenshot('14-library-archived.png');project_action('Cópia de ações','Restaurar à biblioteca');wait('document.querySelectorAll(".book").length===0 && !document.getElementById("workspace").inert')
 js('document.getElementById("libraryFilter").value="active";document.getElementById("libraryFilter").dispatchEvent(new Event("change"));return true;');wait('document.querySelectorAll(".book").length===4 && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Projeto de ações")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 def document_action(title,action):
  js('const item=Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.querySelector("span:last-child").textContent==='+json.dumps(title)+');item.closest(".tree-row").querySelector("summary").click();return true;')
  js('Array.from(document.querySelectorAll("#tree .action-menu[open] button")).find(b=>b.textContent==='+json.dumps(action)+').click();return true;')
 document_action('Cena visual','Duplicar');wait('document.getElementById("documentTitle").value==="Cena visual (cópia)" && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#reviewList .review-entry").length')==2
 document_action('Cena visual (cópia)','Renomear');accept_alert('Cena para organizar');wait('document.getElementById("documentTitle").value==="Cena para organizar" && !document.getElementById("workspace").inert')
 js('document.getElementById("newChapterBtn").click();return true;');accept_alert('Pasta de destino');wait('document.getElementById("documentTitle").value==="Pasta de destino" && !document.getElementById("workspace").inert')
 def native_drag(source_title,target_title,fraction,cancel=False):
  points=js('const items=Array.from(document.querySelectorAll("#tree .tree-item"));const source=items.find(b=>b.querySelector("span:last-child").textContent==='+json.dumps(source_title)+');const target=items.find(b=>b.querySelector("span:last-child").textContent==='+json.dumps(target_title)+');source.scrollIntoView({block:"center"});const a=source.querySelector(".drag-handle").getBoundingClientRect(),b=target.getBoundingClientRect();return {sx:a.x+a.width/2,sy:a.y+a.height/2,tx:b.x+b.width/2,ty:b.y+b.height*'+str(fraction)+'};')
  command('WebDriver:PerformActions',{'actions':[{'type':'pointer','id':'organizer','parameters':{'pointerType':'mouse'},'actions':[{'type':'pointerMove','duration':0,'x':round(points['sx']),'y':round(points['sy'])},{'type':'pointerDown','button':0},{'type':'pointerMove','duration':200,'x':round(points['sx']+10),'y':round(points['sy'])},{'type':'pause','duration':100},{'type':'pointerMove','duration':600,'x':round(points['tx']),'y':round(points['ty'])},{'type':'pause','duration':300}]}]});
  if cancel:command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'cancel-drag','actions':[{'type':'keyDown','value':'\ue00c'},{'type':'keyUp','value':'\ue00c'}]}]})
  command('WebDriver:PerformActions',{'actions':[{'type':'pointer','id':'organizer','parameters':{'pointerType':'mouse'},'actions':[{'type':'pointerMove','duration':100,'x':round(points['tx']),'y':round(points['ty'])},{'type':'pointerUp','button':0}]}]});command('WebDriver:ReleaseActions')
 native_drag('Cena para organizar','Pasta de destino',.5)
 wait('Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.querySelector("span:last-child").textContent==="Cena para organizar").title.includes("Pasta de destino") && !document.getElementById("workspace").inert')
 assert not js('return document.getElementById("undoOrganizationBtn").disabled')
 screenshot('15-organized-manuscript.png');js('document.getElementById("undoOrganizationBtn").click();return true;')
 wait('!Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.querySelector("span:last-child").textContent==="Cena para organizar").title.includes("Pasta de destino") && document.getElementById("undoOrganizationBtn").disabled && !document.getElementById("workspace").inert')
 native_drag('Cena para organizar','Pasta de destino',.95)
 wait('(()=>{const titles=Array.from(document.querySelectorAll("#tree .tree-item span:last-child")).map(s=>s.textContent);return titles.indexOf("Pasta de destino")<titles.indexOf("Cena para organizar");})() && !document.getElementById("workspace").inert')
 js('document.getElementById("undoOrganizationBtn").click();return true;');wait('document.getElementById("undoOrganizationBtn").disabled && !document.getElementById("workspace").inert')
 before_cancel=js('return Array.from(document.querySelectorAll("#tree [data-node-id]")).map(n=>n.getAttribute("data-node-id"))')
 native_drag('Cena para organizar','Pasta de destino',.5,True)
 assert js('return Array.from(document.querySelectorAll("#tree [data-node-id]")).map(n=>n.getAttribute("data-node-id"))')==before_cancel
 assert js('return document.querySelectorAll(".pointer-ghost").length')==0
 document_action('Cena para organizar','Mover à lixeira');accept_alert();wait('!document.getElementById("workspace").inert && !document.getElementById("tree").textContent.includes("Cena para organizar")')
 js('document.getElementById("trashBtn").click();return true;');wait('document.getElementById("trashDialog").open && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll("#trashList>div")).find(r=>r.textContent.includes("Cena para organizar")).querySelector("button").click();return true;');wait('!document.getElementById("trashDialog").open && !document.getElementById("workspace").inert')
 js('document.querySelector("#tree .folder-toggle").click();return true;')
 count_collapsed=js('return document.querySelectorAll("#tree .tree-item").length')
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===4')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Projeto de ações")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#tree .tree-item").length')==count_collapsed
 js('document.querySelector("#tree .folder-toggle").click();document.getElementById("storyTab").click();return true;');wait('!document.getElementById("storyView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#cards .action-menu").length')>0
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#entityCards .action-menu").length')>0
 # Private author profile never travels with the project; explicit name selection only.
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("authorProfileBtn").click();return true;');wait('document.getElementById("profileDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("profileRealName").value="Pessoa de Teste";document.getElementById("profilePseudonym").value="Voz de Teste";document.getElementById("profileUsePseudonym").checked=true;document.getElementById("profileAddress").value="PRIVATE-PROFILE-CONTACT";document.getElementById("profilePhone").value="PRIVATE-PROFILE-PHONE";document.getElementById("profileEmail").value="private@example.invalid";document.getElementById("profileForm").requestSubmit();return true;')
 wait('document.getElementById("profileStatus").textContent.includes("Perfil salvo") && !document.getElementById("workspace").inert')
 before_profiles=set((artifacts/'downloads').glob('*.json'));js('document.getElementById("downloadProfileBtn").click();return true;')
 for _ in range(100):
  added=set((artifacts/'downloads').glob('*.json'))-before_profiles
  if added and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert added;profile_backup=json.loads(next(iter(added)).read_text());assert profile_backup['format']=='writingroom-private-profile';assert profile_backup['profile']['address']=='PRIVATE-PROFILE-CONTACT'
 wait('!document.getElementById("workspace").inert');js('document.getElementById("clearProfileBtn").click();return true;');accept_alert();wait('document.getElementById("profileRealName").value==="" && !document.getElementById("workspace").inert')
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(json.dumps(profile_backup,ensure_ascii=False))+'],"profile.json",{type:"application/json"}));document.getElementById("profileFile").files=transfer.files;document.getElementById("profileFile").dispatchEvent(new Event("change"));return true;');accept_alert();wait('document.getElementById("profilePseudonym").value==="Voz de Teste" && !document.getElementById("workspace").inert')
 screenshot('16-private-author-profile.png');js('document.getElementById("profileDialog").close();document.getElementById("newProjectBtn").click();return true;');wait('document.getElementById("newProjectDialog").open')
 assert js('return document.getElementById("projectTemplate").options.length')==20
 assert js('return document.getElementById("newProjectAuthor").value')==''
 js('document.getElementById("newProjectName").value="Roteiro de época";document.getElementById("projectTemplate").value="screenplay";document.getElementById("projectPreset").value="historical";document.getElementById("useProfileForNewBtn").click();return true;');wait('document.getElementById("newProjectAuthor").value==="Voz de Teste" && !document.getElementById("workspace").inert')
 screenshot('17-project-catalog.png');js('document.getElementById("newProjectForm").requestSubmit();return true;');wait('document.getElementById("documentTitle").value==="Cena 1" && !document.getElementById("workspace").inert')
 assert 'Cronologia' in js('return document.getElementById("tree").textContent')
 js('document.getElementById("settingsBtn").click();return true;');wait('document.getElementById("settingsDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("settingsAuthor").value')=='Voz de Teste'
 assert 'Roteiro audiovisual' in js('return document.getElementById("settingsProjectType").textContent')
 js('document.getElementById("settingsDialog").close();document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("notebookView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("entitiesModeBtn").click();return true;');wait('!document.getElementById("entitiesPanel").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("newCharacterBtn").click();return true;');wait('document.getElementById("entityDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("entityType").value')=='character'
 js('document.getElementById("entityName").value="Pessoa de referência";document.getElementById("entityForm").requestSubmit();return true;');wait('document.getElementById("documentTitle").value==="Pessoa de referência" && !document.getElementById("workspace").inert')
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert');js('document.getElementById("newLocationBtn").click();return true;');wait('document.getElementById("entityDialog").open && !document.getElementById("workspace").inert');assert js('return document.getElementById("entityType").value')=='location'
 js('document.getElementById("entityDialog").close();document.getElementById("newResearchDraftBtn").click();return true;');accept_alert('Rascunho de apuração');wait('document.getElementById("documentTitle").value==="Rascunho de apuração" && !document.getElementById("workspace").inert');assert not js('return document.getElementById("include").checked')
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert');js('document.getElementById("assetsModeBtn").click();return true;');wait('!document.getElementById("assetsPanel").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('const transfer=new DataTransfer();transfer.items.add(new File(["Registro de época preservado."],"Registro de época.txt"));document.getElementById("attachmentFile").files=transfer.files;document.getElementById("attachmentFile").dispatchEvent(new Event("change"));return true;');wait('document.getElementById("attachmentDialog").open && !document.getElementById("workspace").inert');js('document.getElementById("confirmAttachmentBtn").click();return true;');wait('document.getElementById("documentTitle").value==="Registro de época.txt" && !document.getElementById("workspace").inert')
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert');js('document.getElementById("sourcesModeBtn").click();return true;');wait('!document.getElementById("sourcesPanel").classList.contains("hidden") && !document.getElementById("workspace").inert');js('document.getElementById("newSourceBtn").click();return true;');wait('document.getElementById("sourceDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("sourceTitle").value="Arquivo de 1918";document.getElementById("sourceURL").value="https://example.org/1918";document.getElementById("sourceAuthor").value="Autor da fonte";document.getElementById("sourcePublisher").value="Acervo de teste";document.getElementById("sourceDate").value="1918–1922";document.getElementById("sourceAccessed").value="2026-11-02";document.getElementById("sourceBasis").value="hypothesis";for(const option of document.getElementById("sourceRefs").options)option.selected=["Cena 1","Pessoa de referência","Registro de época.txt · anexo"].includes(option.textContent);document.getElementById("sourceForm").requestSubmit();return true;')
 wait('document.getElementById("documentTitle").value==="Arquivo de 1918" && !document.getElementById("sourceDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("include").disabled')
 assert js('return document.querySelectorAll("#sourceRelationsList button").length')==4
 js('document.getElementById("editor").value="Notas de apuração preservadas.";document.getElementById("editor").dispatchEvent(new Event("input"));document.querySelector("#sourceRelationsList button").click();return true;');wait('document.getElementById("sourceDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("sourceRefs").selectedOptions.length')==3
 js('document.getElementById("sourceTitle").value="Arquivo revisado de 1918";document.getElementById("sourceAuthor").value="Autoria revisada";document.getElementById("sourceForm").requestSubmit();return true;');wait('document.getElementById("documentTitle").value==="Arquivo revisado de 1918" && !document.getElementById("sourceDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("editor").value')=='Notas de apuração preservadas.'
 js('Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.querySelector("span:last-child").textContent==="Cena 1").click();return true;');wait('document.getElementById("documentTitle").value==="Cena 1" && !document.getElementById("workspace").inert');assert 'Arquivo revisado de 1918' in js('return document.getElementById("sourceRelationsList").textContent')
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert');js('document.getElementById("sourcesModeBtn").click();return true;');wait('document.querySelectorAll("#sourceCards .scene-card").length===1 && !document.getElementById("workspace").inert')
 js('document.getElementById("sourceSearch").value="Autoria revisada";document.getElementById("sourceSearch").dispatchEvent(new Event("input"));return true;');assert js('return document.querySelectorAll("#sourceCards .scene-card").length')==1
 assert js('return document.querySelector("#sourceCards a").getAttribute("rel")')=='noopener noreferrer'
 screenshot('18-linked-research.png')
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert');assert 'Arquivo revisado de 1918' not in js('return document.getElementById("publishPreview").textContent')
 before_books=set((artifacts/'downloads').glob('*.json'));js('document.getElementById("backupBtn").click();return true;')
 for _ in range(100):
  added=set((artifacts/'downloads').glob('*.json'))-before_books
  if added and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert added;source_backup=json.loads(next(iter(added)).read_text());assert source_backup['project']['schema_version']==4;assert source_backup['project']['settings']['project_type']=='screenplay';assert 'PRIVATE-PROFILE' not in json.dumps(source_backup)
 source_node=next(n for n in source_backup['project']['nodes'] if 'source' in n);assert len(source_node['source']['refs'])==3
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(json.dumps(source_backup,ensure_ascii=False))+'],"source-backup.json",{type:"application/json"}));document.getElementById("backupFile").files=transfer.files;document.getElementById("backupFile").dispatchEvent(new Event("change"));return true;');accept_alert();wait('document.getElementById("projectName").textContent.includes("Roteiro de época (restaurado)") && !document.getElementById("workspace").inert')
 js('document.getElementById("notebookTab").click();return true;');wait('!document.getElementById("workspace").inert');js('document.getElementById("sourcesModeBtn").click();return true;');wait('document.querySelectorAll("#sourceCards .scene-card").length===1 && !document.getElementById("workspace").inert')
 js('document.querySelector("#sourceCards .scene-card>button").click();return true;');wait('document.getElementById("sourceDialog").open && !document.getElementById("workspace").inert')
 restored_refs=js('return Array.from(document.getElementById("sourceRefs").selectedOptions).map(o=>o.value)');assert len(restored_refs)==3 and not set(restored_refs).intersection(source_node['source']['refs'])
 js('document.getElementById("sourceDialog").close();return true;')
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===6')
 js('document.getElementById("authorProfileBtn").click();return true;');wait('document.getElementById("profileDialog").open && !document.getElementById("workspace").inert');assert js('return document.getElementById("profilePseudonym").value')=='Voz de Teste';js('document.getElementById("profileDialog").close();Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Roteiro de época (restaurado)")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 # Server-managed copies are distinct from browser downloads and preserve committed data.
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("backupCenterProjectBtn").click();return true;');wait('document.getElementById("backupCenterDialog").open && !document.getElementById("workspace").inert')
 assert not js('return document.getElementById("backupAutoEnabled").checked')
 assert js('return document.getElementById("backupProject").value')
 js('document.getElementById("backupCreateBtn").click();return true;');wait('document.querySelectorAll("#backupHistory .backup-history-row").length===1 && document.getElementById("backupCenterStatus").textContent.includes("criada e verificada") && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll("#backupHistory button")).find(b=>b.textContent==="Verificar agora").click();return true;');wait('document.getElementById("backupHistory").textContent.includes("Integridade conferida agora") && !document.getElementById("workspace").inert')
 before_managed=set((artifacts/'downloads').glob('*.json'));js('Array.from(document.querySelectorAll("#backupHistory button")).find(b=>b.textContent==="Baixar JSON").click();return true;')
 for _ in range(100):
  added=set((artifacts/'downloads').glob('*.json'))-before_managed
  if added and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert added;managed_bundle=json.loads(next(iter(added)).read_text());assert managed_bundle['project']['schema_version']==4 and 'PRIVATE-PROFILE' not in json.dumps(managed_bundle)
 assert len(next(n for n in managed_bundle['project']['nodes'] if 'source' in n)['source']['refs'])==3
 wait('!document.getElementById("workspace").inert')
 js('document.getElementById("backupAutoEnabled").checked=true;document.getElementById("backupInterval").value="15";document.getElementById("backupRetention").value="2";document.getElementById("backupSettingsForm").requestSubmit();return true;');wait('document.getElementById("backupCenterStatus").textContent.includes("Configuração salva") && !document.getElementById("workspace").inert')
 assert not js('return document.getElementById("backupRunNowBtn").disabled')
 js('document.getElementById("backupRunNowBtn").click();return true;');wait('document.getElementById("backupCenterStatus").textContent.includes("0 falhas") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#backupHistory .backup-history-row").length')==1
 assert 'Sem alterações' in js('return document.getElementById("backupStateSummary").textContent')
 selected_backup_project=js('return document.getElementById("backupProject").value')
 js('document.getElementById("backupProject").value="";document.getElementById("backupProject").dispatchEvent(new Event("change"));return true;');wait('document.querySelectorAll("#backupHistory .backup-history-row").length>=6 && !document.getElementById("workspace").inert')
 js('document.getElementById("backupProject").value='+json.dumps(selected_backup_project)+';document.getElementById("backupProject").dispatchEvent(new Event("change"));return true;');wait('document.querySelectorAll("#backupHistory .backup-history-row").length===1 && !document.getElementById("workspace").inert')

 js('document.getElementById("backupCenterDialog").close();Array.from(document.querySelectorAll("#tree .tree-item")).find(b=>b.querySelector("span:last-child").textContent==="Cena 1").click();return true;');wait('document.getElementById("documentTitle").value==="Cena 1" && !document.getElementById("workspace").inert')
 js('document.getElementById("editor").value="Cena com mudança após cópia.";document.getElementById("editor").dispatchEvent(new Event("input"));document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("backupCenterProjectBtn").click();return true;');wait('document.getElementById("backupCenterDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("backupRunNowBtn").click();return true;');wait('document.querySelectorAll("#backupHistory .backup-history-row").length===2 && document.getElementById("backupCenterStatus").textContent.includes("0 falhas") && !document.getElementById("workspace").inert')
 screenshot('19-local-backup-center.png')
 js('document.getElementById("backupAutoEnabled").checked=false;document.getElementById("backupSettingsForm").requestSubmit();return true;');wait('document.getElementById("backupRunNowBtn").disabled && !document.getElementById("workspace").inert')
 js('const manual=Array.from(document.querySelectorAll("#backupHistory .backup-history-row")).find(r=>r.querySelector("p").textContent.startsWith("Manual"));Array.from(manual.querySelectorAll("button")).find(b=>b.textContent==="Restaurar em novo projeto").click();return true;');accept_alert();wait('!document.getElementById("backupCenterDialog").open && document.getElementById("projectName").textContent.includes("Roteiro de época (restaurado) (restaurado)") && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("documentTitle").value')=='Cena 1'
 assert js('return document.getElementById("editor").value')==''
 assert 'Arquivo revisado de 1918' in js('return document.getElementById("sourceRelationsList").textContent')
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===7')
 js('document.getElementById("backupCenterLibraryBtn").click();return true;');wait('document.getElementById("backupCenterDialog").open && !document.getElementById("workspace").inert')
 assert not js('return document.getElementById("backupAutoEnabled").checked')
 assert js('return document.getElementById("backupRetention").value')=='2'
 assert js('return document.getElementById("backupInterval").value')=='15'
 assert js('return document.querySelectorAll("#backupHistory .backup-history-row").length')>=2
 # Corruption and an unavailable destination must be visible without creating/overwriting a project.
 with urllib.request.urlopen(url+'/api/backup-center?project_id='+managed_bundle['project']['id']) as response:center_state=json.load(response)
 manual=next(item for item in center_state['history'] if item.get('kind')=='manual');target=next(d for d in center_state['destinations'] if d['id']==manual['destination']);target_root=Path(target['root']);assert target_root.resolve().is_relative_to(artifacts.resolve())
 generation=target_root/manual['project_id']/manual['id'];(generation/'backup.json').write_text('corrompido para teste')
 js('document.getElementById("backupProject").value='+json.dumps(manual['project_id'])+';document.getElementById("backupProject").dispatchEvent(new Event("change"));return true;');wait('document.querySelectorAll("#backupHistory .backup-history-row").length===2 && !document.getElementById("workspace").inert')
 js('const row=Array.from(document.querySelectorAll("#backupHistory .backup-history-row")).find(r=>r.querySelector("p").textContent.startsWith("Manual"));Array.from(row.querySelectorAll("button")).find(b=>b.textContent==="Verificar agora").click();return true;');accept_alert();wait('document.getElementById("backupHistory").textContent.includes("Falha na verificação") && !document.getElementById("workspace").inert')
 js('const row=Array.from(document.querySelectorAll("#backupHistory .backup-history-row")).find(r=>r.querySelector("p").textContent.startsWith("Manual"));Array.from(row.querySelectorAll("button")).find(b=>b.textContent==="Restaurar em novo projeto").click();return true;');accept_alert();accept_alert();wait('!document.getElementById("workspace").inert')
 with urllib.request.urlopen(url+'/api/projects') as response:assert len(json.load(response))==7
 moved_root=target_root.with_name('managed-saved-for-test');target_root.rename(moved_root);target_root.write_text('destino bloqueado')
 try:
  js('document.getElementById("backupCreateBtn").click();return true;');accept_alert();wait('document.getElementById("backupCenterStatus").textContent.includes("não confirmada") && !document.getElementById("workspace").inert')
 finally:
  target_root.unlink();moved_root.rename(target_root)
 js('document.getElementById("backupCenterDialog").close();Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Roteiro de época (restaurado) (restaurado)")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 # Themes apply to the whole interface, while preview/cancel leaves saved preference untouched.
 js('document.getElementById("themeBtn").click();return true;');wait('document.getElementById("appearanceDialog").open')
 assert js('return document.querySelectorAll("input[name=appearance-theme]").length')==20
 saved_appearance=js('return localStorage.getItem("writingroom.appearance")')
 for theme in ['win10-light','win10-dark','win11-light','win11-dark','office365-light','office365-dark','office2010-light','retro','gnome50-light','gnome50-dark','macos-light','macos-dark','plasma6-light','plasma6-dark','wordstar4','dos-colors','playful']:
  js('document.querySelector("input[name=appearance-theme][value='+theme+']").click();return true;')
  assert js('return document.body.getAttribute("data-appearance")')==theme
  assert js('return localStorage.getItem("writingroom.appearance")')==saved_appearance
 screenshot('20-theme-gallery.png')
 js('document.getElementById("appearanceCancelBtn").click();return true;');wait('!document.getElementById("appearanceDialog").open')
 assert js('return document.body.getAttribute("data-appearance")')=='classic-light'
 js('document.getElementById("themeBtn").click();return true;');wait('document.getElementById("appearanceDialog").open')
 js('document.querySelector("input[name=appearance-theme][value=wordstar4]").click();document.getElementById("appearanceApplyBtn").click();return true;');wait('!document.getElementById("appearanceDialog").open')
 assert js('return getComputedStyle(document.body).getPropertyValue("--bg").trim()')=='#000080'
 assert 'Mono' in js('return getComputedStyle(document.getElementById("editor")).fontFamily')
 time.sleep(.3)
 wait('getComputedStyle(document.getElementById("themeBtn")).backgroundColor === "rgb(0, 0, 102)"')
 screenshot('21-wordstar.png')
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===7')
 assert js('return document.body.getAttribute("data-appearance")')=='wordstar4'
 js('document.getElementById("themeBtn").click();return true;');wait('document.getElementById("appearanceDialog").open')
 js('document.querySelector("input[name=appearance-theme][value=office365-light]").click();return true;')
 command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'theme-escape','actions':[{'type':'keyDown','value':'\ue00c'},{'type':'keyUp','value':'\ue00c'}]}]});command('WebDriver:ReleaseActions');wait('!document.getElementById("appearanceDialog").open')
 assert js('return document.body.getAttribute("data-appearance")')=='wordstar4'
 js('document.getElementById("themeBtn").click();return true;');wait('document.getElementById("appearanceDialog").open')
 js('document.querySelector("input[name=appearance-theme][value=system]").click();document.getElementById("appearanceApplyBtn").click();return true;');wait('!document.getElementById("appearanceDialog").open')
 assert js('return document.body.classList.contains("dark")===window.matchMedia("(prefers-color-scheme: dark)").matches')
 assert json.loads(js('return localStorage.getItem("writingroom.appearance")'))['theme']=='system'
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Roteiro de época (restaurado) (restaurado)")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("settingsBtn").click();return true;');wait('document.getElementById("settingsDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("appearanceSettingsBtn").click();return true;');wait('document.getElementById("appearanceDialog").open');js('document.getElementById("appearanceCancelBtn").click();document.getElementById("settingsDialog").close();return true;')
 # Translation templates, source preservation, protected editor and per-project glossary.
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("newProjectBtn").click();return true;');wait('document.getElementById("newProjectDialog").open')
 js('document.getElementById("newProjectName").value="Livro traduzido";document.getElementById("projectTemplate").value="translation-book";document.getElementById("newProjectForm").requestSubmit();return true;');wait('!document.getElementById("translationView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#translationCards .scene-card").length')==0
 js('document.getElementById("newTranslationBtn").click();return true;');wait('document.getElementById("translationDialog").open')
 original='The house was built in 1920. PRIVATE ORIGINAL.'
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(original)+'],"Chapter.txt",{type:"text/plain"}));document.getElementById("translationFile").files=transfer.files;document.getElementById("translationFile").dispatchEvent(new Event("change"));return true;');wait('document.getElementById("translationOriginal").value.includes("1920")')
 assert js('return document.getElementById("translationTitle").value')=='Chapter'
 assert js('return document.querySelectorAll("#translationCards .scene-card").length')==0
 js('document.getElementById("translationForm").requestSubmit();return true;');wait('!document.getElementById("translationDialog").open && document.querySelectorAll("#translationCards .scene-card").length===1 && !document.getElementById("workspace").inert')
 js('document.querySelector("#translationCards .translation-actions>button").click();return true;');wait('!document.getElementById("writeView").classList.contains("hidden") && !document.getElementById("referencePanel").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("referenceText").textContent')==original
 assert js('return document.getElementById("editor").lang')=='pt-BR'
 translated='A casa foi construída em 1920. TRADUÇÃO FINAL.'
 js('document.getElementById("editor").value='+json.dumps(translated)+';document.getElementById("editor").dispatchEvent(new Event("input"));document.getElementById("status").value="done";document.getElementById("status").dispatchEvent(new Event("change"));return true;');wait('document.getElementById("saveStatus").textContent.includes("Salvo") && !document.getElementById("workspace").inert')
 screenshot('22-translation-editor.png')
 js('document.getElementById("referenceBtn").click();return true;');assert js('return document.getElementById("referencePanel").classList.contains("hidden") && !document.getElementById("writingLayout").classList.contains("translating")')
 js('document.getElementById("referenceBtn").click();return true;');assert js('return !document.getElementById("referencePanel").classList.contains("hidden")')
 js('document.getElementById("languageToolsBtn").click();return true;');wait('document.getElementById("languageDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("languageQuery").value="house";document.getElementById("languageQuery").dispatchEvent(new Event("input"));return true;')
 assert js('return document.querySelectorAll("#languageLinks a").length')==4
 assert js('return Array.from(document.querySelectorAll("#languageLinks a")).every(a=>a.target==="_blank"&&a.rel.includes("noreferrer"))')
 assert 'house' in js('return document.querySelector("#languageLinks a").href')
 assert 'TRADUÇÃO FINAL' in js('return document.getElementById("translationMemoryResults").textContent')
 js('document.getElementById("newGlossaryBtn").click();return true;');wait('document.getElementById("glossaryDialog").open')
 js('document.getElementById("glossaryDefinition").value="Habitação familiar";document.getElementById("glossarySynonyms").value="home, dwelling";document.getElementById("glossaryEquivalents").value="casa; evitar residência neste contexto";document.getElementById("glossaryContext").value="Tom coloquial";document.getElementById("glossaryProvenance").value="Decisão local de teste";document.getElementById("glossaryForm").requestSubmit();return true;');wait('!document.getElementById("glossaryDialog").open && document.getElementById("glossaryResults").textContent.includes("Habitação familiar") && !document.getElementById("workspace").inert')
 screenshot('23-language-tools.png')
 js('document.getElementById("exportGlossaryBtn").click();return true;');wait('!document.getElementById("workspace").inert')
 js('document.querySelector("#languageDialog [data-close]").click();document.getElementById("translationTab").click();return true;');wait('!document.getElementById("translationView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert '1 concluídos' in js('return document.getElementById("translationProgress").textContent')
 assert original in js('return document.getElementById("translationCards").textContent')
 js('document.getElementById("bilingualExportBtn").click();return true;');wait('!document.getElementById("workspace").inert')
 screenshot('24-translation-dashboard.png')
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("publishView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 published=js('return document.getElementById("publishPreview").textContent');assert translated in published and original not in published and 'Habitação familiar' not in published
 before_translation=set((artifacts/'downloads').glob('*.json'));js('document.getElementById("backupBtn").click();return true;')
 for _ in range(100):
  added=set((artifacts/'downloads').glob('*.json'))-before_translation
  if added and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert added;translation_backup=json.loads(next(iter(added)).read_text());old_source=next(n for n in translation_backup['project']['nodes'] if 'translation:source' in n.get('keywords',[]))
 assert translation_backup['project']['documents'][old_source['id']]==original
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('const transfer=new DataTransfer();transfer.items.add(new File(['+json.dumps(json.dumps(translation_backup,ensure_ascii=False))+'],"translation-backup.json",{type:"application/json"}));document.getElementById("backupFile").files=transfer.files;document.getElementById("backupFile").dispatchEvent(new Event("change"));return true;');accept_alert();wait('document.getElementById("projectName").textContent.includes("Livro traduzido (restaurado)") && !document.getElementById("translationView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.querySelector("#translationCards .translation-actions>button").click();return true;');wait('!document.getElementById("workspace").inert && !document.getElementById("referencePanel").classList.contains("hidden")')
 assert js('return document.getElementById("referenceText").textContent')==original
 assert js('return document.getElementById("editor").value')==translated
 assert js('return document.getElementById("referenceSelect").value')!=old_source['id']
 js('document.getElementById("languageToolsBtn").click();return true;');wait('document.getElementById("languageDialog").open && !document.getElementById("workspace").inert')
 assert 'Habitação familiar' in js('return document.getElementById("glossaryResults").textContent')
 js('document.querySelector("#languageDialog [data-close]").click();return true;')
 for _ in range(100):
  bilingual=list((artifacts/'downloads').glob('*revisao-bilingue.md'));glossary=list((artifacts/'downloads').glob('*glossario.md'))
  if bilingual and glossary and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert bilingual and original in bilingual[0].read_text() and translated in bilingual[0].read_text()
 assert glossary and 'Habitação familiar' in glossary[0].read_text()
 # Changing the restored original reopens review, leaving the first project untouched.
 js('document.getElementById("translationTab").click();return true;');wait('!document.getElementById("workspace").inert')
 js('document.querySelectorAll("#translationCards .translation-actions>button")[1].click();return true;');wait('!document.getElementById("workspace").inert && document.getElementById("editor").value.includes("PRIVATE ORIGINAL")')
 js('document.getElementById("editor").value+=" New source sentence.";document.getElementById("editor").dispatchEvent(new Event("input"));document.getElementById("translationTab").click();return true;');wait('!document.getElementById("workspace").inert && !document.getElementById("translationView").classList.contains("hidden")')
 assert '0 concluídos' in js('return document.getElementById("translationProgress").textContent')
 assert 'Revisão' in js('return document.getElementById("translationCards").textContent')
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===9')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Livro traduzido (restaurado)")).click();return true;');wait('!document.getElementById("translationView").classList.contains("hidden") && document.querySelectorAll("#translationCards .scene-card").length===1 && !document.getElementById("workspace").inert')
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Roteiro de época (restaurado) (restaurado)")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("languageToolsBtn").click();return true;');wait('document.getElementById("languageDialog").open && !document.getElementById("workspace").inert')
 assert 'Habitação familiar' not in js('return document.getElementById("glossaryResults").textContent')
 js('document.querySelector("#languageDialog [data-close]").click();document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("Livro traduzido (restaurado)")).click();return true;');wait('!document.getElementById("translationView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.documentElement.scrollWidth<=window.innerWidth')
 screenshot('25-translation-reload.png')

 # Planning layout after the restored translation workflow. Mobile uses its own fresh profile.
 js('document.getElementById("storyTab").click();return true;');wait('!document.getElementById("storyView").classList.contains("hidden")')
 assert js('return document.documentElement.scrollWidth<=window.innerWidth')
 screenshot('05-layout.png')
 print(json.dumps({'ok':True,'checks':['library','create-template','write-and-save','cards','outline','notes-and-goal','reference','manuscript','publish-preview','reload-persistence','import-preview-and-confirm','snapshot-compare-restore','side-by-side-current-version-filter-navigation','split-at-cursor','settings','theme','backup-download','save-conflict-resolution','restore-backup-file','replace-preview-selection-apply','character-sheet','manual-collection-reference','dynamic-collection','scratchpad-capture','docx-epub-download','notebook-reload-persistence','explicit-visual-conversion','native-visual-typing','visual-marks-styles-lists-links','visual-undo-redo','safe-plain-clipboard','visual-scene-switch','semantic-snapshot-restore','semantic-publication-exports','semantic-backup-restore-reload','anchored-comment-create-edit-resolve','anchored-publication-note','private-comments-excluded-from-publication','annotations-snapshot-backup-reload','annotation-search-delete-snapshot-undo','print-waits-for-note-preview','research-text-preview-confirm','research-png-jpeg-preview','research-pdf-download','research-trash-restore-search','research-backup-integrity-restore-reload','research-preview-cancel-without-save','library-edit-and-backup','library-duplicate-archive-restore','document-duplicate-rename-trash-restore','folder-collapse-persistence','native-pointer-drag-into-folder','native-pointer-drag-order','organization-undo','document-actions-across-views','pointer-drag-escape-cancel','private-profile-save-backup-restore','explicit-publication-name','project-catalog-historical-screenplay','direct-character-scenery-draft-shortcuts','linked-source-create-edit-backlinks','research-backup-remap-profile-privacy','managed-local-backup-verify-download','automatic-backup-opt-in-and-policy','backup-unchanged-and-new-edit','backup-center-restore-previous-generation','backup-settings-persist-after-reload','backup-history-project-filter','backup-corruption-and-destination-failure','theme-gallery-all-families','theme-preview-cancel-escape','theme-apply-reload','theme-system-preference','theme-settings-entry','translation-create-template','translation-file-preview-confirm','translation-side-by-side-save','translation-state-progress','language-tools-local-glossary-links','translation-publication-excludes-original-glossary','translation-bilingual-glossary-exports','translation-backup-restore-reload','translation-local-memory','translation-original-change-reopens-review','language-tools-nontranslation-project-isolation'],'artifacts':str(artifacts)},ensure_ascii=False),flush=True)
except Exception:
 try:
  screenshot('failure.png')
  (artifacts/'failure-state.json').write_text(json.dumps(js('return {status:document.getElementById("saveStatus").textContent,visual:document.getElementById("richEditor").innerHTML,selection:String(window.getSelection())}'),ensure_ascii=False))
  print('Failure artifacts: '+str(artifacts),flush=True)
 except Exception:pass
 raise
finally:
 if connection:
  try:connection.close()
  except OSError:pass
 for process in [browser,server]:
  if process and process.poll() is None:
   process.terminate()
   try:process.wait(timeout=8)
   except subprocess.TimeoutExpired:process.kill();process.wait(timeout=3)
