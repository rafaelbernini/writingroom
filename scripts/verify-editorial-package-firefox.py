"""Encrypted editorial selection, explicit preview/staging, independent import and mobile."""
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
 p=post('projects',{'name':'Origem privada de teste','template':'novel'});pid=p['id'];nid=next(n['id'] for n in p['nodes'] if n['kind']=='text' and n['include_in_compile']);route='projects/'+pid
 post(route+'/text',{'id':nid,'text':'Uma casa azul.','base_hash':p['document_hashes'][nid]});p=get(route);post(route+'/rich-enable',{'id':nid,'base_rich_hash':p['rich_hashes'][nid]});p=get(route)
 rich=p['rich_documents'][nid];rich['doc']['content'][0]['content'][0]['marks']=[{'type':'strong'},{'type':'comment','attrs':{'id':'n-11111111-1111-1111-1111-111111111111','body':'COMENTARIO PRIVADO','resolved':False}},{'type':'footnote','attrs':{'id':'n-22222222-2222-2222-2222-222222222222','body':'Nota compartilhada'}}]
 post(route+'/rich-save',{'id':nid,'rich_document':rich,'base_rich_hash':p['rich_hashes'][nid]})
 command('WebDriver:Navigate',{'url':url});wait('document.querySelectorAll(".book").length===1');js('document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 click('publishTab');click('exportPackageBtn');wait('document.getElementById("packageExportDialog").open')
 assert js('return document.getElementById("packageEncryptBtn").disabled')
 js('document.getElementById("packageTitle").value="Leitura selecionada";document.getElementById("packageSender").value="Autor declarado";document.getElementById("packageRecipient").value="Editor declarado";const box=Array.from(document.querySelectorAll("#packageSceneChoices input")).find(i=>i.value==='+json.dumps(nid)+');box.checked=true;box.dispatchEvent(new Event("change"));return true;')
 click('packagePreviewBtn');assert 'Uma casa azul.' in js('return document.getElementById("packageExportPreview").textContent');assert 'Nota compartilhada' in js('return document.getElementById("packageExportPreview").textContent');assert 'COMENTARIO PRIVADO' not in js('return document.getElementById("packageExportPreview").textContent')
 passphrase='Frase exclusiva longa do teste Firefox'
 # Race after preview is refused, preserving origin.
 post(route+'/metadata',{'id':nid,'patch':{'title':'Cena revisada'}})
 def encrypt():
  js('document.getElementById("packagePassphrase").value='+json.dumps(passphrase)+';document.getElementById("packagePassphraseConfirm").value='+json.dumps(passphrase)+';document.getElementById("packageExportForm").requestSubmit();return true;');wait('!document.getElementById("workspace").inert')
 encrypt();wait('document.getElementById("packageExportStatus").textContent.includes("mudou")');assert js('return document.getElementById("packagePassphrase").value')=='';assert js('return document.getElementById("packageEncryptBtn").disabled')
 click('packagePreviewBtn');screenshot('01-package-selection-preview.png');before=get(route);encrypt();wait('!document.getElementById("packageExportDialog").open')
 for _ in range(100):
  files=list((artifacts/'downloads').glob('*.wroom-package.json'))
  if files and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert files;encrypted_text=files[0].read_text();assert passphrase not in encrypted_text and 'Leitura selecionada' not in encrypted_text and 'Uma casa azul.' not in encrypted_text
 assert get(route)==before
 click('backBtn')
 def upload_open(phrase):
  click('openPackageLibraryBtn');js('const dt=new DataTransfer();dt.items.add(new File(['+json.dumps(encrypted_text)+'],"editorial.wroom-package.json"));document.getElementById("packageFile").files=dt.files;document.getElementById("packageRequireSignature").checked=false;document.getElementById("packageExpectedRecipient").value="Editor declarado";document.getElementById("packageOpenPassphrase").value='+json.dumps(phrase)+';document.getElementById("packageOpenForm").requestSubmit();return true;');wait('!document.getElementById("workspace").inert')
 upload_open('Frase incorreta longa do Firefox');wait('document.getElementById("packageOpenStatus").textContent.includes("incorreta")');assert js('return document.getElementById("packageOpenPassphrase").value')=='';assert len(get('projects'))==1;click('packageCancelOpenBtn')
 upload_open(passphrase);wait('!document.getElementById("packageImportBtn").disabled');assert len(get('projects'))==1;assert 'Nota compartilhada' in js('return document.getElementById("packageOpenPreview").textContent');click('packageCancelOpenBtn');assert len(get('projects'))==1
 upload_open(passphrase);wait('!document.getElementById("packageImportBtn").disabled');command('WebDriver:SetWindowRect',{'width':500,'height':900});wait('window.innerWidth<=500');assert js('return document.getElementById("packageOpenDialog").getBoundingClientRect().width<=window.innerWidth');assert js('return document.documentElement.scrollWidth<=window.innerWidth');screenshot('02-package-open-mobile.png')
 click('packageImportBtn');wait('!document.getElementById("packageOpenDialog").open && document.getElementById("projectName").textContent.includes("pacote") && !document.getElementById("workspace").inert')
 projects=get('projects');assert len(projects)==2;copy=get('projects/'+next(i['id'] for i in projects if i['id']!=pid));assert len(copy['documents'])==1;assert list(copy['documents'].values())==['Uma casa azul.'];assert nid not in copy['documents'];assert not copy['snapshots'];assert 'COMENTARIO PRIVADO' not in json.dumps(copy,ensure_ascii=False);assert 'Nota compartilhada' in json.dumps(copy,ensure_ascii=False);assert get(route)==before
 assert js('return document.getElementById("packageOpenPassphrase").value')==''
 print(json.dumps({'ok':True,'checks':['explicit-selection-preview','private-comment-excluded-public-note-included','stale-preview-refused','encrypted-download-hides-content','export-origin-unchanged','wrong-passphrase-no-write','secrets-cleared','staging-cancel-no-project','mobile-preview','independent-copy-new-ids-rich-content','import-origin-unchanged'],'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
