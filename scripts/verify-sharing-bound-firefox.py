"""Integrated Firefox session/device/invitation cycle; synthetic data and pipe-only controls."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
a=prefix.index(" subprocess.run(['npm'");b=prefix.index(" profile=artifacts/'profile'",a)
prefix=prefix[:a]+''' subprocess.run(['openssl','req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'ca-key.pem'),'-out',str(artifacts/'ca.pem'),'-days','1','-subj','/CN=WritingRoom test CA'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['openssl','req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'key.pem'),'-out',str(artifacts/'server.csr'),'-subj','/CN=WritingRoom browser fixture'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'server.ext').write_text('basicConstraints=critical,CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=serverAuth\\nsubjectAltName=IP:127.0.0.1,DNS:localhost\\n')
 subprocess.run(['openssl','x509','-req','-in',str(artifacts/'server.csr'),'-CA',str(artifacts/'ca.pem'),'-CAkey',str(artifacts/'ca-key.pem'),'-CAcreateserial','-out',str(artifacts/'cert.pem'),'-days','1','-extfile',str(artifacts/'server.ext')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'key.pem').chmod(0o600);(artifacts/'ca-key.pem').chmod(0o600)
 server=subprocess.Popen(['node','scripts/fixtures/sharing-bound-browser-server.mjs',str(artifacts)],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(artifacts/'server.log','w'),text=True)
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
  result=json.loads(server.stdout.readline())
  assert 'error' not in result, 'Pipe control rejected: '+action
  return result
 def run(expression):
  js('window.result=null;Promise.resolve().then(async()=>('+expression+')).then(v=>window.result={ok:true,value:v}).catch(e=>window.result={ok:false,error:e.message});return true;')
  for _ in range(100):
   result=js('return window.result;')
   if result is not None:
    assert result['ok'], 'Browser crypto failed: '+str(result.get('error'))
    return result.get('value')
   time.sleep(.05)
  raise RuntimeError('Browser timeout')
 def fetch(route,body=None,csrf=None):
  options={'method':'GET' if body is None else 'POST','credentials':'include'}
  if body is not None:options.update({'headers':{'Content-Type':'application/json'},'body':json.dumps(body)})
  if csrf:options.setdefault('headers',{})['X-CSRF-Token']=csrf
  return run('fetch('+json.dumps(endpoints['origin']+route)+','+json.dumps(options)+').then(async r=>({status:r.status,body:await r.json()}))')
 def login(subject):
  command('WebDriver:DeleteCookie',{'name':'__Host-wroom_synthetic'})
  start=fetch('/synthetic/login/start',{'device':subject})
  assert start['status']==200, 'Login start'
  code=control('issue',input={'subject':subject,'device':subject,'state':start['body']['state']})['code']
  done=fetch('/synthetic/login/complete',{'state':start['body']['state'],'code':code},start['body']['csrf'])
  assert done['status']==200, 'Login complete'
  return done['body']['csrf']
 def init_crypto():
  wait('window.boundProof')
  js('window.proof=window.boundProof;window.recipients={};return true;')
 def binding(subject):
  run('(window.recipients['+json.dumps(subject)+']=await proof.createProofRecipient(),true)')
  card=run('proof.publicProofCard(window.recipients['+json.dumps(subject)+'].publicKey)')
  return control('bind',subject=subject,card=card)
 def begin(material,csrf):
  result=fetch('/device-proof/begin',{'binding':material['binding']},csrf)
  assert result['status']==200, 'Begin possession'
  return result['body']
 def answer(subject,material,challenge):
  return run('proof.answerDeviceChallenge(window.recipients['+json.dumps(subject)+'],'+json.dumps(material['binding'])+','+json.dumps(challenge)+','+json.dumps({'subject':subject,'device':subject,'identityFingerprint':material['fingerprint']})+')')
 def prove(subject,material,csrf):
  challenge=begin(material,csrf)
  response=answer(subject,material,challenge)
  assert fetch('/device-proof/confirm',{'response':response},csrf)['status']==200, 'Confirm possession'
  return challenge
 def cookies():
  value=command('WebDriver:GetCookies')
  return value.get('value',value) if isinstance(value,dict) else value
 def restore_cookie(cookie):
  # WebDriver switches independent session cookie jars; page JS never reads HttpOnly.
  command('WebDriver:AddCookie',{'cookie':{k:cookie[k] for k in ['name','value','path','domain','secure','httpOnly','sameSite'] if k in cookie}})
 init_crypto()
 owner=binding('owner');editor=binding('editor')
 check('browser private recipient keys stay non-extractable',js('return Object.values(window.recipients).every(r=>!r.privateKey.extractable);'))
 invite={'projectId':'book','recipient':'editor','scope':['one'],'capabilities':['read','propose'],'expiresAt':int(time.time()*1000)+3600000}
 scope={'projectId':'book','sceneId':'one','action':'read'}
 csrf_owner=login('owner')
 owner_cookie=next(c for c in cookies() if c['name']=='__Host-wroom_synthetic')
 check('login alone cannot create invitation',fetch('/invitations/create',invite,csrf_owner)['status']==403)
 challenge=begin(owner,csrf_owner);response=answer('owner',owner,challenge)
 csrf_second=login('owner')
 check('second session cannot confirm first session challenge',fetch('/device-proof/confirm',{'response':response},csrf_second)['status']==403)
 restore_cookie(owner_cookie)
 check('original session still confirms after crossed attempt',fetch('/device-proof/confirm',{'response':response},csrf_owner)['status']==200)
 check('possession response cannot be replayed',fetch('/device-proof/confirm',{'response':response},csrf_owner)['status']==403)
 # Reauthenticate: active binding must not confer possession to a new session.
 csrf_owner=login('owner')
 check('new owner session cannot inherit active binding',fetch('/invitations/create',invite,csrf_owner)['status']==403)
 prove('owner',owner,csrf_owner)
 owner_cookie=next(c for c in cookies() if c['name']=='__Host-wroom_synthetic')
 created=fetch('/invitations/create',invite,csrf_owner)
 check('proven owner creates invitation',created['status']==200)
 token=created['body']['token'];invitation_id=created['body']['invitationId']
 csrf_editor=login('editor')
 check('recipient cannot preview without possession',fetch('/invitations/preview',{'token':token},csrf_editor)['status']==403)
 check('recipient cannot accept without possession',fetch('/invitations/accept',{'token':token,'explicit':True},csrf_editor)['status']==403)
 check('recipient session rejects other subject binding',fetch('/device-proof/begin',{'binding':owner['binding']},csrf_editor)['status']==403)
 check('possession endpoint requires CSRF',fetch('/device-proof/begin',{'binding':editor['binding']})['status']==403)
 editor_challenge=prove('editor',editor,csrf_editor)
 preview=fetch('/invitations/preview',{'token':token},csrf_editor)
 check('preview exposes only selected scope',preview['status']==200 and preview['body']['scope']==['one'])
 check('acceptance requires explicit confirmation',fetch('/invitations/accept',{'token':token,'explicit':False},csrf_editor)['status']==403)
 accepted=fetch('/invitations/accept',{'token':token,'explicit':True},csrf_editor)
 check('proven recipient accepts invitation',accepted['status']==200)
 check('invitation acceptance cannot replay',fetch('/invitations/accept',{'token':token,'explicit':True},csrf_editor)['status']==403)
 for action in ['read','propose']:
  check('selected scope allows '+action,fetch('/access/check',{**scope,'action':action},csrf_editor)['status']==200)
 for name,input in [('private scene',{**scope,'sceneId':'private'}),('other book',{**scope,'projectId':'otherbook'}),('management',{**scope,'action':'manage'})]:
  check('scope denies '+name,fetch('/access/check',input,csrf_editor)['status']==403)
 receipt=accepted['body']['grantId']
 check('acceptance has one durable receipt',control('summary')['journal']['receipts']==[receipt])
 # Leave a live challenge pending across restart, rather than testing only a consumed response.
 pending_challenge=begin(editor,csrf_editor);pending_response=answer('editor',editor,pending_challenge)
 # Restart transport and reopen both SQLite databases; fixture control keys remain outside service.
 endpoints=control('restart');url=endpoints['origin']+'/_synthetic/browser'
 check('restart keeps fixture origin',js('return location.origin;')==endpoints['origin'])
 check('restart rejects existing browser cookie',fetch('/session')['status']==403)
 check('restart preserves grant receipt and active bindings',control('summary')['journal']['receipts']==[receipt] and len(control('summary')['directory']['bindings'])==2)
 csrf_editor=login('editor')
 check('fresh login after restart requires fresh possession',fetch('/access/check',scope,csrf_editor)['status']==403)
 check('pending possession response rejected after restart',fetch('/device-proof/confirm',{'response':pending_response},csrf_editor)['status']==403)
 prove('editor',editor,csrf_editor)
 check('fresh possession recovers existing scoped grant',fetch('/access/check',scope,csrf_editor)['status']==200)
 editor_cookie=next(c for c in cookies() if c['name']=='__Host-wroom_synthetic')
 csrf_owner=login('owner');prove('owner',owner,csrf_owner)
 check('owner revokes invitation',fetch('/invitations/revoke',{'projectId':'book','invitationId':invitation_id},csrf_owner)['status']==200)
 restore_cookie(editor_cookie)
 check('revoked grant blocks proven recipient',fetch('/access/check',scope,csrf_editor)['status']==403)
 control('revoke',hash=editor_challenge['binding_hash'])
 check('durable device revocation invalidates browser session',fetch('/session')['status']==403)
 check('revoked device cannot operate',fetch('/access/check',scope,csrf_editor)['status']==403)
 csrf_editor=login('editor')
 check('new login cannot reactivate revoked device',fetch('/device-proof/begin',{'binding':editor['binding']},csrf_editor)['status']==403)
 for route in ['/directory/pin','/directory/revoke','/issueSyntheticCode']:
  check('no public control route '+route,fetch(route,{},csrf_editor)['status']==403)
 check('revocation preserves historical receipt',control('summary')['journal']['receipts']==[receipt])
 check('logout works without device proof',fetch('/logout',{},csrf_editor)['status']==200)
 check('logout removes browser session',fetch('/session')['status']==403)
 report={'checks':len(checks),'passed':checks,'artifacts':str(artifacts),'limitations':['Synthetic identities only; issuer, pins and durable device revocation use private pipes.','Firefox desktop with temporary NSS CA and TLS verification enabled.','Restart closes transport and reopens both databases; fixture process and browser crypto handles remain alive. No process crash/recovery claim.','No real account, email, manuscript, production E2EE or distributed transaction.']}
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
