// Test orchestration only. Control-plane is stdin/stdout pipes, never an HTTP issuer.
import https from 'node:https';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { createDurableSyntheticAuthority } from '../../packages/sharing-spike/src/durable-authority.mjs';
import { startSyntheticHttpsTransport } from '../../packages/sharing-spike/src/https-transport.mjs';
const base=process.argv[2],tls={key:await readFile(path.join(base,'key.pem')),cert:await readFile(path.join(base,'cert.pem'))};
const identities=['owner','editor'];const authority=await createDurableSyntheticAuthority(path.join(base,'authority.sqlite'),identities);
authority.createProject('owner',{id:'book',scenes:[{id:'one',folder:'draft'}]});
let observations=[];
const transport=await startSyntheticHttpsTransport({authority,identities,tls,enableBrowserFixture:true,observeBrowserFixture:event=>{if(observations.length<500)observations.push(event);}});
// Separate servers see only whether a Cookie header exists, never record its value.
const page='<!doctype html><meta charset="utf-8"><title>Origem de teste</title><h1>Origem de teste isolada</h1>';
function handler(req,res){observations.push({method:req.method,cookie:Boolean(req.headers.cookie),hasSessionCookie:/(?:^|;\s*)__Host-wroom_synthetic=/.test(req.headers.cookie||'')});res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(page);}
const other=https.createServer(tls,handler),plain=http.createServer(handler);
await Promise.all([new Promise(resolve=>other.listen(0,'127.0.0.1',resolve)),new Promise(resolve=>plain.listen(0,'127.0.0.1',resolve))]);
process.stdout.write(JSON.stringify({origin:transport.origin,cross:`https://localhost:${other.address().port}`,sameSite:`https://127.0.0.1:${other.address().port}`,plain:`http://127.0.0.1:${plain.address().port}`})+'\n');
const rl=createInterface({input:process.stdin});
rl.on('line',line=>{try{const command=JSON.parse(line);let result;
 if(command.action==='issue')result={code:transport.issueSyntheticCode(command.input)};
 else if(command.action==='summary')result=authority.summary();
 else if(command.action==='observations')result=observations;
 else if(command.action==='clear'){observations=[];result={ok:true};}
 else throw new Error('DENIED');
 process.stdout.write(JSON.stringify(result)+'\n');
 }catch{process.stdout.write('{"error":"DENIED"}\n');}});
async function close(){await transport.close();other.closeAllConnections();plain.closeAllConnections();await Promise.all([new Promise(r=>other.close(r)),new Promise(r=>plain.close(r))]);authority.close();process.exit(0);}
process.on('SIGTERM',()=>close().catch(()=>process.exit(1)));rl.on('close',()=>close().catch(()=>process.exit(1)));
