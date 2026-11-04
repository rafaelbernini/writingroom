"""Local Editor perspective: real dashboard, filters, tracking, backup and mobile."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0];cleanup=source[source.index('\nexcept Exception:\n try:\n  screenshot')+1:]
body='''
 def click(id):
  js('document.getElementById('+json.dumps(id)+').click();return true;');wait('!document.getElementById("workspace").inert')
 def post(route,data):
  req=urllib.request.Request(url+'/api/'+route,data=json.dumps(data).encode(),headers={'content-type':'application/json'})
  with urllib.request.urlopen(req) as response:return json.load(response)
 def get(route):
  with urllib.request.urlopen(url+'/api/'+route) as response:return json.load(response)
 p=post('projects',{'name':'Obra editorial','template':'novel'});pid=p['id'];nid=next(n['id'] for n in p['nodes'] if n['kind']=='text' and n['include_in_compile']);route='projects/'+pid
 post(route+'/text',{'id':nid,'text':'Uma casa azul.','base_hash':p['document_hashes'][nid]});p=get(route)
 post(route+'/review-propose',{'node_id':nid,'start':9,'end':13,'replacement':'verde','author':'Editor declarado','role':'editor','reason':'Cor','base_hash':p['rich_hashes'][nid]})
 # Read-only mode switch, dashboard counts and filters.
 click('perspectiveBtn');js('document.getElementById("perspectiveMode").value="editor";document.getElementById("perspectiveForm").requestSubmit();return true;');wait('!document.getElementById("editorialDashboard").classList.contains("hidden") && document.querySelectorAll("#editorialCards article").length===1 && !document.getElementById("workspace").inert')
 assert '1 propostas pendentes' in js('return document.getElementById("editorialCards").textContent')
 assert get(route)['documents'][nid]=='Uma casa azul.'
 js('document.getElementById("editorialPendingFilter").value="conflicts";document.getElementById("editorialPendingFilter").dispatchEvent(new Event("change"));return true;');assert js('return document.querySelectorAll("#editorialCards article").length')==0
 js('document.getElementById("editorialPendingFilter").value="";document.getElementById("editorialPendingFilter").dispatchEvent(new Event("change"));return true;')
 def cardclick(label):
  js('Array.from(document.querySelectorAll("#editorialCards button")).find(b=>b.textContent==='+json.dumps(label)+').click();return true;');wait('!document.getElementById("workspace").inert')
 cardclick('Acompanhar obra');wait('document.getElementById("trackingDialog").open')
 js('document.getElementById("trackingResponsible").value="Editora declarada";document.getElementById("trackingStage").value="editing";document.getElementById("trackingNotes").value="Rever ritmo";document.getElementById("trackingNext").value="Devolver ao escritor";document.getElementById("trackingForm").requestSubmit();return true;');wait('!document.getElementById("trackingDialog").open && !document.getElementById("workspace").inert')
 assert get(route)['schema_version']==6
 assert 'Editora declarada' in js('return document.getElementById("editorialCards").textContent')
 cardclick('Acompanhar obra');assert js('return document.getElementById("trackingNotes").value')=='Rever ritmo'
 # Concurrent update: preserve unsent fields and reject stale write.
 current=get(route);post(route+'/editorial-tracking',{'base_hash':current['tracking_hash'],'tracking':dict(current['editorial_tracking'],notes='Atualizado em outra aba')})
 js('document.getElementById("trackingNotes").value="Rascunho local";document.getElementById("trackingForm").requestSubmit();return true;');wait('document.getElementById("trackingError").textContent.includes("mudou") && !document.getElementById("workspace").inert');assert js('return document.getElementById("trackingNotes").value')=='Rascunho local'
 js('document.getElementById("trackingDialog").close();return true;');click('editorialRefreshBtn')
 cardclick('Abrir cena');wait('document.getElementById("editor").value==="Uma casa azul."');assert not js('return document.getElementById("writeView").classList.contains("hidden")')
 click('reviewTab');js('Array.from(document.querySelectorAll("#reviewCards button")).find(b=>b.textContent==="Aceitar").click();return true;');wait('document.getElementById("reviewDecisionDialog").open')
 js('document.getElementById("reviewDecisionAuthor").value="Escritor declarado";document.getElementById("reviewDecisionForm").requestSubmit();return true;');wait('!document.getElementById("reviewDecisionDialog").open && !document.getElementById("workspace").inert');assert get(route)['documents'][nid]=='Uma casa verde.'
 click('backBtn');cardclick('Versões / comparar');wait('document.getElementById("versionsDialog").open');assert 'Uma casa azul.' in js('return document.getElementById("versionsList").textContent');click('closeVersionsBtn');click('backBtn')
 # Backup restoration remaps links and preserves tracking.
 backup=get(route+'/backup');restored=post('restore',{'backup':backup});assert restored['editorial_tracking']['notes']=='Atualizado em outra aba';assert restored['reviews'][0]['node_id']!=nid
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll("#editorialCards article").length===2');assert 'Editor' in js('return document.getElementById("perspectiveBtn").textContent')
 command('WebDriver:SetWindowRect',{'width':500,'height':900});wait('window.innerWidth<=500');assert js('return document.documentElement.scrollWidth<=window.innerWidth');screenshot('01-editor-mobile.png')
 cardclick('Acompanhar obra');assert js('return document.getElementById("trackingDialog").getBoundingClientRect().width<=window.innerWidth');js('document.getElementById("trackingDialog").close();return true;')
 click('perspectiveBtn');js('document.getElementById("perspectiveMode").value="writer";document.getElementById("perspectiveForm").requestSubmit();return true;');wait('document.getElementById("editorialDashboard").classList.contains("hidden") && !document.getElementById("workspace").inert');assert js('return document.querySelectorAll(".book").length')==2
 assert get(route)['documents'][nid]=='Uma casa verde.'
 print(json.dumps({'ok':True,'checks':['mode-dashboard-counts','dashboard-filters','tracking-save-reopen','tracking-conflict-preserves-input','scene-navigation','accept-existing-proposal','version-navigation','backup-restore-links-tracking','mode-reload','mobile-dashboard-dialog','return-writer-preserves-text'],'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
