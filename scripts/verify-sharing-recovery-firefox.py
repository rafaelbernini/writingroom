"""Witnessed recovery, explicit reconfirmation and domain cutover over isolated HTTPS in Firefox."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
a=prefix.index(" subprocess.run(['npm'");b=prefix.index(" profile=artifacts/'profile'",a)
prefix=prefix[:a]+''' subprocess.run(['openssl','req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'ca-key.pem'),'-out',str(artifacts/'ca.pem'),'-days','1','-subj','/CN=WritingRoom test CA'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['openssl','req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'key.pem'),'-out',str(artifacts/'server.csr'),'-subj','/CN=WritingRoom browser fixture'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'server.ext').write_text('basicConstraints=critical,CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=serverAuth\\nsubjectAltName=IP:127.0.0.1,DNS:localhost\\n')
 subprocess.run(['openssl','x509','-req','-in',str(artifacts/'server.csr'),'-CA',str(artifacts/'ca.pem'),'-CAkey',str(artifacts/'ca-key.pem'),'-CAcreateserial','-out',str(artifacts/'cert.pem'),'-days','1','-extfile',str(artifacts/'server.ext')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'key.pem').chmod(0o600);(artifacts/'ca-key.pem').chmod(0o600)
 server=subprocess.Popen(['node','scripts/fixtures/sharing-recovery-browser-server.mjs',str(artifacts)],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(artifacts/'server.log','w'),text=True)
 endpoints=json.loads(server.stdout.readline());url=endpoints['origin']+'/_synthetic/browser'
'''+prefix[b:]
prefix=prefix.replace("'network.captive-portal-service.enabled':False", "'network.cookie.cookieBehavior':0,'privacy.trackingprotection.enabled':False,'network.dns.disableIPv6':True,'network.captive-portal-service.enabled':False")
prefix=prefix.replace('document.getElementById("libraryEmpty") && !document.getElementById("libraryEmpty").classList.contains("hidden")','document.title==="Fixture HTTPS sintética"')
prefix=prefix.replace("profile.mkdir();(artifacts/'downloads').mkdir()", "profile.mkdir();(artifacts/'downloads').mkdir()\n subprocess.run(['certutil','-N','-d','sql:'+str(profile),'--empty-password'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)\n subprocess.run(['certutil','-A','-d','sql:'+str(profile),'-n','writingroom-fixture','-t','C,,','-i',str(artifacts/'ca.pem')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)")
prefix=prefix.replace("'acceptInsecureCerts':True", "'acceptInsecureCerts':False")
prefix=prefix.replace(" server=subprocess.Popen", " subprocess.run(['./node_modules/.bin/esbuild','scripts/fixtures/sharing-bound-browser.mjs','--bundle','--platform=browser','--format=iife','--global-name=boundProof','--outfile='+str(artifacts/'bound-proof.js')],cwd=root,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)\n server=subprocess.Popen")
body=r'''
 checks=[]
 def check(name,value):
  assert value,name
  checks.append(name)
 def control(action,**args):
  server.stdin.write(json.dumps({'action':action,**args})+'\n');server.stdin.flush()
  result=json.loads(server.stdout.readline());assert 'error' not in result,'Private control failed: '+action
  return result
 def run(expression):
  js('window.result=null;Promise.resolve().then(async()=>('+expression+')).then(v=>window.result={ok:true,value:v}).catch(()=>window.result={ok:false});return true;')
  for _ in range(100):
   result=js('return window.result;')
   if result is not None:
    assert result['ok'],'Browser operation failed'
    return result.get('value')
   time.sleep(.05)
  raise RuntimeError('Browser operation timed out')
 def fetch(route,body=None,csrf=None,target=None):
  options={'method':'GET' if body is None else 'POST','credentials':'include'}
  if body is not None:options.update({'headers':{'Content-Type':'application/json'},'body':json.dumps(body)})
  if csrf:options.setdefault('headers',{})['X-CSRF-Token']=csrf
  return run('fetch('+json.dumps((target or endpoints['origin'])+route)+','+json.dumps(options)+').then(async r=>({status:r.status,body:await r.json(),setCookie:r.headers.get("set-cookie")})).catch(()=>({blocked:true}))')
 def value(result):
  return result.get('value',result) if isinstance(result,dict) else result
 def cookies():return value(command('WebDriver:GetCookies'))
 def cookie(name):return next(c for c in cookies() if c['name']==name)
 def restore(c):command('WebDriver:AddCookie',{'cookie':{k:c[k] for k in ['name','value','path','domain','secure','httpOnly','sameSite'] if k in c}})
 def start(device='owner'):
  r=fetch('/oidc/login/start',{'device':device});assert r.get('status')==200,'OIDC start'
  return r['body']['authorizationUrl']
 def navigate(target,success=True):
  # Start on issuer site, then use native location navigation. The callback is a real cross-site top-level GET.
  command('WebDriver:Navigate',{'url':endpoints['issuer']+'/'})
  js('location.href='+json.dumps(target)+';return true;')
  expected='location.origin==='+json.dumps(endpoints['origin'])+' && '+('location.pathname==="/_synthetic/browser"' if success else 'location.pathname==="/oidc/callback" && document.body.textContent.includes("DENIED")')
  wait(expected)
 def back():command('WebDriver:Navigate',{'url':url})
 def login(subject):
  command('WebDriver:DeleteCookie',{'name':'__Host-wroom_synthetic'})
  authorization=start('device');control('authorize',input={'authorizationUrl':authorization,'sub':subject+'-sub'})
  navigate(authorization)
  result=fetch('/oidc/result');assert result.get('status')==200,'One-use OIDC result'
  return result['body']['csrf']
 def operation(action,input,domains):
  return {'operationId':js('return crypto.randomUUID();'),**domains,'action':action,'input':input}
 def material(action):
  wait('window.boundProof');js('window.proof=window.boundProof;return true;')
  run('(window.recipient=await proof.createProofRecipient(),true)')
  card=run('proof.publicProofCard(window.recipient.publicKey)')
  return control(action,card=card)
 def answer(material,challenge):
  return run('proof.answerDeviceChallenge(window.recipient,'+json.dumps(material['binding'])+','+json.dumps(challenge)+','+json.dumps({'subject':'owner','device':'device','identityFingerprint':material['fingerprint']})+')')
 def prove(material,csrf):
  begin=fetch('/device-proof/begin',{'binding':material['binding']},csrf);assert begin.get('status')==200,'Begin session possession'
  assert fetch('/device-proof/confirm',{'response':answer(material,begin['body'])},csrf).get('status')==200,'Confirm session possession'
  return begin['body']
 def denied_control(action,**args):
  server.stdin.write(json.dumps({'action':action,**args})+'\n');server.stdin.flush()
  return json.loads(server.stdout.readline()).get('error')=='DENIED'
 def tab():
  w=value(command('WebDriver:NewWindow',{'type':'tab'}));command('WebDriver:SwitchToWindow',{'handle':w['handle']});back();return w['handle']
 old_csrf=login('owner');old_cookie=cookie('__Host-wroom_synthetic');old_handle=value(command('WebDriver:GetWindowHandle'))
 check('OIDC session works with witnessed directory',fetch('/session').get('body',{}).get('subject')=='owner')
 check('witnessed session requires possession',fetch('/operations/context',{},old_csrf).get('status')==403)
 old=material('bind_current');prove(old,old_csrf)
 check('old browser private key remains non-extractable',js('return window.recipient.privateKey.extractable===false;'))
 source=control('summary');check('witness advances after native browser possession',source['witness']['checkpoint']['revision']==source['directory']['revision'] and source['witness']['sequence']>=1)
 check('original synthetic editorial grant exists',len(source['journal']['receipts'])==1)
 check('original owner can read old scope',fetch('/access/check',{'projectId':'oldbook','sceneId':'one','action':'read'},old_csrf).get('status')==200)
 old_domains=fetch('/operations/context',{},old_csrf)['body']
 invite={'projectId':'oldbook','recipient':'editor','scope':['one'],'capabilities':['read'],'expiresAt':int(time.time()*1000)+3600000}
 old_operation=operation('invite',invite,old_domains)
 receipt=fetch('/operations/execute',old_operation,old_csrf);check('old operation commits a recoverable receipt',receipt.get('status')==200)
 old_receipt=receipt['body']['receipt']['receiptId']
 check('old receipt can be reconciled before transition',fetch('/operations/reconcile',old_operation,old_csrf).get('body',{}).get('receipt',{}).get('receiptId')==old_receipt)
 control('backup_current');prove(old,old_csrf)
 check('older directory checkpoint is refused without rolling back witness',control('probe_snapshot')['refused'])
 check('failed snapshot opening preserves current browser session',fetch('/session').get('status')==200)
 # Leave an OIDC callback pending across the recovery cutover.
 pending_authorization=start('device');pending_url=control('callback',input={'authorizationUrl':pending_authorization,'sub':'owner-sub'})['url']
 new_handle=tab();new=material('prepare_candidate')
 check('candidate browser private key remains non-extractable',js('return window.recipient.privateKey.extractable===false;'))
 check('new identity has a distinct full fingerprint',new['fingerprint']!=old['fingerprint'] and len(new['fingerprint'])==64)
 check('recovery cannot start from signature without new key possession',denied_control('begin_recovery',expectedOldFingerprint=old['fingerprint'],expectedNewFingerprint=new['fingerprint']))
 challenge=control('candidate_begin');response=answer(new,challenge);activated=control('candidate_confirm',response=response)
 check('Firefox HPKE answer proves possession of candidate key',activated.get('subject')=='owner')
 check('candidate possession response is one-use',denied_control('candidate_confirm',response=response))
 review=control('begin_recovery',expectedOldFingerprint=old['fingerprint'],expectedNewFingerprint=new['fingerprint'])
 check('review binds source epoch, old/new fingerprints and fresh domains',review['review']['sourceEpoch']==source['witness']['epoch'] and review['review']['oldFingerprint']==old['fingerprint'] and review['review']['newFingerprint']==new['fingerprint'] and review['review']['targetCheckpoint']['domain']!=old_domains['directoryDomain'] and review['review']['targetJournalDomain']!=old_domains['journalDomain'])
 check('wrong independent fingerprint cannot approve recovery',denied_control('approve_recovery',expectedSubject='owner',expectedOldFingerprint=old['fingerprint'],expectedNewFingerprint='0'*64,expectedTargetDirectoryDomain=review['review']['targetCheckpoint']['domain']))
 check('rejected approval leaves old session authorized',fetch('/session').get('status')==200)
 for route in ['/recovery/begin','/recovery/approve','/recovery/confirm','/witness/bootstrap','/witness/recover','/directory/pin']:
  check('no public trust control '+route,fetch(route,{},old_csrf).get('status')==403)
 check('uncommitted review is not a committed recovery target',denied_control('reconcile_recovery'))
 control('approve_recovery',expectedSubject='owner',expectedOldFingerprint=old['fingerprint'],expectedNewFingerprint=new['fingerprint'],expectedTargetDirectoryDomain=review['review']['targetCheckpoint']['domain'])
 committed=control('commit_recovery')
 check('private approval advances exactly one recovery epoch',committed['epoch']==source['witness']['epoch']+1)
 check('recovery authorization cannot replay',denied_control('replay_recovery'))
 check('persisted trust state reconciles the same recovery target',control('reconcile_recovery')==committed)
 check('old runtime blocks session immediately after witness transition',fetch('/session').get('status')==403)
 check('old runtime blocks receipt reconciliation after transition',fetch('/operations/reconcile',old_operation,old_csrf).get('status')==403)
 check('old runtime blocks formerly readable scope after transition',fetch('/access/check',{'projectId':'oldbook','sceneId':'one','action':'read'},old_csrf).get('status')==403)
 transition=control('summary');check('old wrapper is visibly blocked by new witness',transition['directory'].get('blocked') is True)
 check('old source directory cannot be reopened against new witness',control('probe_source')['refused'])
 endpoints=control('activate_recovered');url=endpoints['origin']+'/_synthetic/browser'
 check('cutover keeps only the original loopback RP origin',js('return location.origin;')==endpoints['origin'])
 check('cutover rejects old session cookie',fetch('/session').get('status')==403)
 empty=control('summary');check('fresh journal inherits no project events, grants or receipts',empty['journal']['events']==0 and empty['journal']['receipts']==[] and empty['journal']['domain']==committed['journalDomain'])
 # Keep the replacement CryptoKey in this document while OIDC navigates in a separate tab.
 auth_handle=tab();navigate(pending_url,False)
 check('pending pre-recovery OIDC callback is refused','DENIED' in js('return document.body.textContent;'));back()
 new_csrf=login('owner');new_cookie=cookie('__Host-wroom_synthetic')
 check('fresh OIDC login still reports same declared account subject',fetch('/session').get('body',{}).get('subject')=='owner')
 check('new identity receives no automatic session possession',fetch('/operations/context',{},new_csrf).get('status')==403)
 check('same subject does not make the old signed key trusted',fetch('/device-proof/begin',{'binding':old['binding']},new_csrf).get('status')==403)
 command('WebDriver:SwitchToWindow',{'handle':new_handle});prove(new,new_csrf)
 domains=fetch('/operations/context',{},new_csrf)
 check('new session possession opens only recovered domains',domains.get('status')==200 and domains['body']['journalDomain']==committed['journalDomain'] and domains['body']['directoryDomain']==committed['directoryDomain'])
 check('old receipt domains remain refused after fresh login and possession',fetch('/operations/reconcile',old_operation,new_csrf).get('status')==403)
 query={**old_operation,**domains['body']}
 absent=fetch('/operations/reconcile',query,new_csrf)
 check('old operation ID is absent in explicitly fresh domains',absent.get('body',{}).get('status')=='not_found' and absent['body']['journalDomain']==committed['journalDomain'])
 check('old project and grant are not inherited by replacement identity',fetch('/access/check',{'projectId':'oldbook','sceneId':'one','action':'read'},new_csrf).get('status')==403)
 restore(old_cookie);check('old cookie remains invalid even with new browser key present',fetch('/session').get('status')==403);restore(new_cookie)
 control('seed_new_project')
 current=operation('invite',{**invite,'projectId':'newbook'},domains['body'])
 created=fetch('/operations/execute',current,new_csrf);check('recovered session can perform an explicitly new editorial operation',created.get('status')==200 and created['body']['replayed'] is False)
 check('new operation remains idempotent under witness',fetch('/operations/execute',current,new_csrf).get('body',{}).get('receipt',{}).get('receiptId')==created['body']['receipt']['receiptId'])
 before_restart=control('summary');endpoints=control('restart_current');url=endpoints['origin']+'/_synthetic/browser'
 check('restart invalidates recovered session cookie',fetch('/session').get('status')==403)
 persisted=control('summary');check('restart preserves witness epoch and domain pair',persisted['witness']==before_restart['witness'] and persisted['journal']['domain']==before_restart['journal']['domain'])
 command('WebDriver:SwitchToWindow',{'handle':auth_handle});back();restart_csrf=login('owner')
 check('restarted service requires fresh same-session possession',fetch('/operations/reconcile',current,restart_csrf).get('status')==403)
 command('WebDriver:SwitchToWindow',{'handle':new_handle});prove(new,restart_csrf)
 check('fresh possession after restart reconciles new receipt',fetch('/operations/reconcile',current,restart_csrf).get('body',{}).get('receipt',{}).get('receiptId')==created['body']['receipt']['receiptId'])
 check('source remains excluded after recovered service restart',control('probe_source')['refused'])
 report={'checks':len(checks),'passed':checks,'artifacts':str(artifacts),'limitations':['One synthetic remote subject; no real account, mailbox, manuscript or production recovery.','Bootstrap, candidate preparation, approval and recovery commit only through private pipes; no public recovery route.','Firefox keys remain non-extractable in live documents; restart reopens databases/transport but is not a browser or process crash.','Witness and approval authority are local fixture controls; joint rollback of directory+witness remains outside this guarantee.']}
 (artifacts/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report,ensure_ascii=False))
except Exception:
 print('Failure artifacts: '+str(artifacts),flush=True)
 raise
finally:
 if connection:connection.close()
 for process in [browser,server]:
  if process and process.poll() is None:
   process.terminate()
   try:process.wait(timeout=8)
   except subprocess.TimeoutExpired:process.kill();process.wait(timeout=3)
'''
exec(compile(prefix+body,filename,'exec'))
