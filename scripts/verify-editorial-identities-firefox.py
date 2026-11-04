"""Offline signing identities across isolated local installations; no external delivery."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0].replace('server=browser=None','server=browser=None\nextra_servers=[]');cleanup=source[source.index('\nexcept Exception:\n try:\n  screenshot')+1:].replace('[browser,server]','[browser,server,*extra_servers]')
body='''
 author_url=url
 def get(origin,route):
  with urllib.request.urlopen(origin+'/api/'+route) as response:return json.load(response)
 def post(origin,route,data):
  req=urllib.request.Request(origin+'/api/'+route,data=json.dumps(data).encode(),headers={'content-type':'application/json'})
  with urllib.request.urlopen(req) as response:return json.load(response)
 def click(id):
  js('document.getElementById('+json.dumps(id)+').click();return true;');wait('!document.getElementById("workspace").inert')
 def fill(id,value):js('document.getElementById('+json.dumps(id)+').value='+json.dumps(value)+';return true;')
 def submit(id):
  js('document.getElementById('+json.dumps(id)+').requestSubmit();return true;');wait('!document.getElementById("workspace").inert')
 def upload(id,text,name):js('const dt=new DataTransfer();dt.items.add(new File(['+json.dumps(text)+'],'+json.dumps(name)+'));document.getElementById('+json.dumps(id)+').files=dt.files;document.getElementById('+json.dumps(id)+').dispatchEvent(new Event("change"));return true;')
 def new_server(name):
  other_env=dict(env,PORT='0',WRITINGROOM_HOME=str(artifacts/name),WRITINGROOM_BACKUP_HOME=str(artifacts/(name+'-backups')))
  process=subprocess.Popen(['node','apps/web/server.mjs'],cwd=root,env=other_env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);extra_servers.append(process);line=process.stdout.readline().strip();assert line.startswith('Writingroom Alpha: ');return line.split(': ',1)[1]
 def navigate(origin):
  command('WebDriver:Navigate',{'url':origin});wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 key_phrase='Frase exclusiva da chave Firefox'
 def create(name):
  fill('identityName',name);fill('identityPassphrase',key_phrase);fill('identityPassphraseConfirm',key_phrase);submit('identityCreateForm');wait('document.getElementById("identityStatus").textContent.includes("Chave criada")');assert js('return document.getElementById("identityPassphrase").value')==''
 def card(state):
  i=next(i for i in state['identities'] if i['fingerprint']==state['active_fingerprint']);return {'format':'writingroom-public-key','version':1,'name':i['name'],'public_key':i['public_key'],'fingerprint':i['fingerprint']}
 def trust(c):
  upload('identityCardFile',json.dumps(c),'contato.wroom-public-key.json');click('identityCardPreviewBtn');wait('document.getElementById("identityCardPreview").textContent.includes('+json.dumps(c['fingerprint'])+')');assert js('return document.getElementById("identityConfirmedFingerprint").value')==''
  fill('identityConfirmedFingerprint','0'*64);js('document.getElementById("identityConfirmedFingerprint").dispatchEvent(new Event("input"));return true;');assert js('return document.getElementById("identityTrustBtn").disabled')
  fill('identityConfirmedFingerprint',c['fingerprint']);js('document.getElementById("identityConfirmedFingerprint").dispatchEvent(new Event("input"));return true;');submit('identityTrustForm');wait('document.getElementById("identityStatus").textContent.includes("Chave registrada")')
 p=post(author_url,'projects',{'name':'Obra assinada de teste','template':'novel'});pid=p['id'];nid=next(n['id'] for n in p['nodes'] if n['kind']=='text' and n['include_in_compile']);route='projects/'+pid;post(author_url,route+'/text',{'id':nid,'text':'Texto assinado para revisão.','base_hash':p['document_hashes'][nid]})
 click('identitiesBtn');create('Autor de teste');a=get(author_url,'identities');ac=card(a)
 js('Array.from(document.querySelectorAll("#identityOwnList button")).find(b=>b.textContent==="Baixar cartão público").click();return true;')
 js('Array.from(document.querySelectorAll("#identityOwnList button")).find(b=>b.textContent==="Backup cifrado da chave").click();return true;');wait('document.getElementById("identityStatus").textContent.includes("Backup cifrado preparado")')
 for _ in range(100):
  files=list((artifacts/'downloads').glob('*.wroom-key.json'))
  if files and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert files;backup_text=files[0].read_text();assert key_phrase not in backup_text;assert 'ciphertext' not in json.dumps(a)
 js('document.getElementById("identitiesDialog").close();return true;')
 editor_url=new_server('editor-projects');navigate(editor_url);click('identitiesBtn');create('Editor de teste');b=get(editor_url,'identities');bc=card(b);trust(ac);js('document.getElementById("identitiesDialog").close();return true;')
 navigate(author_url);click('identitiesBtn');trust(bc);js('document.getElementById("identitiesDialog").close();document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert')
 click('publishTab');click('exportPackageBtn');fill('packageTitle','Leitura assinada');fill('packageSender','Autoria declarada livre');fill('packageRecipient','Editor declarado');fill('packageSignatureMode','signed');js('document.getElementById("packageSignatureMode").dispatchEvent(new Event("change"));return true;');fill('packageKeyRecipient',bc['fingerprint']);js('document.getElementById("packageKeyRecipient").dispatchEvent(new Event("change"));const checkbox=Array.from(document.querySelectorAll("#packageSceneChoices input")).find(i=>i.value==='+json.dumps(nid)+');checkbox.checked=true;checkbox.dispatchEvent(new Event("change"));return true;');click('packagePreviewBtn');assert ac['fingerprint'] in js('return document.getElementById("packageExportPreview").textContent');screenshot('01-signed-package-preview.png')
 package_phrase='Outra frase exclusiva para o pacote'
 def encrypt(key_secret):
  fill('packagePassphrase',package_phrase);fill('packagePassphraseConfirm',package_phrase);fill('packageKeyPassphrase',key_secret);submit('packageExportForm')
 encrypt('Uma frase incorreta para chave');wait('document.getElementById("packageExportStatus").textContent.includes("incorreta")');assert js('return document.getElementById("packageKeyPassphrase").value')==''
 before=get(author_url,route);encrypt(key_phrase);wait('!document.getElementById("packageExportDialog").open')
 for _ in range(100):
  packages=list((artifacts/'downloads').glob('*.wroom-package.json'))
  if packages and not list((artifacts/'downloads').glob('*.part')):break
  time.sleep(.1)
 assert packages;signed_text=packages[0].read_text();assert json.loads(signed_text)['version']==2;assert package_phrase not in signed_text and key_phrase not in signed_text;assert get(author_url,route)==before
 navigate(editor_url)
 def open_signed():
  click('openPackageLibraryBtn');assert js('return document.getElementById("packageRequireSignature").checked');upload('packageFile',signed_text,'editorial.wroom-package.json');fill('packageExpectedRecipient','Editor declarado');fill('packageOpenPassphrase',package_phrase);submit('packageOpenForm');wait('!document.getElementById("packageImportBtn").disabled');assert ac['fingerprint'] in js('return document.getElementById("packageOpenStatus").textContent');assert 'Assinatura conferida' in js('return document.getElementById("packageOpenStatus").textContent')
 open_signed();assert len(get(editor_url,'projects'))==0;click('packageImportBtn');wait('!document.getElementById("packageOpenDialog").open && !document.getElementById("workspace").inert');assert len(get(editor_url,'projects'))==1;click('backBtn');open_signed()
 bs=get(editor_url,'identities');post(editor_url,'identities/revoke',{'fingerprint':ac['fingerprint'],'base_hash':bs['hash']});click('packageImportBtn');wait('document.getElementById("packageOpenStatus").textContent.includes("revogada")');assert len(get(editor_url,'projects'))==1;click('packageCancelOpenBtn')
 click('identitiesBtn');assert 'Revogada' in js('return document.getElementById("identityContactsList").textContent');command('WebDriver:SetWindowRect',{'width':500,'height':900});wait('window.innerWidth<=500');assert js('return document.getElementById("identitiesDialog").getBoundingClientRect().width<=window.innerWidth');assert js('return document.documentElement.scrollWidth<=window.innerWidth');screenshot('02-keys-mobile.png');js('document.getElementById("identitiesDialog").close();return true;')
 recovery_url=new_server('recovered-keys');navigate(recovery_url);click('identitiesBtn');upload('identityBackupFile',backup_text,'identity.wroom-key.json');fill('identityRestorePassphrase','Frase longa incorreta de recuperação');submit('identityRestoreForm');wait('document.getElementById("identityStatus").textContent.includes("incorreta")');assert get(recovery_url,'identities')['identities']==[];fill('identityRestorePassphrase',key_phrase);submit('identityRestoreForm');wait('document.getElementById("identityStatus").textContent.includes("Chave conferida e restaurada")');assert get(recovery_url,'identities')['active_fingerprint']==ac['fingerprint'];assert get(recovery_url,'identities')['contacts']==[];assert js('return document.getElementById("identityRestorePassphrase").value')==''
 assert get(author_url,route)==before
 print(json.dumps({'ok':True,'checks':['create-protected-key','public-card-and-encrypted-key-backup','manual-fingerprint-confirmation','signed-preview-binds-keys','wrong-unlock-phrase-clears-fields','signed-encrypted-download','signature-pinned-across-installations','independent-import-origin-unchanged','revoke-before-confirm-blocks-import','key-backup-restore-wrong-and-correct-phrase','keys-mobile-layout'],'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
