"""Local editorial proposals, decisions, conflict, rich text and schema-5 backup restore."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0];cleanup=source[source.index('\nexcept Exception:\n try:\n  screenshot')+1:]
body=''' js('document.getElementById("newProjectBtn").click();return true;');wait('document.getElementById("newProjectDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("newProjectName").value="Revisão editorial";document.getElementById("projectTemplate").value="novel";document.getElementById("newProjectForm").requestSubmit();return true;');wait('document.getElementById("documentTitle").value==="A primeira cena" && !document.getElementById("workspace").inert')
 js('document.getElementById("editor").value="Uma casa azul.";document.getElementById("editor").dispatchEvent(new Event("input"));document.getElementById("editor").setSelectionRange(9,13);document.getElementById("proposeReviewBtn").click();return true;');wait('document.getElementById("proposalDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("proposalRemoved").textContent')=='azul'
 js('document.getElementById("proposalAuthor").value="Editor local";document.getElementById("proposalRole").value="editor";document.getElementById("proposalReplacement").value="verde";document.getElementById("proposalReplacement").dispatchEvent(new Event("input"));document.getElementById("proposalReason").value="Coerência da cena";return true;')
 screenshot('01-proposal-preview.png')
 js('document.getElementById("proposalForm").requestSubmit();return true;');wait('!document.getElementById("proposalDialog").open && document.querySelectorAll("#reviewCards .scene-card").length===1 && !document.getElementById("workspace").inert')
 with urllib.request.urlopen(url+'/api/projects') as response:pid=json.load(response)[0]['id']
 def current():
  with urllib.request.urlopen(url+'/api/projects/'+pid) as response:return json.load(response)
 p=current();nid=p['reviews'][0]['node_id'];assert p['schema_version']==5 and p['documents'][nid]=='Uma casa azul.'
 def decide(label):
  js('Array.from(document.querySelectorAll("#reviewCards button")).find(b=>b.textContent==='+json.dumps(label)+').click();return true;');wait('document.getElementById("reviewDecisionDialog").open && !document.getElementById("workspace").inert')
  js('document.getElementById("reviewDecisionAuthor").value="Autora local";document.getElementById("reviewDecisionForm").requestSubmit();return true;');wait('!document.getElementById("reviewDecisionDialog").open && !document.getElementById("workspace").inert')
 decide('Aceitar');p=current();assert p['documents'][nid]=='Uma casa verde.' and p['reviews'][0]['status']=='accepted';assert any(s['content']=='Uma casa azul.' for s in p['snapshots'])
 js('document.getElementById("reviewStatusFilter").value="";document.getElementById("reviewStatusFilter").dispatchEvent(new Event("change"));return true;')
 assert 'Autora local' in js('return document.getElementById("reviewCards").textContent')
 def propose(replacement,role='writer'):
  js('document.getElementById("newReviewBtn").click();return true;');wait('document.getElementById("proposalDialog").open && !document.getElementById("workspace").inert')
  js('const t=document.getElementById("proposalSource");t.setSelectionRange(9,t.value.length-1);document.getElementById("proposalSelectionBtn").click();return true;');wait('!document.getElementById("workspace").inert')
  js('document.getElementById("proposalAuthor").value="Revisor declarado";document.getElementById("proposalRole").value='+json.dumps(role)+';document.getElementById("proposalReplacement").value='+json.dumps(replacement)+';document.getElementById("proposalForm").requestSubmit();return true;');wait('!document.getElementById("proposalDialog").open && !document.getElementById("workspace").inert')
 propose('amarela');js('document.getElementById("reviewRoleFilter").value="writer";document.getElementById("reviewRoleFilter").dispatchEvent(new Event("change"));return true;');assert js('return document.querySelectorAll("#reviewCards .scene-card").length')==1
 decide('Rejeitar');assert current()['documents'][nid]=='Uma casa verde.'
 js('document.getElementById("reviewRoleFilter").value="";document.getElementById("reviewRoleFilter").dispatchEvent(new Event("change"));return true;')
 propose('dourada','editor');p=current();req=urllib.request.Request(url+'/api/projects/'+pid+'/text',data=json.dumps({'id':nid,'text':'Uma casa vermelha.','base_hash':p['document_hashes'][nid]}).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(req) as response:assert response.status==200
 js('document.getElementById("reviewStatusFilter").value="pending";document.getElementById("refreshReviewsBtn").click();return true;');wait('document.getElementById("reviewCards").textContent.includes("Conflito") && !document.getElementById("workspace").inert')
 assert js('return Array.from(document.querySelectorAll("#reviewCards button")).find(b=>b.textContent==="Aceitar").disabled')
 decide('Rejeitar');assert current()['documents'][nid]=='Uma casa vermelha.'
 # Activate visual mode and accept an in-block proposal without flattening the document.
 js('document.getElementById("writeTab").click();return true;');wait('!document.getElementById("workspace").inert')
 js('document.getElementById("enableRichBtn").click();return true;');accept_alert();wait('!document.getElementById("richEditor").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("reviewTab").click();return true;');wait('!document.getElementById("workspace").inert')
 propose('roxa','editor');decide('Aceitar');p=current();assert p['documents'][nid]=='Uma casa roxa.' and nid in p['rich_documents']
 js('document.getElementById("reviewStatusFilter").value="";document.getElementById("reviewStatusFilter").dispatchEvent(new Event("change"));return true;');assert js('return document.querySelectorAll("#reviewCards .scene-card").length')==4
 screenshot('02-review-history.png')
 js('document.getElementById("publishTab").click();return true;');wait('!document.getElementById("workspace").inert')
 assert 'Uma casa roxa.' in js('return document.getElementById("publishPreview").textContent')
 assert 'Coerência da cena' not in js('return document.getElementById("publishPreview").textContent')
 js('document.getElementById("backupBtn").click();return true;')
 for _ in range(100):
  backups=list((artifacts/'downloads').glob('*.json'))
  if backups and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert backups;backup=json.loads(backups[0].read_text());assert len(backup['project']['reviews'])==4
 js('document.getElementById("backBtn").click();return true;');wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('const f=new DataTransfer();f.items.add(new File(['+json.dumps(json.dumps(backup,ensure_ascii=False))+'],"reviews.json"));document.getElementById("backupFile").files=f.files;document.getElementById("backupFile").dispatchEvent(new Event("change"));return true;');accept_alert();wait('document.getElementById("projectName").textContent.includes("restaurado") && !document.getElementById("workspace").inert')
 js('document.getElementById("reviewTab").click();return true;');wait('!document.getElementById("reviewView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 assert js('return document.querySelectorAll("#reviewCards .scene-card").length')==4
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===2')
 js('Array.from(document.querySelectorAll(".book")).find(b=>b.textContent.includes("restaurado")).click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("reviewTab").click();return true;');wait('!document.getElementById("workspace").inert')
 assert '4 propostas' in js('return document.getElementById("reviewSummary").textContent')
 command('WebDriver:SetWindowRect',{'width':500,'height':900});wait('window.innerWidth<=500')
 assert js('return document.documentElement.scrollWidth<=window.innerWidth')
 js('document.getElementById("newReviewBtn").click();return true;');wait('document.getElementById("proposalDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("proposalDialog").getBoundingClientRect().width<=window.innerWidth')
 screenshot('03-proposal-mobile.png')
 print(json.dumps({'ok':True,'checks':['proposal-selection-redline-preview','proposal-author-role-save-no-text-change','accept-snapshot-decision-history','reject-role-filter-no-text-change','stale-proposal-block-accept','rich-proposal-preserves-visual','review-publication-excludes-proposals','review-backup-restore-reload','review-mobile-layout'],'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
