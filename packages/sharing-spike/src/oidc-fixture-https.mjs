// Isolated HTTPS provider: identities may only be selected by private test controls.
import https from 'node:https';
import {createHash} from 'node:crypto';
import {createOidcFixtureProvider} from './oidc-fixture-provider.mjs';
import {parsePackageJSON} from '../../core/src/editorial-package.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=()=>{throw new Error('OIDC_FIXTURE_HTTPS_REJECTED');};
export async function startOidcFixtureHttpsProvider({tls,ca,now=Date.now,observe}={}){
 if(!tls?.key||!tls?.cert||!ca)fail();
 let issuer,provider,closed=false,bucket={expires:0,count:0};const prepared=new Map();
 const headers={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Connection':'close'};
 const deny=res=>{res.writeHead(403,{...headers,'Content-Type':'application/json'});res.end('{"error":"DENIED","mode":"SYNTHETIC_ONLY"}');};
 const server=https.createServer({...tls,minVersion:'TLSv1.2',maxHeaderSize:8192,requestTimeout:3000,headersTimeout:3000},async(req,res)=>{
  try{
   if(typeof observe==='function')observe({path:req.url.split('?')[0],method:req.method,site:req.headers['sec-fetch-site']||'',hasCookie:Boolean(req.headers.cookie)});
   if(now()>=bucket.expires)bucket={expires:now()+60000,count:0};if(++bucket.count>120)return deny(res);
   const seen=new Set();for(let i=0;i<req.rawHeaders.length;i+=2){const k=req.rawHeaders[i].toLowerCase();if(seen.has(k))return deny(res);seen.add(k);}
   if(!provider||req.headers.host!==new URL(issuer).host||req.headers.authorization||req.headers['content-encoding']||req.headers.expect)return deny(res);
   if(req.method==='GET'&&req.url.startsWith('/authorize?')){
    if(req.url.length>4096||req.headers['transfer-encoding']||Number(req.headers['content-length']||0)!==0)return deny(res);
    const key=hash(issuer+req.url),p=prepared.get(key);if(!p||now()>=p.expires)return deny(res);prepared.delete(key);
    res.writeHead(302,{...headers,Location:p.callback});return res.end();
   }
   if(req.method!=='POST'||req.url!=='/token'||req.headers.origin||req.headers.cookie||req.headers['content-type']!=='application/x-www-form-urlencoded'||Number(req.headers['content-length']||0)>8192)return deny(res);
   let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>8192)return deny(res);chunks.push(c);}
   const q=new URLSearchParams(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
   if([...q.keys()].length!==5||new Set(q.keys()).size!==5)return deny(res);
   const reply=await provider.exchange(Object.fromEntries(q));
   res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(reply));
  }catch{if(!res.headersSent&&!res.destroyed)deny(res);else res.destroy();}
 });
 server.maxConnections=32;server.setTimeout(3000,s=>s.destroy());server.on('upgrade',(_r,s)=>s.destroy());
 server.on('checkContinue',(_r,res)=>deny(res));server.on('checkExpectation',(_r,res)=>deny(res));
 server.on('clientError',(_e,s)=>s.destroy());
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 issuer=`https://localhost:${server.address().port}`;
 async function exchange(input){
  if(closed)fail();const raw=new URLSearchParams(structuredClone(input)).toString();
  return new Promise((resolve,reject)=>{
   const req=https.request(issuer+'/token',{method:'POST',ca,agent:false,lookup:(_hostname,options,callback)=>callback(null,options.all?[{address:'127.0.0.1',family:4}]:'127.0.0.1',4),headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(raw)}},res=>{
    let size=0;const chunks=[];res.on('data',chunk=>{size+=chunk.length;if(size>16384)req.destroy(new Error('LIMIT'));else chunks.push(chunk);});
    res.on('error',()=>reject(new Error('OIDC_FIXTURE_HTTPS_REJECTED')));
    res.on('end',()=>{try{if(res.statusCode!==200||res.headers['content-type']!=='application/json')fail();resolve(parsePackageJSON(Buffer.concat(chunks).toString('utf8'),16384));}catch{reject(new Error('OIDC_FIXTURE_HTTPS_REJECTED'));}});
   });
   // Total deadline includes DNS/connect/TLS/response, not only socket inactivity.
   const timer=setTimeout(()=>req.destroy(new Error('DEADLINE')),2000);timer.unref();
   req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(new Error('OIDC_FIXTURE_HTTPS_REJECTED')));req.end(raw);
  });
 }
 return Object.freeze({issuer,
  async configure(origin){if(closed)fail();prepared.clear();provider=await createOidcFixtureProvider({now,issuer,origin});return Object.freeze({mode:provider.mode,metadata:structuredClone(provider.metadata),exchange});},
  authorize(input){if(!provider||closed)fail();for(const [k,p]of prepared)if(now()>=p.expires)prepared.delete(k);if(prepared.size>=100)fail();const callback=provider.authorize(input);prepared.set(hash(input.authorizationUrl),{callback,expires:now()+60000});return {ok:true};},
  // Private negative-test control can produce a callback without visiting the authorization endpoint.
  callback(input){if(!provider||closed)fail();return provider.authorize(input);},
  close(){closed=true;prepared.clear();provider=undefined;server.closeAllConnections();return new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 });
}
