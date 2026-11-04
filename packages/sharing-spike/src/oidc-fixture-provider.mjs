// Isolated fixture only. No HTTP issuer, discovery, real account or email delivery.
import { randomBytes, createHash } from 'node:crypto';
import { fixtureOidcConfig } from './oidc-fixture-config.mjs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
const fail=()=>{throw new Error('OIDC_FIXTURE_REJECTED');};
const token=()=>randomBytes(32).toString('base64url');
const hash=v=>createHash('sha256').update(v).digest('base64url');
const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.sort().join(','))fail();};
export const FIXTURE_ISSUER='https://oidc-fixture.invalid';
export const FIXTURE_CLIENT='writingroom-fixture';
export const FIXTURE_REDIRECT='https://sharing.invalid/oidc/callback';
export async function createOidcFixtureProvider({now=Date.now,issuer=FIXTURE_ISSUER,origin='https://sharing.invalid'}={}){
 const config=fixtureOidcConfig(issuer,origin);
 const {privateKey,publicKey}=await generateKeyPair('ES256'),kid=token(),jwk=await exportJWK(publicKey);
 const metadata={issuer:config.issuer,clientId:FIXTURE_CLIENT,redirectUri:config.redirectUri,authorizationEndpoint:config.authorizationEndpoint,jwks:{keys:[{...jwk,kid,alg:'ES256',use:'sig'}]}};
 const codes=new Map();
 function prune(){for(const [key,c]of codes)if(now()>=c.expires)codes.delete(key);}
 // Private test control: sub and adversarial overrides never come from an HTTP request.
 function authorize({authorizationUrl,sub,claims={},header={}}){
  prune();const u=new URL(authorizationUrl),q=u.searchParams;
  if(u.origin+u.pathname!==metadata.authorizationEndpoint||u.hash||[...q.keys()].length!==8||new Set(q.keys()).size!==8)fail();
  if(q.get('client_id')!==FIXTURE_CLIENT||q.get('redirect_uri')!==metadata.redirectUri||q.get('response_type')!=='code'||q.get('scope')!=='openid email'||q.get('code_challenge_method')!=='S256'||!opaque(q.get('state'))||!opaque(q.get('nonce'))||!opaque(q.get('code_challenge'))||typeof sub!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(sub)||codes.size>=100)fail();
  const code=token(),state=q.get('state');
  codes.set(hash(code),{sub,nonce:q.get('nonce'),challenge:q.get('code_challenge'),claims:structuredClone(claims),header:structuredClone(header),expires:now()+60000});
  const callback=new URL(metadata.redirectUri);callback.search=new URLSearchParams({code,state,iss:metadata.issuer});return callback.href;
 }
 async function exchange(input){
  prune();exact(input,['grant_type','client_id','redirect_uri','code','code_verifier']);
  if(!opaque(input.code))fail();const c=codes.get(hash(input.code));if(!c)fail();codes.delete(hash(input.code));
  if(input.grant_type!=='authorization_code'||input.client_id!==FIXTURE_CLIENT||input.redirect_uri!==metadata.redirectUri||!opaque(input.code_verifier)||hash(input.code_verifier)!==c.challenge)fail();
  const seconds=Math.floor(now()/1000),payload={iss:metadata.issuer,sub:c.sub,aud:FIXTURE_CLIENT,iat:seconds,exp:seconds+60,nonce:c.nonce,email:c.sub+'@example.invalid',email_verified:true,...c.claims};
  const id_token=await new SignJWT(payload).setProtectedHeader({alg:'ES256',typ:'JWT',kid,...c.header}).sign(privateKey);
  return {id_token,token_type:'Bearer',access_token:token(),expires_in:60};
 }
 return Object.freeze({mode:'OIDC_FIXTURE_ONLY',metadata:structuredClone(metadata),authorize,exchange});
}
