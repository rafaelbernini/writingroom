"""Offline HPKE vectors and Node/Firefox interoperability with synthetic in-memory keys."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0]
a=prefix.index(" subprocess.run(['npm'");b=prefix.index(" profile=artifacts/'profile'",a)
prefix=prefix[:a]+''' subprocess.run(['./node_modules/.bin/esbuild','scripts/fixtures/hpke-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(artifacts/'proof.js')],cwd=root,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 server=subprocess.Popen(['node','scripts/fixtures/hpke-browser-server.mjs',str(artifacts)],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(artifacts/'server.log','w'),text=True)
 endpoints=json.loads(server.stdout.readline());url=endpoints['url']
'''+prefix[b:]
prefix=prefix.replace('document.getElementById("libraryEmpty") && !document.getElementById("libraryEmpty").classList.contains("hidden")','window.proof && window.runVectors')
body='''
 checks=[]
 def check(name,value):
  assert value,name
  checks.append(name)
 def control(payload):
  server.stdin.write(json.dumps(payload)+'\\n');server.stdin.flush();return json.loads(server.stdout.readline())
 def run(expression):
  js('window.result=null;Promise.resolve().then(async()=>('+expression+')).then(v=>window.result={ok:true,value:v}).catch(e=>window.result={ok:false,error:e.message});return true;')
  for _ in range(100):
   value=js('return window.result;')
   if value is not None:
    if not value['ok']:raise RuntimeError(value['error'])
    return value.get('value')
   time.sleep(.05)
  raise RuntimeError('Timeout')
 check('Firefox decrypts all 257 RFC9180 sequence vectors',run('window.runVectors()')==257)
 run('(window.recipient=await proof.createProofRecipient(),true)')
 card=run('proof.publicProofCard(window.recipient.publicKey)')
 sealed=control({'action':'seal','card':card})
 assert 'error' not in sealed, 'Node could not seal synthetic envelope'
 assert sealed['context']==js('return window.scope;'), 'Context mismatch'
 assert sealed['recipient_fingerprint']==card['fingerprint'], 'Fingerprint mismatch'
 opened=run('new TextDecoder().decode(await proof.openProof(window.recipient,'+json.dumps(sealed)+',window.scope))')
 check('Node to Firefox recipient encryption',opened=='Conteúdo sintético Node → Firefox')
 sealed_browser=run('proof.sealProof('+json.dumps(endpoints['card'])+',new TextEncoder().encode("Conteúdo sintético Firefox → Node"),window.scope)')
 check('Firefox to Node recipient encryption',control({'action':'open','envelope':sealed_browser}).get('text')=='Conteúdo sintético Firefox → Node')
 check('browser private key is non-extractable',js('return window.recipient.privateKey.extractable===false;'))
 check('wrong device context rejects in browser',run('(async()=>{try{await proof.openProof(window.recipient,'+json.dumps(sealed)+',{...window.scope,device:"other"});return false;}catch{return true;}})()'))
 changed=dict(sealed_browser);changed['ciphertext']=('A' if changed['ciphertext'][0]!='A' else 'B')+changed['ciphertext'][1:]
 check('browser ciphertext tampering rejected by Node',control({'action':'open','envelope':changed}).get('error')=='REJECTED')

 binding=control({'action':'bind','card':card})
 verified=run('bindingProof.verifyDeviceBinding('+json.dumps(binding)+',{subject:"editor-1",device:"device-1",identityFingerprint:'+json.dumps(endpoints['identityFingerprint'])+'})')
 check('Firefox verifies Node Ed25519 device binding',verified.get('payload',{}).get('device')=='device-1')
 check('signature without possession cannot activate',control({'action':'authorize','binding':binding}).get('error')=='REJECTED')
 challenge=control({'action':'challenge','binding':binding})
 response=run('bindingProof.answerDeviceChallenge(window.recipient,'+json.dumps(binding)+','+json.dumps(challenge)+',{subject:"editor-1",device:"device-1",identityFingerprint:'+json.dumps(endpoints['identityFingerprint'])+'})')
 check('Firefox possession response activates Node verifier',control({'action':'confirm','response':response}).get('device')=='device-1')
 check('possession response replay is denied',control({'action':'confirm','response':response}).get('error')=='REJECTED')
 control({'action':'revoke','hash':challenge['binding_hash']})
 check('device revocation blocks later authorization',control({'action':'authorize','binding':binding}).get('error')=='REJECTED')
 report={'checks':len(checks),'passed':checks,'rfc_ciphertexts':257,'artifacts':str(artifacts),'limits':['Only synthetic pinned identity/device binding; no real identity, durable revocation, recovery or production E2EE.','Firefox desktop and Node only; no mobile or cross-library sender implementation.']}
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
