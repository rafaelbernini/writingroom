// Synthetic-only loopback TLS transport. No CLI, production issuer or manuscripts.
// Constant browser fixture document and observations require explicit test-only opt-in.
import https from 'node:https';
import { createOidcFixtureSessionHarness } from './oidc-fixture-session.mjs';
import { createDeviceBoundSessionHarness } from './device-bound-session.mjs';
import { createSyntheticSessionHarness } from './session-harness.mjs';
import { parsePackageJSON } from '../../core/src/editorial-package.mjs';
const MAX_BODY = 16_384;
const routes = new Map([
 ['/synthetic/login/start', ['device']], ['/synthetic/login/complete', ['state','code']],
 ['/device-proof/begin', ['binding']], ['/device-proof/confirm', ['response']],
 ['/operations/context', []], ['/operations/execute', ['operationId','journalDomain','directoryDomain','action','input']], ['/operations/reconcile', ['operationId','journalDomain','directoryDomain','action','input']],
 ['/logout', []], ['/devices/revoke', ['device']],
 ['/invitations/create', ['projectId','recipient','scope','capabilities','expiresAt']],
 ['/invitations/preview', ['token']], ['/invitations/accept', ['token','explicit']],
 ['/invitations/revoke', ['projectId','invitationId']], ['/access/check', ['projectId','sceneId','action']]
]);
const uniqueHeaders = new Set(['host','origin','cookie','x-csrf-token','content-type','content-length','transfer-encoding']);
export async function startSyntheticHttpsTransport({ authority, identities, directory, tls, now = Date.now, enableBrowserFixture = false, observeBrowserFixture, fixturePort = 0, browserFixtureScript, oidcFixture, shouldDropOperationResponse } = {}) {
 if(!Number.isInteger(fixturePort)||fixturePort<0||fixturePort>65535||(fixturePort!==0&&!enableBrowserFixture))throw new Error('SYNTHETIC_FIXTURE_PORT_REQUIRED');
 if(shouldDropOperationResponse!==undefined&&(!enableBrowserFixture||typeof shouldDropOperationResponse!=='function'))throw new Error('OPERATION_DROP_FIXTURE_REQUIRED');
 if(oidcFixture&&(!enableBrowserFixture||!directory||typeof oidcFixture.createProvider!=='function'))throw new Error('OIDC_HTTPS_FIXTURE_REQUIRED');
 if(authority?.mode!=='SYNTHETIC_ONLY'||!tls?.key||!tls?.cert)throw new Error('SYNTHETIC_TLS_REQUIRED');
 let harness, origin;
 let bucket={count:0,expires:0};
 function send(res,status,body,headers={}) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
   'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'", 'Referrer-Policy':'no-referrer',
   'Connection':'close', ...headers }); res.end(JSON.stringify(body));
 }
 function denied(res,status=403) {send(res,status,{error:'DENIED',mode:'SYNTHETIC_ONLY'});}
 const server=https.createServer({key:tls.key,cert:tls.cert,minVersion:'TLSv1.2',maxHeaderSize:8192,requestTimeout:5000,headersTimeout:5000},async(req,res)=>{
  try {
   if(enableBrowserFixture&&typeof observeBrowserFixture==='function')observeBrowserFixture({path:req.url.split('?')[0],method:req.method,site:req.headers['sec-fetch-site']||'',hasSessionCookie:/(?:^|;\s*)__Host-wroom_synthetic=/.test(req.headers.cookie||''),hasLoginCookie:/(?:^|;\s*)__Host-wroom_oidc_login=/.test(req.headers.cookie||''),hasControlCookie:/(?:^|;\s*)control_none=/.test(req.headers.cookie||'')});
   const time=now();if(time>=bucket.expires)bucket={count:0,expires:time+60_000};
   if(++bucket.count>120)return denied(res,429);
   if(req.rawHeaders.length>128)return denied(res,400);
   const counts=new Map();for(let i=0;i<req.rawHeaders.length;i+=2){const name=req.rawHeaders[i].toLowerCase();counts.set(name,(counts.get(name)||0)+1);}
   if([...uniqueHeaders].some(h=>(counts.get(h)||0)>1))return denied(res,400);
   if(enableBrowserFixture&&typeof browserFixtureScript==='string'&&req.url==='/_synthetic/proof.js'&&req.method==='GET'&&req.headers.host===new URL(origin).host){
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(browserFixtureScript);
   }
   if(enableBrowserFixture&&req.url==='/_synthetic/browser'&&req.method==='GET'&&req.headers.host===new URL(origin).host){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; connect-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer'});
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Fixture HTTPS sintética</title><h1>Teste sintético isolado</h1><p>Sem login real, manuscrito ou envio externo.</p>'+ (typeof browserFixtureScript==='string'?'<script src="/_synthetic/proof.js"></script>':'')+'</html>');
   }
   if(oidcFixture&&req.url.startsWith('/oidc/callback?')){
    if(!harness||req.headers.host!==new URL(origin).host||req.method!=='GET'||req.headers.authorization||req.headers.origin||req.headers['sec-fetch-mode']!=='navigate'||req.headers['sec-fetch-dest']!=='document'||!['cross-site','same-site','same-origin','none'].includes(req.headers['sec-fetch-site'])||req.headers['transfer-encoding']||Number(req.headers['content-length']||0)!==0)return denied(res);
    const result=await harness.dispatch({method:'GET',path:'/oidc/callback',url:origin+req.url,cookie:req.headers.cookie});
    if(result.status!==200)return send(res,result.status,result.body,result.headers);
    res.writeHead(303,{'Location':'/_synthetic/browser','Set-Cookie':result.headers['Set-Cookie'],'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Connection':'close'});return res.end();
   }
   const sameOriginRead=(req.url==='/session'||(oidcFixture&&req.url==='/oidc/result'))&&req.method==='GET'&&req.headers.origin===undefined&&req.headers['sec-fetch-site']==='same-origin';
   if(!harness||req.headers.host!==new URL(origin).host||(!sameOriginRead&&req.headers.origin!==origin)||req.headers.authorization||
      (req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'))return denied(res);
   if((req.url==='/session'||(oidcFixture&&req.url==='/oidc/result'))&&req.method==='GET'){
    if(req.headers['transfer-encoding']||Number(req.headers['content-length']||0)!==0)return denied(res,400);
    const result=await harness.dispatch({method:'GET',path:req.url,origin,cookie:req.headers.cookie});return send(res,result.status,result.body,result.headers);
   }
   const fields=oidcFixture?(req.url==='/oidc/login/start'?['device']:req.url.startsWith('/synthetic/')?undefined:routes.get(req.url)):routes.get(req.url);
   if(req.method!=='POST'||!fields)return denied(res);
   if(req.headers['content-type']!=='application/json'&&req.headers['content-type']!=='application/json; charset=utf-8')return denied(res,415);
   if(req.headers['content-encoding']||req.headers.expect)return denied(res,415);
   const declared=req.headers['content-length'];
   if(declared!==undefined&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY))return denied(res,413);
   const chunks=[];let bytes=0;
   for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BODY){denied(res,413);return;}chunks.push(chunk);}
   const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
   let body;try{body=parsePackageJSON(text,MAX_BODY);}catch{return denied(res,400);}
   if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(key=>!fields.includes(key)))return denied(res,400);
   // Peer address comes from the TLS socket. Forwarded headers never choose identity or rate bucket.
   const result=await harness.dispatch({method:'POST',path:req.url,origin,source:req.socket.remoteAddress,cookie:req.headers.cookie,csrf:req.headers['x-csrf-token'],body});
   if(req.url==='/operations/execute'&&result.status===200&&shouldDropOperationResponse?.()){res.destroy();return;}
   send(res,result.status,result.body,result.headers);
  } catch {if(!res.headersSent&&!res.destroyed)denied(res,400);else res.destroy();}
 });
 server.maxConnections=32;server.maxRequestsPerSocket=8;server.setTimeout(3000,socket=>socket.destroy());
 server.on('checkContinue',(_req,res)=>denied(res,417));server.on('checkExpectation',(_req,res)=>denied(res,417));
 server.on('upgrade',(_req,socket)=>socket.destroy());
 server.on('clientError',(_error,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');else socket.destroy();});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(fixturePort,'127.0.0.1',resolve);});
 origin=`https://127.0.0.1:${server.address().port}`;
 try {
  if(oidcFixture){const provider=await oidcFixture.createProvider(origin);harness=createOidcFixtureSessionHarness({authority,directory,identities,now,origin,issuer:oidcFixture.issuer,accounts:oidcFixture.accounts,provider,browserResult:true});}
  else harness=directory?createDeviceBoundSessionHarness({authority,identities,directory,now,origin}):createSyntheticSessionHarness({authority,identities,now,origin});
 }catch(error){server.closeAllConnections();server.close();throw error;}
 return Object.freeze({mode:'SYNTHETIC_ONLY',origin,
  // Control-plane test API, deliberately absent from routes and response payloads.
  ...(oidcFixture?{}:{issueSyntheticCode:input=>harness.issueSyntheticCode(input)}),
  close:()=>new Promise((resolve,reject)=>{harness.close?.();server.closeAllConnections();server.close(error=>error?reject(error):resolve());})
 });
}
