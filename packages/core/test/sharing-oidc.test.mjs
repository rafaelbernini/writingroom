import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SignJWT,generateKeyPair} from 'jose';
import {createOidcFixtureProvider,FIXTURE_ISSUER,FIXTURE_CLIENT,FIXTURE_REDIRECT} from '../../sharing-spike/src/oidc-fixture-provider.mjs';
import {createOidcFixtureSessionHarness} from '../../sharing-spike/src/oidc-fixture-session.mjs';
import {createSyntheticAuthority} from '../../sharing-spike/src/authorization.mjs';
import {createDurableDeviceDirectory} from '../../sharing-spike/src/durable-device-directory.mjs';
import {createProofSigner,proofSignerCard,signDeviceBinding,answerDeviceChallenge} from '../../sharing-spike/src/device-binding-proof.mjs';
import {createProofRecipient,publicProofCard} from '../../sharing-spike/src/hpke-proof.mjs';
let sqlite;try{sqlite=await import('node:sqlite');}catch{}
const check=(name,fn)=>test(name,{skip:!sqlite&&'SQLite nativo indisponível.'},fn);
const digest=v=>createHash('sha256').update(v).digest('base64url');
const denied=r=>{assert.equal(r.status,403);assert.deepEqual(r.body,{error:'DENIED',mode:'SYNTHETIC_ONLY'});assert.ok(!Array.isArray(r.headers['Set-Cookie']));};
async function fixture(t,options={}){
 let time=1_800_000_000_000;
 const now=()=>time,identities=['owner','editor'],accounts=[{sub:'owner-sub',subject:'owner'},{sub:'editor-sub',subject:'editor'}];
 const provider=await createOidcFixtureProvider({now}),authority=createSyntheticAuthority({identities,now});
 authority.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'}]});
 const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey),recipient=await createProofRecipient();
 const binding=await signDeviceBinding(signer,await publicProofCard(recipient.publicKey),{subject:'owner',device:'laptop',issuedAt:time-1000,expiresAt:time+3600000});
 const base=await mkdtemp(path.join(tmpdir(),'wroom-oidc-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const directory=await createDurableDeviceDirectory(path.join(base,'directory.sqlite'),[{subject:'owner',fingerprint:card.fingerprint}]);
 // Directory clock is supplied on open (create has no clock option).
 const {openDurableDeviceDirectory}=await import('../../sharing-spike/src/durable-device-directory.mjs');directory.close();
 const liveDirectory=await openDurableDeviceDirectory(path.join(base,'directory.sqlite'),{now});t.after(()=>liveDirectory.close());
 const build=(overrides={})=>createOidcFixtureSessionHarness({provider,accounts,authority,directory:liveDirectory,identities,now,...overrides});
 const h=build(options);t.after(()=>h.close());
 const send=(route,body={},client={},extra={},target=h)=>target.dispatch({method:'POST',origin:target.origin,source:'fixture',path:route,body,...client,...extra});
 async function begin(target=h,device='laptop'){
  const result=await send('/oidc/login/start',{device},{},{},target);assert.equal(result.status,200);
  return {url:result.body.authorizationUrl,cookie:result.headers['Set-Cookie'].split(';')[0],result};
 }
 function authorize(start,control={}){return provider.authorize({authorizationUrl:start.url,sub:'owner-sub',...control});}
 const callback=(start,url,target=h,extra={})=>send('/oidc/callback',{}, {cookie:start.cookie},{method:'GET',url,...extra},target);
 async function login(target=h,control={}){const start=await begin(target),result=await callback(start,authorize(start,control),target);assert.equal(result.status,200);return {cookie:result.headers['Set-Cookie'][0].split(';')[0],csrf:result.body.csrf,result};}
 return {h,provider,authority,directory:liveDirectory,build,send,begin,authorize,callback,login,binding,recipient,card,now,advance:n=>{time+=n;}};
}
check('OIDC fixture code flow rotates cookies and CSRF, hides verifier/tokens and still requires device possession',async t=>{
 const f=await fixture(t),start=await f.begin(),u=new URL(start.url);
 assert.equal(u.origin+u.pathname,FIXTURE_ISSUER+'/authorize');assert.equal(u.searchParams.get('redirect_uri'),FIXTURE_REDIRECT);assert.equal(u.searchParams.get('code_challenge_method'),'S256');
 assert.notEqual(u.searchParams.get('state'),u.searchParams.get('nonce'));
 assert.equal(JSON.stringify(start.result).includes('code_verifier'),false);
 assert.match(start.result.headers['Set-Cookie'],/^__Host-wroom_oidc_login=.*; Path=\/; Secure; HttpOnly; SameSite=Lax; Max-Age=300$/);
 const url=f.authorize(start),complete=await f.callback(start,url);assert.equal(complete.status,200);
 assert.match(complete.headers['Set-Cookie'][1],/Max-Age=0$/);assert.equal(JSON.stringify(complete).includes('id_token'),false);
 const client={cookie:complete.headers['Set-Cookie'][0].split(';')[0],csrf:complete.body.csrf};
 assert.equal((await f.send('/session',{},client,{method:'GET'})).body.subject,'owner');
 denied(await f.send('/access/check',{projectId:'book',sceneId:'one',action:'read'},client));
 const challenge=await f.send('/device-proof/begin',{binding:f.binding},client);assert.equal(challenge.status,200);
 const response=await answerDeviceChallenge(f.recipient,f.binding,challenge.body,{subject:'owner',device:'laptop',identityFingerprint:f.card.fingerprint,now:f.now()});
 assert.equal((await f.send('/device-proof/confirm',{response},client)).status,200);
 assert.equal((await f.send('/access/check',{projectId:'book',sceneId:'one',action:'read'},client)).status,200);
 denied(await f.callback(start,url));
});
check('OIDC callback is bound to browser cookie, not state alone; crossed attempts preserve legitimate flow',async t=>{
 const f=await fixture(t),a=await f.begin(),b=await f.begin(),url=f.authorize(a);
 denied(await f.callback(b,url));denied(await f.callback(a,url,f.h,{cookie:undefined}));
 denied(await f.callback(a,url,f.h,{cookie:a.cookie+'; '+a.cookie}));
 assert.equal((await f.callback(a,url)).status,200);
});
check('OIDC callback rejects wrong issuer/state/redirect, duplicate and unknown parameters before exchange',async t=>{
 const f=await fixture(t),a=await f.begin(),url=f.authorize(a);
 for(const change of [u=>u.searchParams.set('iss','https://attacker.invalid'),u=>u.searchParams.set('state','x'.repeat(43)),u=>u.searchParams.append('code','x'.repeat(43)),u=>u.searchParams.set('subject','owner'),u=>{u.pathname='/other';},u=>{u.hash='fragment';}]){
  const u=new URL(url);change(u);denied(await f.callback(a,u.href));
 }
 denied(await f.callback(a,url.replace('https://sharing.invalid','https://sharing.invalid.evil')));
 denied(await f.callback(a,url,f.h,{method:'POST'}));assert.equal((await f.callback(a,url)).status,200);
});
check('OIDC callbacks claim state synchronously: concurrent callbacks create only one session',async t=>{
 const f=await fixture(t),a=await f.begin(),url=f.authorize(a);
 const replies=await Promise.all([f.callback(a,url),f.callback(a,url)]);assert.deepEqual(replies.map(r=>r.status).sort(),[200,403]);
});
check('OIDC code provider enforces S256 verifier, client and exact redirect, and consumes a failed redemption',async t=>{
 const f=await fixture(t);
 for(const bad of [{code_verifier:'z'.repeat(43)},{client_id:'other'},{redirect_uri:FIXTURE_REDIRECT+'/'},{grant_type:'refresh_token'}]){
  const a=await f.begin(),u=new URL(a.url),verifier='v'.repeat(43);u.searchParams.set('code_challenge',digest(verifier));
  const url=f.provider.authorize({authorizationUrl:u.href,sub:'owner-sub'}),code=new URL(url).searchParams.get('code');
  const input={grant_type:'authorization_code',client_id:FIXTURE_CLIENT,redirect_uri:FIXTURE_REDIRECT,code,code_verifier:verifier};
  await assert.rejects(f.provider.exchange({...input,...bad}),/OIDC_FIXTURE_REJECTED/);await assert.rejects(f.provider.exchange(input),/OIDC_FIXTURE_REJECTED/);
 }
});
check('OIDC provider rejects implicit/plain PKCE and unregistered authorization redirect',async t=>{
 const f=await fixture(t),a=await f.begin();
 for(const [key,value]of [['response_type','token'],['code_challenge_method','plain'],['redirect_uri',FIXTURE_REDIRECT+'/'],['client_id','other'],['scope','openid email profile']]){
  const u=new URL(a.url);u.searchParams.set(key,value);assert.throws(()=>f.provider.authorize({authorizationUrl:u.href,sub:'owner-sub'}),/OIDC_FIXTURE_REJECTED/);
 }
});
check('OIDC rejects signed tokens with wrong issuer, audience, nonce, subject or authorized party',async t=>{
 for(const claims of [{iss:'https://other.invalid'},{aud:'other'},{aud:[FIXTURE_CLIENT,'other']},{nonce:'x'.repeat(43)},{sub:'unknown'},{azp:'other'}]){
  const f=await fixture(t),a=await f.begin();denied(await f.callback(a,f.authorize(a,{claims})));
 }
});
check('OIDC email claim must be explicitly verified and synthetic, never grants a different subject by matching email',async t=>{
 for(const claims of [{email_verified:false},{email_verified:'true'},{email_verified:null},{email:'person@example.com'},{sub:'unknown',email:'owner-sub@example.invalid'}]){
  const f=await fixture(t),a=await f.begin();denied(await f.callback(a,f.authorize(a,{claims})));
 }
 const f=await fixture(t),client=await f.login(f.h,{claims:{email:'changed@example.invalid'}});
 assert.equal((await f.send('/session',{},client,{method:'GET'})).body.subject,'owner');
});
check('OIDC signed expired, future, overlong or missing mandatory claims cannot establish a session',async t=>{
 for(const delta of [{iat:-120,exp:-60},{iat:1,exp:60},{iat:0,exp:61},{iat:0,exp:0},{iat:null,exp:60}]){
  const f=await fixture(t),a=await f.begin(),s=Math.floor(f.now()/1000),claims={iat:delta.iat===null?null:s+delta.iat,exp:s+delta.exp};denied(await f.callback(a,f.authorize(a,{claims})));
 }
 const f=await fixture(t),a=await f.begin();denied(await f.callback(a,f.authorize(a,{claims:{nonce:null}})));
});
check('OIDC does not trust another signing key, unknown kid, embedded JWK or header URLs',async t=>{
 const f=await fixture(t),alien=await createOidcFixtureProvider({now:f.now});
 const replacement={...f.provider,exchange:async input=>{
  const original=await f.provider.exchange(input),{privateKey}=await generateKeyPair('ES256');
  const payload=JSON.parse(Buffer.from(original.id_token.split('.')[1],'base64url').toString());
  return {...original,id_token:await new SignJWT(payload).setProtectedHeader({alg:'ES256',typ:'JWT',kid:f.provider.metadata.jwks.keys[0].kid}).sign(privateKey)};
 }};
 const h=f.build({provider:replacement});t.after(()=>h.close());const a=await f.begin(h);denied(await f.callback(a,f.authorize(a),h));
 for(const header of [{kid:'unknown'},{jku:'https://attacker.invalid/jwks'},{jwk:alien.metadata.jwks.keys[0]},{typ:'at+jwt'}]){
  const g=await fixture(t),b=await g.begin();denied(await g.callback(b,g.authorize(b,{header})));
 }
});
check('OIDC rejects unsigned and algorithm-confused tokens without using access tokens as identity',async t=>{
 const f=await fixture(t);
 for(const mutate of [r=>({...r,id_token:'eyJhbGciOiJub25lIn0.e30.'}),r=>({...r,id_token:r.access_token}),r=>({...r,id_token:r.id_token.slice(0,-6)+'aaaaaa'}),r=>({...r,id_token:undefined}),r=>({...r,token_type:'Other'})]){
  const h=f.build({provider:{...f.provider,exchange:async input=>mutate(await f.provider.exchange(input))}});t.after(()=>h.close());
  const a=await f.begin(h);denied(await f.callback(a,f.authorize(a),h));
 }
});
check('OIDC expiry/restart and failed token exchange invalidate the claimed flow without fallback',async t=>{
 const f=await fixture(t),a=await f.begin(),url=f.authorize(a);f.advance(60000);denied(await f.callback(a,url));denied(await f.callback(a,url));
 const b=await f.begin(),newUrl=f.authorize(b),fresh=f.build();t.after(()=>fresh.close());denied(await f.callback(b,newUrl,fresh));
 f.advance(300000);denied(await f.callback(b,newUrl));
 const g=await fixture(t),h=g.build({provider:{...g.provider,exchange:async()=>{throw new Error('private detail');}}});t.after(()=>h.close());
 const c=await g.begin(h),callback=g.authorize(c);denied(await g.callback(c,callback,h));denied(await g.callback(c,callback,h));
});
check('OIDC logout and device session revocation during token exchange prevent the later identity handoff',async t=>{
 for(const route of ['/logout','/devices/revoke']){
  const f=await fixture(t);let resume,entered,delay=false;
  const gate=new Promise(r=>{resume=r;}),started=new Promise(r=>{entered=r;});
  const h=f.build({provider:{...f.provider,exchange:async input=>{if(delay){entered();await gate;}return f.provider.exchange(input);}}});t.after(()=>h.close());
  const client=await f.login(h);delay=true;
  const a=await f.begin(h),url=f.authorize(a),promise=f.callback(a,url,h);await started;
  assert.equal((await f.send(route,route==='/logout'?{}:{device:'laptop'},client,{},h)).status,200);
  resume();denied(await promise);denied(await f.callback(a,url,h));
 }
});
check('OIDC shutdown or suspended directory during exchange cannot establish a later session',async t=>{
 for(const stop of ['close','suspend']){
  const f=await fixture(t);let resume,entered,suspended=false;
  const gate=new Promise(r=>{resume=r;}),started=new Promise(r=>{entered=r;});
  const directory={...f.directory,summary:()=>({...f.directory.summary(),suspended})};
  const h=f.build({directory,provider:{...f.provider,exchange:async input=>{entered();await gate;return f.provider.exchange(input);}}});t.after(()=>h.close());
  const a=await f.begin(h),promise=f.callback(a,f.authorize(a),h);await started;
  if(stop==='close')h.close();else suspended=true;
  resume();denied(await promise);
 }
});
check('OIDC configuration, local signing trust and account mapping are pinned, not request-driven',async t=>{
 const f=await fixture(t);
 for(const change of [{issuer:'https://real.example'},{redirectUri:'https://attacker.invalid/callback'},{clientId:'other'}])assert.throws(()=>f.build({provider:{...f.provider,metadata:{...f.provider.metadata,...change}}}),/DENIED/);
 assert.throws(()=>f.build({accounts:[{sub:'x',subject:'owner'},{sub:'x',subject:'editor'}]}),/DENIED/);
 assert.throws(()=>f.build({directory:undefined}),/DENIED/);
 denied(await f.send('/synthetic/login/start',{device:'laptop'}));
 denied(await f.send('/oidc/login/start',{device:'laptop',subject:'owner'}));
 denied(await f.send('/oidc/login/start',{device:'laptop'},{},{origin:'https://evil.invalid'}));
});

check('OIDC uses the RFC7636 S256 example and rejects code substitution between login flows',async t=>{
 const f=await fixture(t),a=await f.begin(),u=new URL(a.url),verifier='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
 assert.equal(digest(verifier),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
 u.searchParams.set('code_challenge',digest(verifier));
 const callback=f.provider.authorize({authorizationUrl:u.href,sub:'owner-sub'});
 const input={grant_type:'authorization_code',client_id:FIXTURE_CLIENT,redirect_uri:FIXTURE_REDIRECT,code:new URL(callback).searchParams.get('code'),code_verifier:verifier};
 assert.equal((await f.provider.exchange(input)).token_type,'Bearer');await assert.rejects(f.provider.exchange(input));
 const b=await f.begin(),c=await f.begin(),ub=new URL(f.authorize(b)),uc=new URL(f.authorize(c));
 ub.searchParams.set('code',uc.searchParams.get('code'));denied(await f.callback(b,ub.href));denied(await f.callback(c,uc.href));
});
check('OIDC rejects a valid HS256 signature even if the attacker knows the public signing key',async t=>{
 const f=await fixture(t),provider={...f.provider,exchange:async input=>{
  const result=await f.provider.exchange(input),payload=JSON.parse(Buffer.from(result.id_token.split('.')[1],'base64url').toString());
  return {...result,id_token:await new SignJWT(payload).setProtectedHeader({alg:'HS256',typ:'JWT',kid:f.provider.metadata.jwks.keys[0].kid}).sign(new TextEncoder().encode(JSON.stringify(f.provider.metadata.jwks.keys[0])))};
 }};
 const h=f.build({provider});t.after(()=>h.close());const a=await f.begin(h);denied(await f.callback(a,f.authorize(a),h));
});
check('OIDC reauthentication rotates the old session and cannot bypass protected Origin or CSRF',async t=>{
 const f=await fixture(t),old=await f.login(),a=await f.begin(),url=f.authorize(a);
 const complete=await f.callback(a,url,f.h,{cookie:a.cookie+'; '+old.cookie});assert.equal(complete.status,200);
 const fresh={cookie:complete.headers['Set-Cookie'][0].split(';')[0],csrf:complete.body.csrf};
 assert.notEqual(fresh.cookie,old.cookie);assert.notEqual(fresh.csrf,old.csrf);
 denied(await f.send('/session',{},old,{method:'GET'}));denied(await f.send('/logout',{},fresh,{csrf:old.csrf}));
 denied(await f.send('/logout',{},fresh,{origin:'https://attacker.invalid'}));assert.equal((await f.send('/session',{},fresh,{method:'GET'})).status,200);
});
check('OIDC ignores caller mutation during awaits and snapshots its trusted configuration',async t=>{
 const f=await fixture(t),a=await f.begin(),url=f.authorize(a);
 const request={method:'GET',path:'/oidc/callback',origin:f.h.origin,url,cookie:a.cookie};
 const result=f.h.dispatch(request);request.cookie='forged';request.url='https://attacker.invalid/';
 f.provider.metadata.jwks.keys[0].kid='replaced';
 assert.equal((await result).status,200);
});
check('OIDC bounds prelogin state and in-flight exchanges without stealing another pending login',async t=>{
 const f=await fixture(t);let resume,entered=0;
 const gate=new Promise(r=>{resume=r;});
 const h=f.build({provider:{...f.provider,exchange:async input=>{entered++;await gate;return f.provider.exchange(input);}}});t.after(()=>h.close());
 const starts=[];
 for(let n=0;n<17;n++){
  const result=await f.send('/oidc/login/start',{device:'laptop'},{},{source:'source'+n},h);assert.equal(result.status,200);
  starts.push({url:result.body.authorizationUrl,cookie:result.headers['Set-Cookie'].split(';')[0]});
 }
 const promises=starts.slice(0,16).map(a=>f.callback(a,f.authorize(a),h));
 assert.equal(entered,16);const last=starts[16],url=f.authorize(last);denied(await f.callback(last,url,h));
 resume();assert.ok((await Promise.all(promises)).every(r=>r.status===200));assert.equal((await f.callback(last,url,h)).status,200);
 for(let n=0;n<100;n++)assert.equal((await f.send('/oidc/login/start',{device:'laptop'},{},{source:'budget'+n},h)).status,200);
 denied(await f.send('/oidc/login/start',{device:'laptop'},{},{source:'overflow'},h));
});
check('OIDC journal epoch change or suspension during exchange blocks session creation',async t=>{
 for(const condition of ['epoch','suspension']){
  const f=await fixture(t);let resume,entered,suspended=false;
  const gate=new Promise(r=>{resume=r;}),started=new Promise(r=>{entered=r;});
  const authority={...f.authority,sessionEpoch:'before',summary:()=>({suspended})};
  const h=f.build({authority,provider:{...f.provider,exchange:async input=>{entered();await gate;return f.provider.exchange(input);}}});t.after(()=>h.close());
  const a=await f.begin(h),promise=f.callback(a,f.authorize(a),h);await started;
  if(condition==='epoch')authority.sessionEpoch='after';else suspended=true;
  resume();denied(await promise);
 }
});
check('OIDC login deadline is rechecked after asynchronous exchange and verification',async t=>{
 const f=await fixture(t);let resume,entered;
 const gate=new Promise(r=>{resume=r;}),started=new Promise(r=>{entered=r;});
 const h=f.build({provider:{...f.provider,exchange:async input=>{const response=await f.provider.exchange(input);entered();await gate;return response;}}});t.after(()=>h.close());
 const a=await f.begin(h),promise=f.callback(a,f.authorize(a),h);await started;f.advance(300000);resume();denied(await promise);
});
