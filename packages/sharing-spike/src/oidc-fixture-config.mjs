// Only reserved names or the exact two loopback hosts used by isolated TLS tests.
export function fixtureOidcConfig(issuer='https://oidc-fixture.invalid',origin='https://sharing.invalid'){
 const reserved=issuer==='https://oidc-fixture.invalid'&&origin==='https://sharing.invalid';
 function loopback(value,host){try{const u=new URL(value);return u.origin===value&&u.protocol==='https:'&&u.hostname===host&&Number(u.port)>0&&Number(u.port)<=65535;}catch{return false;}}
 if(!reserved&&!(loopback(issuer,'localhost')&&loopback(origin,'127.0.0.1')))throw new Error('OIDC_FIXTURE_CONFIG_REQUIRED');
 return {issuer,origin,redirectUri:origin+'/oidc/callback',authorizationEndpoint:issuer+'/authorize'};
}
