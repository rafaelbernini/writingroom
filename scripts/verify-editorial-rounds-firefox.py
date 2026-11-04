"""Signed editorial round trip across two isolated installations; no external delivery."""
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
 def upload(id,text):js('const dt=new DataTransfer();dt.items.add(new File(['+json.dumps(text)+'],"editorial.wroom-round.json"));document.getElementById('+json.dumps(id)+').files=dt.files;document.getElementById('+json.dumps(id)+').dispatchEvent(new Event("change"));return true;')
 def navigate(origin):
  command('WebDriver:Navigate',{'url':origin});wait('!document.getElementById("library").classList.contains("hidden") && !document.getElementById("workspace").inert')
 def new_download(previous):
  for _ in range(100):
   files=set((artifacts/'downloads').glob('*.wroom-round*.json'))-previous
   if files and not list((artifacts/'downloads').glob('*.part')):return next(iter(files)).read_text()
   time.sleep(.1)
  raise RuntimeError('Round download missing')
 other_env=dict(env,PORT='0',WRITINGROOM_HOME=str(artifacts/'editor-projects'),WRITINGROOM_BACKUP_HOME=str(artifacts/'editor-backups'))
 other=subprocess.Popen(['node','apps/web/server.mjs'],cwd=root,env=other_env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);extra_servers.append(other);line=other.stdout.readline().strip();assert line.startswith('Writingroom Alpha: ');editor_url=line.split(': ',1)[1]
 phrase='Frase exclusiva para rodada Firefox'
 def identity(origin,name):
  initial=get(origin,'identities');return post(origin,'identities/create',{'name':name,'passphrase':phrase,'confirm_passphrase':phrase,'base_hash':initial['hash']})
 a=identity(author_url,'Autor sintético');b=identity(editor_url,'Editor sintético')
 def card(state):
  i=state['identities'][0];return {'format':'writingroom-public-key','version':1,'name':i['name'],'public_key':i['public_key'],'fingerprint':i['fingerprint']}
 ac=card(a);bc=card(b)
 for origin,state,c in [(author_url,a,bc),(editor_url,b,ac)]:post(origin,'identities/trust',{'file':json.dumps(c),'confirmed_fingerprint':c['fingerprint'],'base_hash':state['hash']})
 p=post(author_url,'projects',{'name':'Obra da rodada','template':'novel'});pid=p['id'];nid=next(n['id'] for n in p['nodes'] if n['kind']=='text' and n['include_in_compile']);route='projects/'+pid;post(author_url,route+'/text',{'id':nid,'text':'Uma casa azul.','base_hash':p['document_hashes'][nid]});p=get(author_url,route);post(author_url,route+'/rich-enable',{'id':nid,'base_rich_hash':p['rich_hashes'][nid]});p=get(author_url,route);rich=p['rich_documents'][nid];rich['doc']['content'][0]['content']=[{'type':'text','text':'Uma '},{'type':'text','text':'casa','marks':[{'type':'comment','attrs':{'id':'n-11111111-1111-1111-1111-111111111111','body':'SEGREDO PRIVADO DO AUTOR','resolved':False}}]},{'type':'text','text':' azul.'}];post(author_url,route+'/rich-save',{'id':nid,'rich_document':rich,'base_rich_hash':p['rich_hashes'][nid]})
 navigate(author_url);js('document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").classList.contains("hidden") && !document.getElementById("workspace").inert');click('reviewTab');click('newRoundBtn');fill('packageTitle','Primeira rodada');fill('packageSender','Autor declarado');fill('packageRecipient','Editor declarado');fill('packageKeyRecipient',bc['fingerprint']);js('document.getElementById("packageKeyRecipient").dispatchEvent(new Event("change"));const checkbox=Array.from(document.querySelectorAll("#packageSceneChoices input")).find(i=>i.value==='+json.dumps(nid)+');checkbox.checked=true;checkbox.dispatchEvent(new Event("change"));return true;');click('packagePreviewBtn');assert 'Uma casa azul.' in js('return document.getElementById("packageExportPreview").textContent');assert 'SEGREDO PRIVADO DO AUTOR' not in js('return document.getElementById("packageExportPreview").textContent');fill('packagePassphrase',phrase);fill('packagePassphraseConfirm',phrase);fill('packageKeyPassphrase',phrase);files=set((artifacts/'downloads').glob('*.wroom-round*.json'));submit('packageExportForm');wait('!document.getElementById("packageExportDialog").open && document.querySelectorAll("#roundCards .round-card").length===1');offer_text=new_download(files);assert json.loads(offer_text)['version']==3;assert get(author_url,route)['schema_version']==7;assert get(author_url,route)['documents'][nid]=='Uma casa azul.'
 navigate(editor_url)
 def open_round(text,recipient,receive=False):
  click('receiveRoundBtn' if receive else 'openRoundLibraryBtn');upload('roundFile',text);fill('roundExpectedRecipient',recipient);fill('roundOpenPhrase',phrase);submit('roundOpenForm');wait('!document.getElementById("roundOpenCommitBtn").disabled || document.getElementById("roundOpenStatus").textContent.includes("conflitos")')
 open_round(offer_text,'Editor declarado');assert len(get(editor_url,'projects'))==0;click('roundOpenCommitBtn');wait('!document.getElementById("roundOpenDialog").open && document.querySelectorAll("#roundCards .round-card").length===1');copy_pid=get(editor_url,'projects')[0]['id'];copy=get(editor_url,'projects/'+copy_pid);copy_id=copy['editorial_rounds'][0]['scenes'][0]['node_id'];assert nid!=copy_id;assert 'SEGREDO PRIVADO DO AUTOR' not in json.dumps(copy,ensure_ascii=False)
 def propose(start,end,replacement):
  click('newReviewBtn');wait('document.getElementById("proposalDialog").open');js('document.getElementById("proposalSource").setSelectionRange('+str(start)+','+str(end)+');document.getElementById("proposalSelectionBtn").click();return true;');wait('!document.getElementById("workspace").inert');fill('proposalAuthor','Revisora declarada');fill('proposalRole','editor');fill('proposalReplacement',replacement);fill('proposalReason','Sugestão da rodada');submit('proposalForm');wait('!document.getElementById("proposalDialog").open')
 propose(9,13,'verde');assert get(editor_url,'projects/'+copy_pid)['reviews'][0]['exchange']['round_id']==copy['editorial_rounds'][0]['id']
 def return_download():
  js('Array.from(document.querySelectorAll("#roundCards button")).find(b=>b.textContent==="Preparar devolutiva").click();return true;');wait('document.getElementById("roundTransferDialog").open && !document.getElementById("workspace").inert');click('roundTransferPreviewBtn');assert 'verde' in js('return document.getElementById("roundTransferPreview").textContent');fill('roundTransferKeyPhrase',phrase);fill('roundTransferPhrase',phrase);fill('roundTransferConfirm',phrase);before=set((artifacts/'downloads').glob('*.wroom-round*.json'));submit('roundTransferForm');wait('!document.getElementById("roundTransferDialog").open');return new_download(before)
 returned=return_download();assert json.loads(returned)['kind']=='return'
 navigate(author_url);js('document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").inert');click('reviewTab');open_round(returned,'Autor declarado',True);assert '1 novas' in js('return document.getElementById("roundOpenStatus").textContent');assert get(author_url,route).get('reviews',[])==[]
 command('WebDriver:SetWindowRect',{'width':500,'height':900});wait('window.innerWidth<=500');assert js('return document.documentElement.scrollWidth<=window.innerWidth');assert js('return document.getElementById("roundOpenDialog").getBoundingClientRect().width<=window.innerWidth');screenshot('01-return-preview-mobile.png');click('roundOpenCommitBtn');wait('!document.getElementById("roundOpenDialog").open && document.querySelectorAll("#reviewCards .scene-card").length===1');assert get(author_url,route)['documents'][nid]=='Uma casa azul.'
 js('Array.from(document.querySelectorAll("#reviewCards button")).find(b=>b.textContent==="Aceitar").click();return true;');wait('document.getElementById("reviewDecisionDialog").open');fill('reviewDecisionAuthor','Autor declarado');submit('reviewDecisionForm');wait('!document.getElementById("reviewDecisionDialog").open');accepted=get(author_url,route);assert accepted['documents'][nid]=='Uma casa verde.';assert 'SEGREDO PRIVADO DO AUTOR' in json.dumps(accepted['rich_documents'],ensure_ascii=False);assert accepted['snapshots']
 open_round(returned,'Autor declarado',True);assert '1 já recebidas' in js('return document.getElementById("roundOpenStatus").textContent');click('roundOpenCommitBtn');wait('!document.getElementById("roundOpenDialog").open');assert len(get(author_url,route)['reviews'])==1
 navigate(editor_url);js('document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").inert');click('reviewTab');propose(0,3,'Esta');conflicting=return_download()
 navigate(author_url);js('document.querySelector(".book").click();return true;');wait('!document.getElementById("workspace").inert');click('reviewTab');open_round(conflicting,'Autor declarado',True);assert '1 conflitos' in js('return document.getElementById("roundOpenStatus").textContent');assert js('return document.getElementById("roundOpenCommitBtn").disabled');assert len(get(author_url,route)['reviews'])==1;click('roundOpenCancelBtn');js('Array.from(document.querySelectorAll("#roundCards button")).find(b=>b.textContent==="Encerrar rodada").click();return true;');accept_alert();wait('document.getElementById("roundCards").textContent.includes("Encerrada") && !document.getElementById("workspace").inert');assert get(author_url,route)['editorial_rounds'][0]['status']=='closed'
 print(json.dumps({'ok':True,'checks':['round-creation-verified-schema7','frozen-base-privacy','offer-signature-preview','new-reviewer-copy','proposal-linked-to-round','signed-return-preview-download','return-import-no-text-mutation','individual-accept-private-comment-snapshot','replay-no-duplicate','changed-base-conflict-blocks','round-close','mobile-layout'],'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
