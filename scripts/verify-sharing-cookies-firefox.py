"""Firefox cookie enforcement with synthetic TLS fixtures and pipe-only identity issuer."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
a=prefix.index(" subprocess.run(['npm'");b=prefix.index(" profile=artifacts/'profile'",a)
prefix=prefix[:a]+''' subprocess.run(['openssl','req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'ca-key.pem'),'-out',str(artifacts/'ca.pem'),'-days','1','-subj','/CN=WritingRoom test CA'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['openssl','req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',str(artifacts/'key.pem'),'-out',str(artifacts/'server.csr'),'-subj','/CN=WritingRoom browser fixture'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'server.ext').write_text('basicConstraints=critical,CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=serverAuth\\nsubjectAltName=IP:127.0.0.1,DNS:localhost\\n')
 subprocess.run(['openssl','x509','-req','-in',str(artifacts/'server.csr'),'-CA',str(artifacts/'ca.pem'),'-CAkey',str(artifacts/'ca-key.pem'),'-CAcreateserial','-out',str(artifacts/'cert.pem'),'-days','1','-extfile',str(artifacts/'server.ext')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 (artifacts/'key.pem').chmod(0o600);(artifacts/'ca-key.pem').chmod(0o600)
 server=subprocess.Popen(['node','scripts/fixtures/sharing-browser-server.mjs',str(artifacts)],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(artifacts/'server.log','w'),text=True)
 endpoints=json.loads(server.stdout.readline());url=endpoints['origin']+'/_synthetic/browser'
'''+prefix[b:]
prefix=prefix.replace("'network.captive-portal-service.enabled':False", "'network.cookie.cookieBehavior':0,'privacy.trackingprotection.enabled':False,'network.dns.disableIPv6':True,'network.captive-portal-service.enabled':False")
prefix=prefix.replace('document.getElementById("libraryEmpty") && !document.getElementById("libraryEmpty").classList.contains("hidden")','document.title==="Fixture HTTPS sintética"')
prefix=prefix.replace("profile.mkdir();(artifacts/'downloads').mkdir()", "profile.mkdir();(artifacts/'downloads').mkdir()\n subprocess.run(['certutil','-N','-d','sql:'+str(profile),'--empty-password'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)\n subprocess.run(['certutil','-A','-d','sql:'+str(profile),'-n','writingroom-fixture','-t','C,,','-i',str(artifacts/'ca.pem')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)")
prefix=prefix.replace("'acceptInsecureCerts':True", "'acceptInsecureCerts':False")
body='''
 checks=[]
 def control(action,**args):
  server.stdin.write(json.dumps({'action':action,**args})+'\\n');server.stdin.flush()
  return json.loads(server.stdout.readline())
 def check(name,value):
  assert value,name
  checks.append(name)
 def fetch(route,body=None,csrf=None,origin=None,mode=None):
  options={'method':'GET' if body is None else 'POST','credentials':'include'}
  if body is not None:options.update({'headers':{'Content-Type':'application/json'},'body':json.dumps(body)})
  if csrf:options.setdefault('headers',{})['X-CSRF-Token']=csrf
  if mode:options['mode']=mode
  target=(origin or endpoints['origin'])+route
  js('window.fixtureResult=null;fetch('+json.dumps(target)+','+json.dumps(options)+').then(async r=>{window.fixtureResult={status:r.status,body:await r.json(),setCookie:r.headers.get("set-cookie")};}).catch(()=>{window.fixtureResult={blocked:true};});return true;')
  for _ in range(100):
   result=js('return window.fixtureResult;')
   if result is not None:return result
   time.sleep(.05)
  raise RuntimeError('Fetch timeout')
 start=fetch('/synthetic/login/start',{'device':'laptop'})
 check('same-origin login start',start.get('status')==200)
 code=control('issue',input={'subject':'editor','device':'laptop','state':start['body']['state']})['code']
 complete=fetch('/synthetic/login/complete',{'state':start['body']['state'],'code':code},start['body']['csrf'])
 check('same-origin login complete',complete.get('status')==200)
 csrf=complete['body']['csrf']
 check('Set-Cookie is filtered from page JavaScript',complete['setCookie'] is None)
 check('HttpOnly session absent from document.cookie','__Host-wroom_synthetic' not in js('return document.cookie;'))
 cookies=command('WebDriver:GetCookies');cookies=cookies.get('value',cookies) if isinstance(cookies,dict) else cookies
 session=next(c for c in cookies if c['name']=='__Host-wroom_synthetic')
 check('browser stores Secure HttpOnly SameSite=Lax',session['secure'] and session['httpOnly'] and session['sameSite'].lower()=='lax')
 check('host cookie uses root path',session['path']=='/' and session['domain']=='127.0.0.1')
 check('native same-origin GET session works without forged Origin',fetch('/session').get('body',{}).get('subject')=='editor')
 check('mutation without CSRF denied',fetch('/logout',{}).get('status')==403)
 check('mutation with wrong CSRF denied',fetch('/logout',{},'x'*43).get('status')==403)
 check('denied mutations preserve session',fetch('/session').get('status')==200)
 js('document.cookie="__Host-wroom_synthetic=forged; Path=/; Secure; SameSite=Lax";document.cookie="__Host-invalid=forged; Path=/";return true;')
 check('JavaScript cannot overwrite HttpOnly session',fetch('/session').get('status')==200)
 cookie_state=command('WebDriver:GetCookies');cookie_state=cookie_state.get('value',cookie_state) if isinstance(cookie_state,dict) else cookie_state
 check('browser rejects __Host cookie without Secure',not any(c['name']=='__Host-invalid' for c in cookie_state))

 # A non-HttpOnly control can be observed by JS, unlike the session.
 js('document.cookie="control_none=fixture; Path=/; SameSite=None; Secure";return true;')
 check('control cookie visible to JavaScript','control_none=fixture' in js('return document.cookie;'))
 before=control('summary')['events']
 command('WebDriver:Navigate',{'url':endpoints['cross']})
 check('cross-site document cannot read host session','__Host-wroom_synthetic' not in js('return document.cookie;'))
 control('clear')
 cross=fetch('/logout',{},csrf)
 check('cross-site credentialed JSON mutation blocked',cross.get('blocked') is True)
 check('cross-site attack leaves durable events intact',control('summary')['events']==before)
 # Simple no-cors POST bypasses preflight: inspect actual cookie presence at destination.
 control('clear')
 js('window.fixtureResult=null;fetch('+json.dumps(endpoints['origin']+'/logout')+',{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"text/plain"},body:"{}"}).then(()=>window.fixtureResult=true).catch(()=>window.fixtureResult=true);return true;')
 for _ in range(100):
  if js('return window.fixtureResult===true;'):break
  time.sleep(.05)
 seen=[e for e in control('observations') if e.get('path')=='/logout' and e.get('method')=='POST']
 check('simple cross-site POST reaches transport',len(seen)>0)
 check('SameSite=Lax withholds session on cross-site POST',all(not e['hasSessionCookie'] for e in seen))
 check('SameSite=None control is sent on cross-site POST',any(e['hasControlCookie'] for e in seen))
 control('clear')
 js('location.href='+json.dumps(endpoints['origin']+'/session')+';return true;')
 for _ in range(100):
  if js('return location.pathname==="/session" && document.body.textContent.includes("DENIED");'):break
  time.sleep(.05)
 nav=[e for e in control('observations') if e.get('path')=='/session']
 check('Lax permits cookie on cross-site top-level GET',any(e['hasSessionCookie'] and e['site']=='cross-site' for e in nav))
 check('cross-site top-level GET still denied by transport','DENIED' in js('return document.body.textContent;'))

 # Browser tracking protection may also withhold the SameSite=None control; do not infer causation from it alone.
 command('WebDriver:Navigate',{'url':url})
 check('cross-site attempts did not log out session',fetch('/session').get('status')==200)

 command('WebDriver:Navigate',{'url':endpoints['sameSite']})
 control('clear')
 js('window.fixtureResult=null;fetch('+json.dumps(endpoints['origin']+'/logout')+',{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"text/plain"},body:"{}"}).then(()=>window.fixtureResult=true).catch(()=>window.fixtureResult=true);return true;')
 for _ in range(100):
  if js('return window.fixtureResult===true;'):break
  time.sleep(.05)
 same=[e for e in control('observations') if e.get('path')=='/logout' and e.get('method')=='POST']
 check('same-site other origin sends Lax cookie',any(e['hasSessionCookie'] and e['site']=='same-site' for e in same))
 command('WebDriver:Navigate',{'url':url})
 check('Origin guard prevents same-site other-origin logout',fetch('/session').get('status')==200)
 # Secure transport is tested on loopback; browsers may grant localhost-specific exceptions.
 control('clear');command('WebDriver:Navigate',{'url':endpoints['plain']})
 observations=control('observations');plain_cookie=any(e.get('cookie') for e in observations);plain_session=any(e.get('hasSessionCookie') for e in observations)
 command('WebDriver:Navigate',{'url':url})
 check('logout with browser-bound CSRF succeeds',fetch('/logout',{},csrf).get('status')==200)
 check('logout clears browser session cookie',fetch('/session').get('status')==403)
 check('HttpOnly cookie removed after logout',not any(c['name']=='__Host-wroom_synthetic' for c in (lambda r:r.get('value',r) if isinstance(r,dict) else r)(command('WebDriver:GetCookies'))))
 report={'checks':len(checks),'passed':checks,'plain_loopback_cookie_observed':plain_cookie,'plain_loopback_session_cookie_observed':plain_session,'artifacts':str(artifacts),'limitations':['Firefox desktop only; temporary fixture certificate trusted only in isolated Firefox NSS profile; TLS validation enabled.','Loopback Secure exceptions and tracking protection prevent generalizing to public hosts.']}
 (artifacts/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print(json.dumps(report,ensure_ascii=False))
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
