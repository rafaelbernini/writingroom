// Test-only control plane over pipes. No identity/pin/revocation HTTP routes.
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { createDurableSyntheticAuthority, openDurableSyntheticAuthority } from '../../packages/sharing-spike/src/durable-authority.mjs';
import { createDurableDeviceDirectory, openDurableDeviceDirectory } from '../../packages/sharing-spike/src/durable-device-directory.mjs';
import { createProofSigner, proofSignerCard, signDeviceBinding } from '../../packages/sharing-spike/src/device-binding-proof.mjs';
import { startOidcFixtureHttpsProvider } from '../../packages/sharing-spike/src/oidc-fixture-https.mjs';
import { startSyntheticHttpsTransport } from '../../packages/sharing-spike/src/https-transport.mjs';
const base=process.argv[2],identities=['owner','editor','other'];
const tls={key:await readFile(path.join(base,'key.pem')),cert:await readFile(path.join(base,'cert.pem'))};
const signers=new Map(),pins=[];
for(const subject of identities){const signer=await createProofSigner(),card=await proofSignerCard(signer.publicKey);signers.set(subject,{signer,card});pins.push({subject,fingerprint:card.fingerprint});}
const browserFixtureScript=await readFile(path.join(base,'bound-proof.js'),'utf8');
let observations=[];
const issuer=await startOidcFixtureHttpsProvider({tls,ca:await readFile(path.join(base,'ca.pem')),observe:e=>{if(observations.length<500)observations.push({server:'issuer',...e});}});
const journalFile=path.join(base,'journal.sqlite'),directoryFile=path.join(base,'directory.sqlite');
let authority=await createDurableSyntheticAuthority(journalFile,identities);
authority.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'},{id:'private',folder:'research'}]});
authority.createProject('other',{id:'otherbook',scenes:[{id:'one',folder:'draft'}]});
let directory=await createDurableDeviceDirectory(directoryFile,pins),transport,dropOperation=false;
async function start(fixturePort=0){transport=await startSyntheticHttpsTransport({authority,directory,identities,tls,enableBrowserFixture:true,fixturePort,browserFixtureScript,shouldDropOperationResponse:()=>dropOperation,observeBrowserFixture:e=>{if(observations.length<500)observations.push({server:'rp',...e});},oidcFixture:{issuer:issuer.issuer,accounts:identities.map(subject=>({sub:subject+'-sub',subject})),createProvider:origin=>issuer.configure(origin)}});return {origin:transport.origin,issuer:issuer.issuer};}
process.stdout.write(JSON.stringify(await start())+'\n');
async function control(c){
 // Keep the fault armed through transport retries until private control explicitly releases it.
 if(c.action==='drop_operation'){dropOperation=true;return {ok:true};}
 if(c.action==='resume_operations'){dropOperation=false;return {ok:true};}
 if(c.action==='authorize')return issuer.authorize(c.input);
 if(c.action==='callback')return {url:issuer.callback(c.input)};
 if(c.action==='observations')return observations;
 if(c.action==='clear'){observations=[];return {ok:true};}
 if(c.action==='bind'){const {signer,card}=signers.get(c.subject);return {binding:await signDeviceBinding(signer,c.card,{subject:c.subject,device:c.subject,issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000}),fingerprint:card.fingerprint};}
 if(c.action==='summary')return {journal:authority.summary(),directory:directory.summary()};
 if(c.action==='revoke'){directory.revokeBinding(c.hash,{expectedRevision:directory.summary().revision});return {ok:true};}
 if(c.action==='restart'){const port=Number(new URL(transport.origin).port);await transport.close();authority.close();directory.close();authority=await openDurableSyntheticAuthority(journalFile);directory=await openDurableDeviceDirectory(directoryFile);return start(port);}
 throw new Error('DENIED');
}
const rl=createInterface({input:process.stdin});
// Serial pipe commands, including asynchronous restart/binding operations.
let pending=Promise.resolve();
rl.on('line',line=>{pending=pending.then(async()=>{try{process.stdout.write(JSON.stringify(await control(JSON.parse(line)))+'\n');}catch{process.stdout.write('{"error":"DENIED"}\n');}});});
async function close(){await pending;await transport.close();await issuer.close();authority.close();directory.close();process.exit(0);}
rl.on('close',()=>close().catch(()=>process.exit(1)));process.on('SIGTERM',()=>close().catch(()=>process.exit(1)));
