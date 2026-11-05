"""Witnessed recovery, explicit reconfirmation and domain cutover over isolated HTTPS in Firefox."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
a=prefix.index(" subprocess.run(['npm'");b=prefix.index(" profile=artifacts/'profile'",a)
prefix=prefix[:a]+''' subprocess.run(['openssl','req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'ca-key.pem'),'-out',str(artifacts/'ca.pem'),'-days','1','-subj','/CN=WritingRoom test CA'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['openssl','req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'key.pem'),'-out',str(artifacts/'server.csr'),'-subj','/CN=WritingRoom browser fixture'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'server.ext').write_text('basicConstraints=critical,CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=serverAuth\\nsubjectAltName=IP:127.0.0.1,DNS:localhost\\n')
 subprocess.run(['openssl','x509','-req','-in',str(artifacts/'server.csr'),'-CA',str(artifacts/'ca.pem'),'-CAkey',str(artifacts/'ca-key.pem'),'-CAcreateserial','-out',str(artifacts/'cert.pem'),'-days','1','-extfile',str(artifacts/'server.ext')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'key.pem').chmod(0o600);(artifacts/'ca-key.pem').chmod(0o600)
 server=subprocess.Popen(['node','scripts/fixtures/sharing-subject-recovery-browser-server.mjs',str(artifacts)],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(artifacts/'server.log','w'),text=True)
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
 def material(subject,action):
  wait('window.boundProof');js('window.proof=window.boundProof;return true;')
  run('(window.recipient=await proof.createProofRecipient(),true)')
  card=run('proof.publicProofCard(window.recipient.publicKey)')
  return control(action,subject=subject,card=card)
 def answer(material,challenge):
  return run('proof.answerDeviceChallenge(window.recipient,'+json.dumps(material['binding'])+','+json.dumps(challenge)+','+json.dumps({'subject':material['binding']['payload']['subject'],'device':material['binding']['payload']['device'],'identityFingerprint':material['fingerprint']})+')')
 def prove(material,csrf):
  begin=fetch('/device-proof/begin',{'binding':material['binding']},csrf);assert begin.get('status')==200,'Begin session possession'
  assert fetch('/device-proof/confirm',{'response':answer(material,begin['body'])},csrf).get('status')==200,'Confirm session possession'
  return begin['body']
 def denied_control(action,**args):
  server.stdin.write(json.dumps({'action':action,**args})+'\n');server.stdin.flush()
  return json.loads(server.stdout.readline()).get('error')=='DENIED'
 def tab():
  w=value(command('WebDriver:NewWindow',{'type':'tab'}));command('WebDriver:SwitchToWindow',{'handle':w['handle']});back();return w['handle']
 auth_handle=value(command('WebDriver:GetWindowHandle'))
 alice_csrf=login('alice');alice_cookie=cookie('__Host-wroom_synthetic')
 check('verified OIDC selects alice context',fetch('/session').get('body',{}).get('subject')=='alice')
 alice_handle=tab();alice=material('alice','bind_current');prove(alice,alice_csrf)
 check('alice browser private key is non-extractable',js('return window.recipient.privateKey.extractable===false;'))
 alice_domains=fetch('/operations/context',{},alice_csrf)['body']
 invite={'projectId':'book','recipient':'reviewer','scope':['one'],'capabilities':['read'],'expiresAt':int(time.time()*1000)+3600000}
 alice_operation=operation('invite',invite,alice_domains)
 alice_receipt=fetch('/operations/execute',alice_operation,alice_csrf)
 check('alice operation commits in her journal',alice_receipt.get('status')==200)
 command('WebDriver:SwitchToWindow',{'handle':auth_handle});back()
 bob_csrf=login('bob');bob_cookie=cookie('__Host-wroom_synthetic')
 check('verified OIDC selects bob context',fetch('/session').get('body',{}).get('subject')=='bob')
 bob_handle=tab();bob=material('bob','bind_current');prove(bob,bob_csrf)
 check('bob browser private key is non-extractable',js('return window.recipient.privateKey.extractable===false;'))
 bob_domains=fetch('/operations/context',{},bob_csrf)['body']
 check('accounts use distinct directory and journal domains',alice_domains['directoryDomain']!=bob_domains['directoryDomain'] and alice_domains['journalDomain']!=bob_domains['journalDomain'])
 bob_operation=operation('invite',invite,bob_domains);bob_receipt=fetch('/operations/execute',bob_operation,bob_csrf)
 check('bob operation commits in his journal',bob_receipt.get('status')==200)
 check('bob cannot read alice receipt domains',fetch('/operations/reconcile',alice_operation,bob_csrf).get('status')==403)
 check('bob cannot prove alice binding',fetch('/device-proof/begin',{'binding':alice['binding']},bob_csrf).get('status')==403)
 check('alice CSRF cannot operate bob session',fetch('/operations/context',{},alice_csrf).get('status')==403)
 check('body cannot choose account context',fetch('/operations/context',{'subject':'alice'},bob_csrf).get('status')==400)
 check('body cannot choose directory context',fetch('/operations/context',{'directoryDomain':alice_domains['directoryDomain']},bob_csrf).get('status')==400)
 # Prepare two distinct browser-bound callbacks before the recovery. Only alice's is invalidated.
 pending_a=start('device');login_cookie_a=cookie('__Host-wroom_oidc_login');pending_url_a=control('callback',input={'authorizationUrl':pending_a,'sub':'alice-sub'})['url']
 pending_b=start('device');login_cookie_b=cookie('__Host-wroom_oidc_login');pending_url_b=control('callback',input={'authorizationUrl':pending_b,'sub':'bob-sub'})['url']
 new_handle=tab();new=material('alice','prepare_candidate')
 check('replacement browser private key is non-extractable',js('return window.recipient.privateKey.extractable===false;'))
 check('replacement identity differs from both accounts',new['fingerprint']!=alice['fingerprint'] and new['fingerprint']!=bob['fingerprint'])
 check('candidate needs possession before recovery',denied_control('begin_recovery',subject='alice',expectedOldFingerprint=alice['fingerprint'],expectedNewFingerprint=new['fingerprint']))
 challenge=control('candidate_begin',subject='alice');control('candidate_confirm',subject='alice',response=answer(new,challenge))
 review=control('begin_recovery',subject='alice',expectedOldFingerprint=alice['fingerprint'],expectedNewFingerprint=new['fingerprint'])
 check('other subject cannot approve alice recovery',denied_control('approve_recovery',subject='alice',expectedSubject='bob',expectedOldFingerprint=alice['fingerprint'],expectedNewFingerprint=new['fingerprint'],expectedTargetDirectoryDomain=review['review']['targetCheckpoint']['domain']))
 before_b=control('summary',subject='bob')
 control('approve_recovery',subject='alice',expectedSubject='alice',expectedOldFingerprint=alice['fingerprint'],expectedNewFingerprint=new['fingerprint'],expectedTargetDirectoryDomain=review['review']['targetCheckpoint']['domain'])
 committed=control('commit_recovery',subject='alice')
 check('alice recovery increments only her epoch',committed['epoch']==1 and control('summary',subject='bob')['witness']['epoch']==0)
 restore(alice_cookie)
 check('alice old session blocked before activation',fetch('/session').get('status')==403)
 restore(bob_cookie)
 check('bob existing session works before activation',fetch('/session').get('body',{}).get('subject')=='bob')
 check('bob receipt works before activation',fetch('/operations/reconcile',bob_operation,bob_csrf).get('body',{}).get('receipt',{}).get('receiptId')==bob_receipt['body']['receipt']['receiptId'])
 check('alice source cannot reopen against advanced witness',control('probe_source',subject='alice')['refused'])
 check('bob source remains current',not control('probe_source',subject='bob')['refused'])
 check('private reconciliation identifies alice target',control('reconcile_recovery',subject='alice')==committed)
 check('restart refuses unresolved activation',denied_control('restart_current'))
 activated=control('activate_recovered',subject='alice')
 check('activation preserves HTTPS origin and issuer',activated==endpoints)
 check('activation preserves bob authenticated session',fetch('/session').get('body',{}).get('subject')=='bob')
 check('activation preserves bob proven operation context',fetch('/operations/context',{},bob_csrf).get('body')==bob_domains)
 check('activation preserves bob persisted trust and journal',control('summary',subject='bob')==before_b)
 check('activation preserves bob historical receipt',fetch('/operations/reconcile',bob_operation,bob_csrf).get('body',{}).get('receipt',{}).get('receiptId')==bob_receipt['body']['receipt']['receiptId'])
 restore(alice_cookie);check('alice old cookie remains invalid after activation',fetch('/session').get('status')==403)
 empty=control('summary',subject='alice')
 check('recovered alice journal has no inherited grants or receipts',empty['journal']['events']==0 and empty['journal']['receipts']==[])
 # Complete old callbacks in an auth document; live CryptoKeys stay in their own tabs.
 command('WebDriver:SwitchToWindow',{'handle':auth_handle});back()
 command('WebDriver:DeleteCookie',{'name':'__Host-wroom_synthetic'});restore(login_cookie_a);navigate(pending_url_a,False)
 check('alice pre-recovery OIDC callback is refused','DENIED' in js('return document.body.textContent;'))
 back();restore(login_cookie_b);navigate(pending_url_b)
 check('bob pre-recovery OIDC callback still completes',fetch('/session').get('body',{}).get('subject')=='bob')
 pending_result=fetch('/oidc/result');check('bob callback result remains available once',pending_result.get('status')==200)
 check('bob callback result cannot replay',fetch('/oidc/result').get('status')==403)
 new_csrf=login('alice');new_cookie=cookie('__Host-wroom_synthetic')
 check('fresh login resolves recovered alice context',fetch('/session').get('body',{}).get('subject')=='alice')
 check('fresh alice login requires new session possession',fetch('/operations/context',{},new_csrf).get('status')==403)
 check('alice old binding cannot activate in new directory',fetch('/device-proof/begin',{'binding':alice['binding']},new_csrf).get('status')==403)
 check('bob binding cannot activate in recovered alice directory',fetch('/device-proof/begin',{'binding':bob['binding']},new_csrf).get('status')==403)
 command('WebDriver:SwitchToWindow',{'handle':new_handle});prove(new,new_csrf)
 new_domains=fetch('/operations/context',{},new_csrf)['body']
 check('recovered alice proof opens only committed domains',new_domains=={'directoryDomain':committed['directoryDomain'],'journalDomain':committed['journalDomain']})
 check('recovered alice cannot read bob receipt domains',fetch('/operations/reconcile',bob_operation,new_csrf).get('status')==403)
 check('alice receipt absent in explicitly new domains',fetch('/operations/reconcile',{**alice_operation,**new_domains},new_csrf).get('body',{}).get('status')=='not_found')
 check('old alice project is not inherited',fetch('/access/check',{'projectId':'book','sceneId':'one','action':'read'},new_csrf).get('status')==403)
 for route in ['/recovery/confirm','/witness/bootstrap','/directory/pin']:
  check('no public multi-account trust route '+route,fetch(route,{},new_csrf).get('status')==403)
 check('CSRF remains mandatory after account activation',fetch('/operations/context',{}).get('status')==403)
 control('seed_new_project',subject='alice')
 new_operation=operation('invite',{**invite,'projectId':'newbook'},new_domains);new_receipt=fetch('/operations/execute',new_operation,new_csrf)
 check('recovered alice can commit new operation',new_receipt.get('status')==200)
 check('recovered alice retry is idempotent',fetch('/operations/execute',new_operation,new_csrf).get('body',{}).get('receipt',{}).get('receiptId')==new_receipt['body']['receipt']['receiptId'])
 restore(bob_cookie);command('WebDriver:SwitchToWindow',{'handle':bob_handle})
 check('bob original session still works after alice new login and operation',fetch('/operations/context',{},bob_csrf).get('body')==bob_domains)
 before_a=control('summary',subject='alice');before_b=control('summary',subject='bob')
 endpoints=control('restart_current')
 check('full transport restart discards bob session',fetch('/session').get('status')==403)
 restore(new_cookie);check('full restart discards alice recovered session',fetch('/session').get('status')==403)
 check('full restart preserves alice witness',control('summary',subject='alice')['witness']==before_a['witness'])
 check('full restart preserves bob witness',control('summary',subject='bob')['witness']==before_b['witness'])
 command('WebDriver:SwitchToWindow',{'handle':auth_handle});back();bob_restart=login('bob')
 check('bob restart login needs fresh possession',fetch('/operations/reconcile',bob_operation,bob_restart).get('status')==403)
 command('WebDriver:SwitchToWindow',{'handle':bob_handle});prove(bob,bob_restart)
 check('bob fresh proof reconciles original receipt after restart',fetch('/operations/reconcile',bob_operation,bob_restart).get('body',{}).get('receipt',{}).get('receiptId')==bob_receipt['body']['receipt']['receiptId'])
 command('WebDriver:SwitchToWindow',{'handle':auth_handle});back();alice_restart=login('alice')
 check('alice restart login needs fresh possession',fetch('/operations/reconcile',new_operation,alice_restart).get('status')==403)
 command('WebDriver:SwitchToWindow',{'handle':new_handle});prove(new,alice_restart)
 check('alice fresh proof reconciles recovered receipt after restart',fetch('/operations/reconcile',new_operation,alice_restart).get('body',{}).get('receipt',{}).get('receiptId')==new_receipt['body']['receipt']['receiptId'])
 report={'checks':len(checks),'passed':checks,'artifacts':str(artifacts),'limitations':['Two synthetic accounts; private in-memory account/domain map, no real identity or manuscript.','Activation swaps one account harness without restarting the HTTPS server; full restart invalidates all sessions.','Firefox non-extractable keys stay in live documents; not browser/process crash recovery.','Witnesses and reconfirmation authorities remain local fixture controls; joint rollback remains a limit.']}
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
