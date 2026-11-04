import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createSyntheticAuthority} from '../../sharing-spike/src/authorization.mjs';
import {createDurableDeviceDirectory} from '../../sharing-spike/src/durable-device-directory.mjs';
import {startSyntheticHttpsTransport} from '../../sharing-spike/src/https-transport.mjs';
import {startOidcFixtureHttpsProvider} from '../../sharing-spike/src/oidc-fixture-https.mjs';
import {fixtureOidcConfig} from '../../sharing-spike/src/oidc-fixture-config.mjs';
let sqlite,openssl;try{sqlite=await import('node:sqlite');execFileSync('openssl',['version'],{stdio:'ignore'});openssl=true;}catch{}
const check=(name,fn)=>test(name,{skip:(!sqlite||!openssl)&&'SQLite e openssl necessários.'},fn);
async function fixture(t){
 const base=await mkdtemp(path.join(tmpdir(),'wroom-oidc-https-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const key=path.join(base,'key.pem'),cert=path.join(base,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=WritingRoom OIDC fixture','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});await chmod(key,0o600);
 const tls={key:await readFile(key),cert:await readFile(cert)},identities=['owner','editor'],authority=createSyntheticAuthority({identities});
 authority.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'}]});
 const directory=await createDurableDeviceDirectory(path.join(base,'directory.sqlite'),[{subject:'owner',fingerprint:'a'.repeat(64)}]);t.after(()=>directory.close());
 const observations=[];const issuer=await startOidcFixtureHttpsProvider({tls,ca:tls.cert,observe:e=>observations.push(e)});t.after(()=>issuer.close());
 const options={authority,directory,identities,tls,enableBrowserFixture:true,oidcFixture:{issuer:issuer.issuer,accounts:[{sub:'owner-sub',subject:'owner'},{sub:'editor-sub',subject:'editor'}],createProvider:origin=>issuer.configure(origin)}};
 let transport=await startSyntheticHttpsTransport(options);t.after(()=>transport.close());
 function request(url,{body,method=body===undefined?'GET':'POST',headers={},raw,ca=tls.cert}={}){
  const target=new URL(url),content=raw??(body===undefined?undefined:JSON.stringify(body));
  return new Promise((resolve,reject)=>{
   const req=https.request(target,{method,ca,agent:false,lookup:(_h,o,cb)=>cb(null,o.all?[{address:'127.0.0.1',family:4}]:'127.0.0.1',4),headers:{...(body===undefined?{}:{'content-type':'application/json',origin:transport.origin}),...headers}},res=>{
    const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,text,body:res.headers['content-type']?.includes('application/json')?JSON.parse(text):null});});res.on('error',reject);
   });req.on('error',reject);req.end(content);
  });
 }
 const navigateHeaders={'sec-fetch-mode':'navigate','sec-fetch-dest':'document','sec-fetch-site':'cross-site'};
 async function begin(){const r=await request(transport.origin+'/oidc/login/start',{body:{device:'laptop'}});assert.equal(r.status,200);return {url:r.body.authorizationUrl,cookie:r.headers['set-cookie'][0].split(';')[0]};}
 const callback=(url,cookie,headers={})=>request(url,{headers:{...navigateHeaders,cookie,...headers}});
 async function authorize(a,control={}){issuer.authorize({authorizationUrl:a.url,sub:'owner-sub',...control});const r=await request(a.url);assert.equal(r.status,302);return r.headers.location;}
 async function login(){const a=await begin(),url=await authorize(a),r=await callback(url,a.cookie);assert.equal(r.status,303);return {cookie:r.headers['set-cookie'].find(c=>c.startsWith('__Host-wroom_synthetic=')).split(';')[0],reply:r,url};}
 return {base,tls,issuer,options,observations,request,begin,authorize,callback,login,get transport(){return transport;},async restart(){const fixturePort=Number(new URL(transport.origin).port);await transport.close();transport=await startSyntheticHttpsTransport({...options,fixturePort});}};
}
check('OIDC HTTPS follows prepared authorization, verified TLS backchannel and clean callback redirect',async t=>{
 const f=await fixture(t),client=await f.login();
 assert.equal(client.reply.headers.location,'/_synthetic/browser');assert.equal(client.reply.text,'');assert.equal(client.reply.headers['cache-control'],'no-store');assert.equal(client.reply.headers['referrer-policy'],'no-referrer');
 assert.match(client.reply.headers['set-cookie'].find(c=>c.startsWith('__Host-wroom_oidc_login=')),/Max-Age=0/);
 assert.ok(f.observations.some(e=>e.path==='/token'&&e.method==='POST'));assert.ok(f.observations.every(e=>!e.path.includes('?')));
 const headers={cookie:client.cookie,'sec-fetch-site':'same-origin'};
 const result=await f.request(f.transport.origin+'/oidc/result',{headers});assert.equal(result.status,200);assert.ok(result.body.csrf);assert.equal(result.body.id_token,undefined);
 assert.equal((await f.request(f.transport.origin+'/oidc/result',{headers})).status,403);
 assert.equal((await f.request(f.transport.origin+'/session',{headers})).body.subject,'owner');
 assert.equal((await f.request(f.transport.origin+'/access/check',{body:{projectId:'book',sceneId:'one',action:'read'},headers:{...headers,'x-csrf-token':result.body.csrf}})).status,403);
 assert.equal((await f.callback(client.url,client.cookie)).status,403);
 assert.equal(f.transport.issueSyntheticCode,undefined);
});
check('OIDC HTTPS callback exception is limited to top-level navigation and cannot weaken mutation guards',async t=>{
 const f=await fixture(t),a=await f.begin(),url=await f.authorize(a);
 for(const headers of [{'sec-fetch-mode':'cors'},{'sec-fetch-dest':'iframe'},{origin:f.issuer.issuer},{authorization:'Bearer forged'},{host:'localhost:'+new URL(f.transport.origin).port}])assert.equal((await f.callback(url,a.cookie,headers)).status,403);
 assert.equal((await f.request(url,{headers:{cookie:a.cookie}})).status,403);
 assert.equal((await f.request(url,{method:'POST',headers:{cookie:a.cookie}})).status,403);
 assert.equal((await f.callback(url,a.cookie)).status,303);
 assert.equal((await f.request(f.transport.origin+'/oidc/login/start',{body:{device:'laptop'},headers:{origin:f.issuer.issuer,'sec-fetch-site':'cross-site'}})).status,403);
 for(const route of ['/synthetic/login/start','/synthetic/login/complete','/directory/pin','/issueSyntheticCode'])assert.equal((await f.request(f.transport.origin+route,{body:{}})).status,403);
});
check('OIDC HTTPS crossed prelogin cookie, extra/duplicate callback fields and issuer mix-up fail closed',async t=>{
 const f=await fixture(t),a=await f.begin(),b=await f.begin(),url=await f.authorize(a);
 assert.equal((await f.callback(url,b.cookie)).status,403);
 assert.equal((await f.callback(url,a.cookie+'; '+a.cookie)).status,403);
 for(const edit of [u=>u.searchParams.set('iss',f.transport.origin),u=>u.searchParams.append('state','x'.repeat(43)),u=>u.searchParams.set('subject','owner')]){const u=new URL(url);edit(u);assert.equal((await f.callback(u.href,a.cookie)).status,403);}
 assert.equal((await f.callback(url,a.cookie)).status,303);
});
check('OIDC issuer HTTP routes cannot choose identity, expose control or accept browser token requests',async t=>{
 const f=await fixture(t),a=await f.begin();assert.equal((await f.request(a.url)).status,403);
 for(const suffix of ['/authorize?subject=owner','/issue','/configure','/jwks','/.well-known/openid-configuration'])assert.equal((await f.request(f.issuer.issuer+suffix)).status,403);
 const data='grant_type=authorization_code&client_id=x&redirect_uri=x&code=x&code_verifier=x';
 for(const [raw,headers]of [[data,{origin:f.transport.origin}],[data+'&code=x',{}],[data,{'content-type':'text/plain'}]])assert.equal((await f.request(f.issuer.issuer+'/token',{method:'POST',raw,headers:{'content-type':'application/x-www-form-urlencoded',...headers}})).status,403);
});
check('OIDC HTTPS rejects bad signed claims and never returns tokens or a session cookie on failure',async t=>{
 const f=await fixture(t),a=await f.begin(),url=await f.authorize(a,{claims:{nonce:'x'.repeat(43)}}),r=await f.callback(url,a.cookie);
 assert.equal(r.status,403);assert.deepEqual(r.body,{error:'DENIED',mode:'SYNTHETIC_ONLY'});assert.ok(!r.headers['set-cookie'].some(c=>c.startsWith('__Host-wroom_synthetic=')));assert.equal(r.text.includes('id_token'),false);
});
check('OIDC HTTPS restart discards pending callbacks, session and one-use result',async t=>{
 const f=await fixture(t),client=await f.login(),a=await f.begin(),url=await f.authorize(a);await f.restart();
 assert.equal((await f.callback(url,a.cookie)).status,403);
 for(const route of ['/session','/oidc/result'])assert.equal((await f.request(f.transport.origin+route,{headers:{cookie:client.cookie,'sec-fetch-site':'same-origin'}})).status,403);
 assert.equal((await f.login()).reply.status,303);
});
check('OIDC fixture config only admits reserved origins or exact TLS loopback hosts and requires fixture mode',async t=>{
 for(const [issuer,origin]of [['https://example.com','https://127.0.0.1:1234'],['https://localhost:1234/','https://127.0.0.1:1235'],['http://localhost:1234','https://127.0.0.1:1235'],['https://localhost:1234','https://127.0.0.1:1235/'],['https://localhost.evil:1234','https://127.0.0.1:1235']])assert.throws(()=>fixtureOidcConfig(issuer,origin),/OIDC_FIXTURE_CONFIG_REQUIRED/);
 const f=await fixture(t);await assert.rejects(startSyntheticHttpsTransport({...f.options,enableBrowserFixture:false}),/OIDC_HTTPS_FIXTURE_REQUIRED/);await assert.rejects(startSyntheticHttpsTransport({...f.options,directory:undefined}),/OIDC_HTTPS_FIXTURE_REQUIRED/);
});
check('OIDC TLS backchannel rejects a certificate outside its explicit trust instead of disabling verification',async t=>{
 const f=await fixture(t),otherKey=path.join(f.base,'other-key.pem'),otherCert=path.join(f.base,'other-cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',otherKey,'-out',otherCert,'-days','1','-subj','/CN=Untrusted test CA'],{stdio:'ignore'});
 const issuer=await startOidcFixtureHttpsProvider({tls:f.tls,ca:await readFile(otherCert)});t.after(()=>issuer.close());
 const transport=await startSyntheticHttpsTransport({...f.options,oidcFixture:{...f.options.oidcFixture,issuer:issuer.issuer,createProvider:origin=>issuer.configure(origin)}});t.after(()=>transport.close());
 const start=await f.request(transport.origin+'/oidc/login/start',{body:{device:'laptop'},headers:{origin:transport.origin}});assert.equal(start.status,200);
 const url=issuer.callback({authorizationUrl:start.body.authorizationUrl,sub:'owner-sub'});
 assert.equal((await f.callback(url,start.headers['set-cookie'][0].split(';')[0])).status,403);
});
check('OIDC token backchannel enforces a total TLS deadline and returns generic denial',async t=>{
 const f=await fixture(t);
 // Stall the real TLS handshake; the client deadline must abort rather than wait indefinitely.
 const issuer=await startOidcFixtureHttpsProvider({tls:{...f.tls,SNICallback:(_name,_done)=>{}},ca:f.tls.cert});t.after(()=>issuer.close());
 const transport=await startSyntheticHttpsTransport({...f.options,oidcFixture:{...f.options.oidcFixture,issuer:issuer.issuer,createProvider:origin=>issuer.configure(origin)}});t.after(()=>transport.close());
 const start=await f.request(transport.origin+'/oidc/login/start',{body:{device:'laptop'},headers:{origin:transport.origin}});assert.equal(start.status,200);
 const url=issuer.callback({authorizationUrl:start.body.authorizationUrl,sub:'owner-sub'}),reply=await f.callback(url,start.headers['set-cookie'][0].split(';')[0]);
 assert.equal(reply.status,403);assert.deepEqual(reply.body,{error:'DENIED',mode:'SYNTHETIC_ONLY'});
});
check('OIDC real HTTPS token endpoint requires PKCE and consumes a code exactly once',async t=>{
 const f=await fixture(t),a=await f.begin(),u=new URL(a.url),verifier='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
 u.searchParams.set('code_challenge','E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
 const callback=f.issuer.callback({authorizationUrl:u.href,sub:'owner-sub'}),code=new URL(callback).searchParams.get('code');
 const raw=new URLSearchParams({grant_type:'authorization_code',client_id:'writingroom-fixture',redirect_uri:f.transport.origin+'/oidc/callback',code,code_verifier:verifier}).toString();
 const options={method:'POST',raw,headers:{'content-type':'application/x-www-form-urlencoded'}};
 const result=await f.request(f.issuer.issuer+'/token',options);assert.equal(result.status,200);assert.ok(result.body.id_token);assert.equal(result.headers['cache-control'],'no-store');
 assert.equal((await f.request(f.issuer.issuer+'/token',options)).status,403);
});
check('OIDC one-use result is bound to a live session and same origin, without consuming another session result',async t=>{
 const f=await fixture(t),one=await f.login(),a=await f.begin(),url=await f.authorize(a,{sub:'editor-sub'}),two=await f.callback(url,a.cookie);
 assert.equal(two.status,303);const twoCookie=two.headers['set-cookie'].find(c=>c.startsWith('__Host-wroom_synthetic=')).split(';')[0];
 const target=f.transport.origin+'/oidc/result';
 for(const headers of [{cookie:one.cookie,'sec-fetch-site':'cross-site'},{cookie:one.cookie,origin:f.issuer.issuer},{'sec-fetch-site':'same-origin'}])assert.equal((await f.request(target,{headers})).status,403);
 const first=await f.request(target,{headers:{cookie:one.cookie,'sec-fetch-site':'same-origin'}}),second=await f.request(target,{headers:{cookie:twoCookie,'sec-fetch-site':'same-origin'}});
 assert.equal(first.status,200);assert.equal(second.status,200);assert.notEqual(first.body.csrf,second.body.csrf);
});
