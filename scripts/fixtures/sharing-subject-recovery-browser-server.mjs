// Pipe-only controller. Subject selection here is never an HTTP field.
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {startSubjectRecoveryHttpsFixture} from './subject-recovery-https-fixture.mjs';
const base=process.argv[2],fixture=await startSubjectRecoveryHttpsFixture({base,tls:{key:await readFile(path.join(base,'key.pem')),cert:await readFile(path.join(base,'cert.pem'))},ca:await readFile(path.join(base,'ca.pem')),browserFixtureScript:await readFile(path.join(base,'bound-proof.js'),'utf8')});
process.stdout.write(JSON.stringify(fixture.endpoints)+'\n');
const rl=createInterface({input:process.stdin});let pending=Promise.resolve();
rl.on('line',line=>{pending=pending.then(async()=>{try{process.stdout.write(JSON.stringify(await fixture.control(JSON.parse(line)))+'\n');}catch{process.stdout.write('{"error":"DENIED"}\n');}});});
async function close(){await pending;await fixture.close();process.exit(0);}
rl.on('close',()=>close().catch(()=>process.exit(1)));process.on('SIGTERM',()=>close().catch(()=>process.exit(1)));
