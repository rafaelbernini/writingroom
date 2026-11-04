"""OIDC redirects, callback cookies, TLS backchannel and session/device scope in isolated Firefox."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
a=prefix.index(" subprocess.run(['npm'");b=prefix.index(" profile=artifacts/'profile'",a)
prefix=prefix[:a]+''' subprocess.run(['openssl','req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'ca-key.pem'),'-out',str(artifacts/'ca.pem'),'-days','1','-subj','/CN=WritingRoom test CA'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['openssl','req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'key.pem'),'-out',str(artifacts/'server.csr'),'-subj','/CN=WritingRoom browser fixture'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'server.ext').write_text('basicConstraints=critical,CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=serverAuth\\nsubjectAltName=IP:127.0.0.1,DNS:localhost\\n')
 subprocess.run(['openssl','x509','-req','-in',str(artifacts/'server.csr'),'-CA',str(artifacts/'ca.pem'),'-CAkey',str(artifacts/'ca-key.pem'),'-CAcreateserial','-out',str(artifacts/'cert.pem'),'-days','1','-extfile',str(artifacts/'server.ext')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'key.pem').chmod(0o600);(artifacts/'ca-key.pem').chmod(0o600)
 server=subprocess.Popen(['node','scripts/fixtures/sharing-oidc-browser-server.mjs',str(artifacts)],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(artifacts/'server.log','w'),text=True)
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
  authorization=start(subject);control('authorize',input={'authorizationUrl':authorization,'sub':subject+'-sub'})
  navigate(authorization)
  result=fetch('/oidc/result');assert result.get('status')==200,'One-use OIDC result'
  return result['body']['csrf']
 def operation(action,input,domains):
  return {'operationId':js('return crypto.randomUUID();'),**domains,'action':action,'input':input}
 def crypto(subject):
  wait('window.boundProof');js('window.proof=window.boundProof;return true;')
  run('(window.recipient=await proof.createProofRecipient(),true)')
  card=run('proof.publicProofCard(window.recipient.publicKey)')
  material=control('bind',subject=subject,card=card)
  return material
 def prove(subject,material,csrf):
  begin=fetch('/device-proof/begin',{'binding':material['binding']},csrf);assert begin.get('status')==200,'Begin device proof'
  response=run('proof.answerDeviceChallenge(window.recipient,'+json.dumps(material['binding'])+','+json.dumps(begin['body'])+','+json.dumps({'subject':subject,'device':subject,'identityFingerprint':material['fingerprint']})+')')
  assert fetch('/device-proof/confirm',{'response':response},csrf).get('status')==200,'Confirm device proof'
  return begin['body']

 # Prelogin cookie and callback browser binding, without activating devices yet.
 authorization_a=start();pre_a=cookie('__Host-wroom_oidc_login')
 check('prelogin cookie Secure HttpOnly SameSite Lax root path',pre_a['secure'] and pre_a['httpOnly'] and pre_a['sameSite'].lower()=='lax' and pre_a['path']=='/' and pre_a['domain']=='127.0.0.1')
 check('prelogin cookie hidden from JavaScript','__Host-wroom_oidc_login' not in js('return document.cookie;'))
 check('public authorization URL has S256 without verifier','code_challenge_method=S256' in authorization_a and 'code_verifier' not in authorization_a)
 callback_a=control('callback',input={'authorizationUrl':authorization_a,'sub':'owner-sub'})['url']
 authorization_b=start();pre_b=cookie('__Host-wroom_oidc_login')
 navigate(callback_a,False)
 check('crossed browser prelogin cookie cannot complete callback','DENIED' in js('return document.body.textContent;'))
 back();restore(pre_a)
 for key,new_value in [('iss',endpoints['origin']),('subject','owner')]:
  # urllib is available from the shared bootstrap; only local URL parsing here.
  from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
  parts=urlsplit(callback_a);params=dict(parse_qsl(parts.query));params[key]=new_value
  navigate(urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(params),'')),False)
  check('callback rejects altered '+key,'DENIED' in js('return document.body.textContent;'));back();restore(pre_a)
 control('clear');control('authorize',input={'authorizationUrl':authorization_a,'sub':'owner-sub'})
 navigate(authorization_a)
 check('callback cleans code and state from final URL',js('return location.pathname==="/_synthetic/browser" && location.search==="" && location.hash==="";'))
 check('callback removes prelogin cookie',not any(c['name']=='__Host-wroom_oidc_login' for c in cookies()))
 session_cookie=cookie('__Host-wroom_synthetic')
 check('session cookie stays Secure HttpOnly SameSite Lax',session_cookie['secure'] and session_cookie['httpOnly'] and session_cookie['sameSite'].lower()=='lax')
 check('session cookie and tokens hidden from page text','__Host-wroom_synthetic' not in js('return document.cookie;') and 'id_token' not in js('return document.body.textContent;'))
 observations=control('observations')
 check('browser visits prepared issuer authorization endpoint',any(e.get('server')=='issuer' and e.get('path')=='/authorize' for e in observations))
 check('RP redeems code over HTTPS token endpoint',any(e.get('server')=='issuer' and e.get('path')=='/token' and e.get('method')=='POST' for e in observations))
 check('Lax prelogin cookie reaches cross-site document callback',any(e.get('server')=='rp' and e.get('path')=='/oidc/callback' and e.get('site')=='cross-site' and e.get('hasLoginCookie') for e in observations))
 result=fetch('/oidc/result');check('same-origin result returns CSRF with Set-Cookie filtered',result.get('status')==200 and result['body'].get('csrf') and result['setCookie'] is None)
 csrf=result['body']['csrf']
 check('OIDC result is single-use',fetch('/oidc/result').get('status')==403)
 check('OIDC session identifies pinned issuer subject',fetch('/session').get('body',{}).get('subject')=='owner')
 check('logout still requires CSRF',fetch('/logout',{}).get('status')==403)
 navigate(callback_a,False);check('callback state replay rejected','DENIED' in js('return document.body.textContent;'));back()
 # A successful callback may rotate an existing session while retaining its browser binding.
 authorization=start();control('authorize',input={'authorizationUrl':authorization,'sub':'owner-sub'});navigate(authorization)
 rotated=cookie('__Host-wroom_synthetic')
 check('OIDC reauthentication rotates session cookie',rotated['value']!=session_cookie['value'])
 fresh=fetch('/oidc/result');assert fresh['status']==200
 check('OIDC reauthentication rotates CSRF',fresh['body']['csrf']!=csrf)
 restore(session_cookie);check('old session cookie invalid after reauthentication',fetch('/session').get('status')==403);restore(rotated)
 # Invalid signed claims must not replace the existing session.
 authorization=start();control('authorize',input={'authorizationUrl':authorization,'sub':'owner-sub','claims':{'nonce':'x'*43}});navigate(authorization,False)
 check('invalid signed nonce denied in native callback','DENIED' in js('return document.body.textContent;'));back()
 check('invalid token does not replace existing session',cookie('__Host-wroom_synthetic')['value']==rotated['value'] and fetch('/session').get('status')==200)
 # Restart resets login budgets as well as sessions; no old state/result survives.
 authorization=start();pending_url=control('callback',input={'authorizationUrl':authorization,'sub':'owner-sub'})['url']
 endpoints=control('restart');url=endpoints['origin']+'/_synthetic/browser'
 navigate(pending_url,False);check('restart rejects pending OIDC callback','DENIED' in js('return document.body.textContent;'));back()
 check('restart rejects previous session',fetch('/session').get('status')==403)

 # Keep each device's non-extractable keys in its own live document across editorial operations.
 owner_csrf=login('owner');owner_cookie=cookie('__Host-wroom_synthetic');owner_handle=value(command('WebDriver:GetWindowHandle'))
 invite={'projectId':'book','recipient':'editor','scope':['one'],'capabilities':['read','propose'],'expiresAt':int(time.time()*1000)+3600000}
 check('OIDC login alone cannot create invitation',fetch('/invitations/create',invite,owner_csrf).get('status')==403)
 check('operation context requires current-session possession',fetch('/operations/context',{},owner_csrf).get('status')==403)
 owner=crypto('owner');prove('owner',owner,owner_csrf)
 check('browser recipient private key is non-extractable',js('return !window.recipient.privateKey.extractable;'))
 owner_domains=fetch('/operations/context',{},owner_csrf)['body']
 lost_operation=operation('invite',invite,owner_domains);control('drop_operation')
 lost=fetch('/operations/execute',lost_operation,owner_csrf)
 check('committed invite can lose HTTPS response',lost.get('blocked') is True)
 recovered=fetch('/operations/reconcile',lost_operation,owner_csrf)
 check('lost invite response reconciles durable receipt',recovered.get('status')==200 and recovered['body']['status']=='committed')
 check('reconciliation never recovers a lost invitation secret','token' not in recovered['body'] and recovered['body']['secretDelivery']=='not-recoverable')
 retried=fetch('/operations/execute',lost_operation,owner_csrf)
 check('explicit invite retry returns same receipt without a token',retried.get('status')==200 and retried['body']['receipt']['receiptId']==recovered['body']['receipt']['receiptId'] and 'token' not in retried['body'])
 lost_revoke=operation('revoke',{'projectId':'book','invitationId':recovered['body']['receipt']['invitationId']},owner_domains)
 check('owner can explicitly revoke invitation whose secret was lost',fetch('/operations/execute',lost_revoke,owner_csrf).get('body',{}).get('receipt',{}).get('effect')=='revoked')
 created_operation=operation('invite',invite,owner_domains)
 created=fetch('/operations/execute',created_operation,owner_csrf);check('proven OIDC owner creates invitation',created.get('status')==200)
 token=created['body']['token'];invitation_id=created['body']['receipt']['invitationId']
 check('operation ID cannot be reused for changed scope',fetch('/operations/execute',{**created_operation,'input':{**invite,'scope':['private']}},owner_csrf).get('status')==403)
 new_window=value(command('WebDriver:NewWindow',{'type':'tab'}));editor_handle=new_window['handle'];command('WebDriver:SwitchToWindow',{'handle':editor_handle});back()
 editor_csrf=login('editor');editor_cookie=cookie('__Host-wroom_synthetic')
 check('OIDC recipient cannot accept before device possession',fetch('/invitations/accept',{'token':token,'explicit':True},editor_csrf).get('status')==403)
 editor=crypto('editor');editor_challenge=prove('editor',editor,editor_csrf)
 editor_domains=fetch('/operations/context',{},editor_csrf)['body']
 accept_operation=operation('accept',{'token':token,'explicit':True},editor_domains);control('drop_operation')
 check('committed accept can lose HTTPS response',fetch('/operations/execute',accept_operation,editor_csrf).get('blocked') is True)
 accepted=fetch('/operations/reconcile',accept_operation,editor_csrf);check('proven OIDC recipient accepts scoped invitation',accepted.get('status')==200)
 accepted_retry=fetch('/operations/execute',accept_operation,editor_csrf)
 check('accept retry preserves one grant and receipt',accepted_retry.get('status')==200 and accepted_retry['body']['receipt']['grantId']==accepted['body']['receipt']['grantId'] and accepted_retry['body']['receipt']['receiptId']==accepted['body']['receipt']['receiptId'])
 scope={'projectId':'book','sceneId':'one','action':'read'}
 check('granted scene readable after OIDC and possession',fetch('/access/check',scope,editor_csrf).get('status')==200)
 check('private scene remains inaccessible',fetch('/access/check',{**scope,'sceneId':'private'},editor_csrf).get('status')==403)
 receipt=accepted['body']['receipt']['grantId']
 command('WebDriver:SwitchToWindow',{'handle':owner_handle});restore(owner_cookie)
 revoke_operation=operation('revoke',{'projectId':'book','invitationId':invitation_id},owner_domains)
 check('owner revokes OIDC editorial grant',fetch('/operations/execute',revoke_operation,owner_csrf).get('status')==200)
 check('repeated revocation returns the committed receipt',fetch('/operations/execute',revoke_operation,owner_csrf).get('body',{}).get('replayed') is True)
 command('WebDriver:SwitchToWindow',{'handle':editor_handle});restore(editor_cookie)
 check('revoked editorial grant denied to proven OIDC session',fetch('/access/check',scope,editor_csrf).get('status')==403)
 check('historical accept receipt reports current revocation',fetch('/operations/reconcile',accept_operation,editor_csrf).get('body',{}).get('receipt',{}).get('effect')=='revoked')
 control('revoke',hash=editor_challenge['binding_hash'])
 check('durable device revocation invalidates OIDC session',fetch('/session').get('status')==403)
 check('revoked device cannot reconcile an operation receipt',fetch('/operations/reconcile',accept_operation,editor_csrf).get('status')==403)
 check('receipt persists after revocation',control('summary')['journal']['receipts']==[receipt])
 for route in ['/synthetic/login/start','/directory/pin','/directory/revoke','/issueSyntheticCode']:
  check('OIDC mode exposes no control route '+route,fetch(route,{}).get('status')==403)
 # Cross-site Origin protections stay active even with a legitimate cookie in the browser.
 command('WebDriver:Navigate',{'url':endpoints['issuer']+'/'})
 check('cross-site fetch cannot start RP login',fetch('/oidc/login/start',{'device':'owner'}).get('blocked') is True)
 back()
 report={'checks':len(checks),'passed':checks,'artifacts':str(artifacts),'limitations':['Synthetic identities selected only through private pipes; no account or email verification.','Firefox desktop profile with isolated NSS CA and active TLS verification; both servers bind only 127.0.0.1.','Real redirects and HTTPS token backchannel, but fixed local JWKS, no discovery, production provider or E2EE.','Restart reopens both databases and replaces provider/session state; fixture process and live documents remain alive.']}
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
