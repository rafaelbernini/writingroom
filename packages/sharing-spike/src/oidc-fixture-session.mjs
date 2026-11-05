// Limited OIDC relying-party proof: volatile state, optional isolated TLS fixture only. Never mount in the application.
import { randomBytes,createHash } from 'node:crypto';
import { createLocalJWKSet,jwtVerify } from 'jose';
import { createSyntheticSessionHarness } from './session-harness.mjs';
import { createDeviceBoundSessionHarness } from './device-bound-session.mjs';
import { fixtureOidcConfig } from './oidc-fixture-config.mjs';
import { FIXTURE_ISSUER,FIXTURE_CLIENT } from './oidc-fixture-provider.mjs';
const fail=()=>{throw new Error('DENIED');};
const token=()=>randomBytes(32).toString('base64url');
const hash=v=>createHash('sha256').update(v).digest('base64url');
const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const LOGIN_COOKIE='__Host-wroom_oidc_login';
const loginCookie=v=>`${LOGIN_COOKIE}=${v}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${v?300:0}`;
const denied=()=>({status:403,headers:{'Cache-Control':'no-store'},body:{error:'DENIED',mode:'SYNTHETIC_ONLY'}});
function browserCookie(raw){
 if(typeof raw!=='string'||raw.length>4096)fail();const values=raw.split(';').map(p=>p.trim()).filter(p=>p.startsWith(LOGIN_COOKIE+'='));
 if(values.length!==1)fail();const v=values[0].slice(LOGIN_COOKIE.length+1);if(!opaque(v))fail();return hash(v);
}
export function createOidcFixtureSessionHarness({provider,accounts,authority,directory,identities,now=Date.now,origin='https://sharing.invalid',issuer=FIXTURE_ISSUER,browserResult=false,subjectContexts}={}){
 const config=fixtureOidcConfig(issuer,origin);
 if(browserResult&&origin==='https://sharing.invalid')fail();
 const metadata=structuredClone(provider?.metadata);
 if(provider?.mode!=='OIDC_FIXTURE_ONLY'||metadata?.issuer!==config.issuer||metadata.clientId!==FIXTURE_CLIENT||metadata.redirectUri!==config.redirectUri||metadata.authorizationEndpoint!==config.authorizationEndpoint||typeof provider.exchange!=='function')fail();
 if(!Array.isArray(accounts)||!accounts.length||accounts.length>100||accounts.some(a=>!a||Object.keys(a).sort().join(',')!=='sub,subject'||!id(a.sub)||!identities?.includes(a.subject))||new Set(accounts.map(a=>a.sub)).size!==accounts.length||new Set(accounts.map(a=>a.subject)).size!==accounts.length)fail();
 if(!Array.isArray(metadata.jwks?.keys)||metadata.jwks.keys.length!==1)fail();
 const key=metadata.jwks.keys[0];
 if(key.kty!=='EC'||key.crv!=='P-256'||key.alg!=='ES256'||key.use!=='sig'||!opaque(key.kid)||Object.keys(key).some(k=>!['kty','crv','x','y','kid','alg','use'].includes(k)))fail();
 const jwks=createLocalJWKSet(metadata.jwks),users=new Map(accounts.map(a=>[a.sub,a.subject]));
 // Multi-account contexts are supplied only by private fixture control, never request fields.
 const contexts=new Map();
 function context(subject,input){
  const {authority:a,directory:d}=input||{};
  if(a?.mode!=='SYNTHETIC_ONLY'||d?.mode!=='SYNTHETIC_ONLY')fail();
  const summary=d.summary();
  if(summary.suspended||summary.pins.length!==1||summary.pins[0].subject!==subject||summary.pins[0].revoked||!summary.expectedJournalDomain||summary.expectedJournalDomain!==a.sessionEpoch||a.summary().suspended)fail();
  for(const [other,c]of contexts)if(other!==subject&&(c.authority===a||c.directory===d||c.journalDomain===a.sessionEpoch||c.directoryDomain===summary.domain))fail();
  if(!Number.isSafeInteger(summary.trustEpoch)||summary.trustEpoch<0)fail();
  return {authority:a,directory:d,journalDomain:a.sessionEpoch,directoryDomain:summary.domain,trustEpoch:summary.trustEpoch,base:createDeviceBoundSessionHarness({authority:a,directory:d,identities:[subject],now,origin})};
 }
 if(subjectContexts!==undefined){
  if(accounts.length!==identities.length||!Array.isArray(subjectContexts)||subjectContexts.length!==identities.length||subjectContexts.some(c=>!c||!identities.includes(c.subject))||new Set(subjectContexts.map(c=>c.subject)).size!==identities.length)fail();
  for(const c of subjectContexts)contexts.set(c.subject,context(c.subject,c));
 }
 const multi=subjectContexts!==undefined;
 // Staging logins have no account authority. The verified callback performs the private handoff.
 const base=multi?createSyntheticSessionHarness({authority:{mode:'SYNTHETIC_ONLY',sessionEpoch:'prelogin'},identities,now,origin}):createDeviceBoundSessionHarness({authority,directory,identities,now,origin});
 const pending=new Map(),results=new Map();
 async function selected(request){
  if(!multi)return {base};
  for(const [subject,c]of contexts){const result=await c.base.dispatch({method:'GET',path:'/session',origin,cookie:request.cookie});if(result.status===200&&result.body.subject===subject)return c;}
  fail();
 }
 function snapshotContexts(){return new Map([...contexts].map(([subject,c])=>{try{return [subject,{context:c,epoch:c.directory.summary().trustEpoch,generation:c.generation||0}];}catch{return [subject,null];}}));}

 // Captured callbacks/config cannot be replaced while Web Crypto is awaiting.
 const exchange=provider.exchange.bind(provider);
 let epoch=multi?null:authority.sessionEpoch,generation=0,closed=false,inflight=0;
 function prune(){if(closed)fail();if(!multi&&epoch!==authority.sessionEpoch){epoch=authority.sessionEpoch;generation++;pending.clear();results.clear();}for(const [key,p]of pending)if(now()>=p.expires)pending.delete(key);for(const [key,r]of results)if(now()>=r.expires)results.delete(key);}
 function active(p,subject){
  prune();if(p.generation!==generation||now()>=p.expires)fail();
  if(!multi){if(directory.summary().suspended||authority.summary?.().suspended)fail();return;}
  if(subject!==undefined){const c=contexts.get(subject),old=p.contexts.get(subject);if(!c||!old||c!==old.context||(c.generation||0)!==old.generation||c.directory.summary().trustEpoch!==old.epoch||c.authority.sessionEpoch!==c.journalDomain||c.authority.summary().suspended)fail();}
 }
 async function dispatch(input){
  let claimed=false,reserved=false;
  try{
   const request=structuredClone(input);prune();
   if(browserResult&&request.path==='/oidc/result'){
    if(request.method!=='GET'||request.origin!==base.origin||request.url)fail();
    const current=await selected(request),session=await current.base.dispatch({...request,path:'/session'});if(session.status!==200)fail();
    const raw=request.cookie.split(';').map(p=>p.trim()).find(p=>p.startsWith('__Host-wroom_synthetic='));
    const key=hash(raw),result=results.get(key);if(!result||now()>=result.expires||(multi&&result.context!==current))fail();results.delete(key);
    return {status:200,headers:{'Cache-Control':'no-store'},body:result.body};
   }
   if(request.path==='/oidc/login/start'){
    if(request.method!=='POST'||request.origin!==base.origin||!request.body||Object.keys(request.body).join(',')!=='device'||pending.size>=100)fail();
    const startedGeneration=generation;const start=base.dispatch({...request,path:'/synthetic/login/start'});const result=await start;if(result.status!==200)fail();
    // No external await occurs before storing the prelogin browser binding.
    prune();if(pending.size>=100)fail();
    const nonce=token(),verifier=token(),browser=token(),p={state:result.body.state,csrf:result.body.csrf,device:request.body.device,nonce,verifier,browserHash:hash(browser),expires:now()+300000,generation:startedGeneration,...(multi?{contexts:snapshotContexts()}: {})};active(p);
    pending.set(hash(p.state),p);
    const url=new URL(metadata.authorizationEndpoint);url.search=new URLSearchParams({client_id:metadata.clientId,redirect_uri:metadata.redirectUri,response_type:'code',scope:'openid email',state:p.state,nonce,code_challenge:hash(verifier),code_challenge_method:'S256'});
    return {status:200,headers:{'Cache-Control':'no-store','Set-Cookie':loginCookie(browser)},body:{mode:'SYNTHETIC_ONLY',authorizationUrl:url.href}};
   }
   if(request.path==='/oidc/callback'){
    if(request.method!=='GET'||typeof request.url!=='string'||request.url.length>4096||!request.url.startsWith(metadata.redirectUri+'?'))fail();
    const u=new URL(request.url),q=u.searchParams;
    if(u.origin+u.pathname!==metadata.redirectUri||u.hash||[...q.keys()].length!==3||new Set(q.keys()).size!==3||![...q.keys()].every(k=>['code','state','iss'].includes(k))||q.get('iss')!==metadata.issuer||!opaque(q.get('state'))||!opaque(q.get('code')))fail();
    const key=hash(q.get('state')),p=pending.get(key);if(!p||browserCookie(request.cookie)!==p.browserHash||inflight>=16)fail();
    pending.delete(key);claimed=true;inflight++;reserved=true;active(p);
    const response=await exchange({grant_type:'authorization_code',client_id:metadata.clientId,redirect_uri:metadata.redirectUri,code:q.get('code'),code_verifier:p.verifier});active(p);
    if(typeof response?.id_token!=='string'||response.id_token.length>8192||response.token_type!=='Bearer')fail();
    const {payload,protectedHeader}=await jwtVerify(response.id_token,jwks,{algorithms:['ES256'],issuer:metadata.issuer,audience:metadata.clientId,typ:'JWT',requiredClaims:['iss','sub','aud','iat','exp','nonce','email','email_verified'],currentDate:new Date(now()),clockTolerance:0,maxTokenAge:60});
    active(p);
    if(protectedHeader.kid!==metadata.jwks.keys[0].kid||Object.keys(protectedHeader).some(k=>!['alg','kid','typ'].includes(k))||payload.nonce!==p.nonce||payload.aud!==metadata.clientId||(payload.azp!==undefined&&payload.azp!==metadata.clientId)||!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||payload.exp<=payload.iat||payload.exp-payload.iat>60||payload.iat>Math.floor(now()/1000)||!id(payload.sub)||payload.email_verified!==true||typeof payload.email!=='string'||!/^[A-Za-z0-9._+-]{1,100}@example\.invalid$/.test(payload.email))fail();
    const subject=users.get(payload.sub);if(!subject)fail();active(p,subject);
    const current=multi?contexts.get(subject):{base};
    // Private handoff after signature/account verification; recheck context after every await.
    let state=p.state,csrf=p.csrf;
    if(multi){const start=current.base.dispatch({method:'POST',origin,path:'/synthetic/login/start',source:'oidc-private',body:{device:p.device}});const login=await start;active(p,subject);if(login.status!==200)fail();state=login.body.state;csrf=login.body.csrf;}
    const code=current.base.issueSyntheticCode({subject,device:p.device,state});
    const result=await current.base.dispatch({method:'POST',origin:base.origin,path:'/synthetic/login/complete',body:{state,code},csrf,cookie:request.cookie});
    active(p,subject);
    if(result.status!==200)fail();
    if(browserResult){if(results.size>=1000)fail();results.set(hash(result.headers['Set-Cookie'].split(';')[0]),{body:result.body,expires:now()+60000,...(multi?{context:current}:{})});}
    return {...result,headers:{...result.headers,'Set-Cookie':[result.headers['Set-Cookie'],loginCookie('')]}};
   }
   if(request.path?.startsWith('/synthetic/')||request.url)fail();
   const current=await selected(request),result=await current.base.dispatch(request);
   if(result.status===200&&['/logout','/devices/revoke'].includes(request.path)){
    if(multi){current.generation=(current.generation||0)+1;for(const [key,r]of results)if(r.context===current)results.delete(key);}
    else {generation++;pending.clear();results.clear();}
   }
   return result;
  }catch{const result=denied();if(claimed)result.headers['Set-Cookie']=loginCookie('');return result;}finally{if(reserved)inflight--;}
 }
 return Object.freeze({mode:'OIDC_FIXTURE_ONLY',origin:base.origin,dispatch,...(multi?{replaceSubjectContext(subject,input){
  if(closed||!contexts.has(subject))fail();
  const old=contexts.get(subject),next=context(subject,input);
  // Activation follows a committed recovery; no same-domain reset or unrelated account reset.
  const summary=next.directory.summary();
  if(next.journalDomain===old.journalDomain||next.directoryDomain===old.directoryDomain||summary.trustEpoch!==old.trustEpoch+1)fail();
  contexts.set(subject,next);for(const [key,r]of results)if(r.context===old)results.delete(key);
 }}:{}),close(){closed=true;generation++;pending.clear();results.clear();}});
}
