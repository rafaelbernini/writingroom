// Synthetic content only; crypto control plane is pipes, not network routes.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { createProofRecipient,publicProofCard,sealProof,openProof } from '../../packages/sharing-spike/src/hpke-proof.mjs';
import { createProofSigner,proofSignerCard,signDeviceBinding,createDeviceBindingVerifier } from '../../packages/sharing-spike/src/device-binding-proof.mjs';
const signer=await createProofSigner(),identity=await proofSignerCard(signer.publicKey),verifier=createDeviceBindingVerifier({pins:[{subject:'editor-1',fingerprint:identity.fingerprint}]});
const bundle=await readFile(path.join(process.argv[2],'proof.js')),recipient=await createProofRecipient();
const scope={device:'device-1',project:'book-1',recipient:'editor-1',transfer:'transfer-1'};
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'||!['/','/proof.js'].includes(req.url)){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':req.url==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
 res.end(req.url==='/'?'<!doctype html><meta charset="utf-8"><title>Prova HPKE sintética</title><h1>Prova HPKE offline</h1><script type="module" src="/proof.js"></script>':bundle);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
process.stdout.write(JSON.stringify({url:`http://127.0.0.1:${server.address().port}`,card:await publicProofCard(recipient.publicKey),identityFingerprint:identity.fingerprint})+'\n');
const rl=createInterface({input:process.stdin});rl.on('line',async line=>{try{
 const c=JSON.parse(line);let result;
 if(c.action==='seal')result=await sealProof(c.card,new TextEncoder().encode('Conteúdo sintético Node → Firefox'),scope);
 else if(c.action==='bind')result=await signDeviceBinding(signer,c.card,{subject:'editor-1',device:'device-1',issuedAt:Date.now(),expiresAt:Date.now()+600000});
 else if(c.action==='challenge')result=await verifier.begin(c.binding);
 else if(c.action==='confirm')result=await verifier.confirm(c.response);
 else if(c.action==='revoke'){verifier.revokeBinding(c.hash);result={ok:true};}
 else if(c.action==='authorize')result=await verifier.authorize(c.binding);
 else if(c.action==='open')result={text:new TextDecoder().decode(await openProof(recipient,c.envelope,scope))};else throw new Error();
 process.stdout.write(JSON.stringify(result)+'\n');
}catch{process.stdout.write('{"error":"REJECTED"}\n');}});
function close(){server.closeAllConnections();server.close(()=>process.exit(0));}rl.on('close',close);process.on('SIGTERM',close);
