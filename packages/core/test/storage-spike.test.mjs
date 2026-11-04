import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir,readdir,symlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {makeProject,addNode,updateText,snapshot} from '../src/core.mjs';
import {createRepository,openRepository,verifyBackup,restoreBackup} from '../../storage-spike/src/repository.mjs';
import {convertToRich} from '../src/rich-service.mjs';
let Database;
try{Database=(await import('node:sqlite')).DatabaseSync;}catch{}
const spike=(name,fn)=>test(name,{skip:!Database&&'SQLite nativo indisponível; prova exige Node compatível.'},fn);
async function fixture(t){
 const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-spike-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const project=makeProject('Livro de prova'),folder=addNode(project,project.roots.draft,'Capítulo','folder'),id=addNode(project,folder,'Cena');
 updateText(project,id,'Olá 🌱\r\nTexto original.\n');snapshot(project,id,'Marco inicial');
 const dir=path.join(base,'project.wroom'),session=await createRepository(dir,project);t.after(()=>session.close());
 return {base,project,id,dir,session};
}
async function child(t,script,args){
 const processChild=spawn(process.execPath,['--input-type=module','-e',script,...args],{stdio:['ignore','ignore','pipe','ipc']});
 let stderr='';processChild.stderr.on('data',data=>stderr+=data);
 t.after(async()=>{if(processChild.exitCode===null&&processChild.signalCode===null){processChild.kill('SIGKILL');await once(processChild,'exit');}});
 const message=await Promise.race([once(processChild,'message').then(([message])=>message),once(processChild,'exit').then(([code])=>{throw new Error('Worker encerrou antes da mensagem: '+code+' '+stderr);})]);
 return {processChild,message};
}
const repositoryUrl=new URL('../../storage-spike/src/repository.mjs',import.meta.url).href;
spike('spike: cria, grava revisão monotônica, fecha e reabre sem mudar IDs/textos',async t=>{
 const {dir,project,id,session}=await fixture(t);assert.deepEqual(session.read().project,project);
 const result=session.writeText({nodeId:id,baseRevision:0,operationId:'edit-1',text:'Novo texto 漢字'});assert.equal(result.revision,1);
 session.close();const reopened=await openRepository(dir);try{const view=reopened.read();assert.equal(view.project.documents[id],'Novo texto 漢字');assert.equal(view.revisions[id],1);assert.deepEqual(view.project.nodes,project.nodes);assert.deepEqual(view.project.snapshots,project.snapshots);}finally{reopened.close();}
});
spike('spike: CAS detecta base antiga mesmo após A→B→A e não altera histórico',async t=>{
 const {id,session}=await fixture(t),original=session.read().project.documents[id];
 session.writeText({nodeId:id,baseRevision:0,operationId:'b',text:'B'});session.writeText({nodeId:id,baseRevision:1,operationId:'a',text:original});
 const before=session.read();assert.throws(()=>session.writeText({nodeId:id,baseRevision:0,operationId:'stale',text:'Perda'}),{code:'CONFLICT'});assert.deepEqual(session.read(),before);assert.equal(before.revisions[id],2);
});
spike('spike: replay idempotente sobrevive à reabertura e ID reutilizado é rejeitado',async t=>{
 const {id,session,dir}=await fixture(t),command={nodeId:id,baseRevision:0,operationId:'once',text:'Apenas uma vez'};
 const result=session.writeText(command);session.close();const reopened=await openRepository(dir);try{
  assert.deepEqual(reopened.writeText(command),result);assert.equal(reopened.read().revisions[id],1);
  assert.throws(()=>reopened.writeText({...command,text:'Outro conteúdo'}),{code:'OPERATION_REUSED'});assert.equal(reopened.read().project.documents[id],command.text);
 }finally{reopened.close();}
});
spike('spike: segundo escritor bloqueado, leitor permitido e close libera escritor',async t=>{
 const {dir,session,id}=await fixture(t);await assert.rejects(openRepository(dir),{code:'LOCKED'});
 const reader=await openRepository(dir,{readOnly:true});try{assert.ok(reader.read().project.documents[id]);assert.throws(()=>reader.writeText({}),{code:'READONLY'});}finally{reader.close();}
 session.close();const next=await openRepository(dir);next.close();assert.throws(()=>session.read(),{code:'CLOSED'});
});
spike('spike: lock é respeitado por outro processo e liberado após SIGKILL',async t=>{
 const {dir,session}=await fixture(t);session.close();
 const {processChild,message}=await child(t,`import {openRepository} from ${JSON.stringify(repositoryUrl)};const session=await openRepository(process.argv[1]);process.send('locked');setInterval(()=>{},1000);`,[dir]);
 assert.equal(message,'locked');await assert.rejects(openRepository(dir),{code:'LOCKED'});
 processChild.kill('SIGKILL');await once(processChild,'exit');const next=await openRepository(dir);next.close();
});
spike('spike: transação interrompida por SIGKILL mantém última revisão confirmada',async t=>{
 const {dir,id,session}=await fixture(t),before=session.read();session.close();
 const script=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA journal_mode=WAL;BEGIN IMMEDIATE;');db.prepare('UPDATE document SET content=? WHERE node_id=?').run('Não confirmado',process.argv[2]);process.send('uncommitted');setInterval(()=>{},1000);`;
 const {processChild,message}=await child(t,script,[path.join(dir,'project.sqlite'),id]);assert.equal(message,'uncommitted');processChild.kill('SIGKILL');await once(processChild,'exit');
 const reopened=await openRepository(dir);try{assert.deepEqual(reopened.read(),before);}finally{reopened.close();}
});
spike('spike: backup com WAL ativo verifica sem origem e restaura em pasta limpa',async t=>{
 const {base,dir,id,session}=await fixture(t);
 session.writeText({nodeId:id,baseRevision:0,operationId:'backup-edit',text:'Estado confirmado do WAL'});
 const expected=session.read(),backup=path.join(base,'backup');const manifest=await session.backup(backup);
 assert.equal(manifest.revisions[id],1);assert.equal(manifest.revision_count,2);assert.deepEqual((await readdir(backup)).sort(),['manifest.json','project.sqlite']);
 session.close();await rm(dir,{recursive:true,force:true});assert.deepEqual(await verifyBackup(backup),manifest);
 const target=path.join(base,'restored');await restoreBackup(backup,target);const restored=await openRepository(target);try{assert.deepEqual(restored.read(),expected);}finally{restored.close();}
});
spike('spike: corrupção, contagem incorreta e path traversal no manifesto bloqueiam restore',async t=>{
 const {base,session}=await fixture(t),backup=path.join(base,'backup');await session.backup(backup);
 const manifestPath=path.join(backup,'manifest.json'),original=await readFile(manifestPath,'utf8'),db=await readFile(path.join(backup,'project.sqlite'));
 await writeFile(manifestPath,JSON.stringify({...JSON.parse(original),node_count:999}));await assert.rejects(verifyBackup(backup),{code:'MANIFEST'});
 const malicious=JSON.parse(original);malicious.files[0].path='../outside.sqlite';await writeFile(manifestPath,JSON.stringify(malicious));await assert.rejects(restoreBackup(backup,path.join(base,'no-restore')),{code:'MANIFEST'});
 await writeFile(manifestPath,original);const corrupt=Buffer.from(db);corrupt[100]^=0xff;await writeFile(path.join(backup,'project.sqlite'),corrupt);await assert.rejects(verifyBackup(backup),{code:'CHECKSUM'});
 assert.ok(!(await readdir(base)).includes('no-restore'));
});
spike('spike: destino existente, mesmo vazio, permanece intacto; origem não muda',async t=>{
 const {base,session}=await fixture(t),backup=path.join(base,'backup');await session.backup(backup);const before=await readFile(path.join(backup,'project.sqlite'));
 const target=path.join(base,'existing');await mkdir(target);await assert.rejects(restoreBackup(backup,target),{code:'EEXIST'});assert.deepEqual(await readdir(target),[]);
 await writeFile(path.join(target,'marker'),'Preservar');await assert.rejects(session.backup(target),{code:'EEXIST'});assert.equal(await readFile(path.join(target,'marker'),'utf8'),'Preservar');
 assert.deepEqual(await readFile(path.join(backup,'project.sqlite')),before);assert.ok(!(await readdir(base)).some(name=>name.startsWith('.writingroom-')));
});
spike('spike: schema futuro e symlink são rejeitados sem alterar banco',async t=>{
 const {base,dir,session}=await fixture(t);session.close();const file=path.join(dir,'project.sqlite'),db=new Database(file);db.exec('PRAGMA user_version=999');db.close();const before=await readFile(file);
 await assert.rejects(openRepository(dir),{code:'SCHEMA'});assert.deepEqual(await readFile(file),before);
 const linked=path.join(base,'linked');await symlink(dir,linked,'dir');await assert.rejects(openRepository(linked),{code:'UNSAFE_PATH'});
});
spike('spike: rejeição de entrada e falha SQL dão rollback e sessão continua válida',async t=>{
 const {id,session,dir}=await fixture(t),before=session.read();
 assert.throws(()=>session.writeText({nodeId:id,baseRevision:0,operationId:'bad',text:null}),{code:'VALIDATION'});assert.deepEqual(session.read(),before);
 const db=new Database(path.join(dir,'project.sqlite'));db.exec("CREATE TRIGGER reject_history BEFORE INSERT ON revision BEGIN SELECT RAISE(ABORT,'fault injection'); END;");db.close();
 assert.throws(()=>session.writeText({nodeId:id,baseRevision:0,operationId:'fault',text:'Não salvar'}));assert.deepEqual(session.read(),before);
 const fix=new Database(path.join(dir,'project.sqlite'));fix.exec('DROP TRIGGER reject_history');fix.close();assert.equal(session.writeText({nodeId:id,baseRevision:0,operationId:'fault',text:'Agora salvar'}).revision,1);
});

spike('spike: sidecars não declarados e histórico inconsistente são rejeitados',async t=>{
 const {base,session}=await fixture(t),backup=path.join(base,'backup');await session.backup(backup);
 await writeFile(path.join(backup,'project.sqlite-wal'),'Journal não declarado');await assert.rejects(verifyBackup(backup),{code:'MANIFEST'});await rm(path.join(backup,'project.sqlite-wal'));
 const file=path.join(backup,'project.sqlite'),db=new Database(file);db.exec("UPDATE revision SET checksum='invalid'");db.close();
 const manifest=await readFile(path.join(backup,'manifest.json'),'utf8'),parsed=JSON.parse(manifest),bytes=await readFile(file);
 parsed.files[0].bytes=bytes.length;parsed.files[0].sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(path.join(backup,'manifest.json'),JSON.stringify(parsed));
 await assert.rejects(restoreBackup(backup,path.join(base,'bad-history')),{code:'INTEGRITY'});assert.ok(!(await readdir(base)).includes('bad-history'));
});
spike('spike: commit confirmado sobrevive ao término do escritor com WAL aberto',async t=>{
 const {dir,id,session}=await fixture(t);session.close();
 const script=`import {openRepository} from ${JSON.stringify(repositoryUrl)};const session=await openRepository(process.argv[1]);session.writeText({nodeId:process.argv[2],baseRevision:0,operationId:'committed-child',text:'Confirmado antes da saída'});process.send('committed');setInterval(()=>{},1000);`;
 const {processChild,message}=await child(t,script,[dir,id]);assert.equal(message,'committed');processChild.kill('SIGKILL');await once(processChild,'exit');
 const reopened=await openRepository(dir);try{assert.equal(reopened.read().project.documents[id],'Confirmado antes da saída');assert.equal(reopened.read().revisions[id],1);}finally{reopened.close();}
});

spike('spike: escrita textual recusa documento visual sem alterar agregado',async t=>{
 const {base,project,id}=await fixture(t);convertToRich(project,id);
 const session=await createRepository(path.join(base,'rich.wroom'),project);t.after(()=>session.close());
 const before=session.read();assert.throws(()=>session.writeText({nodeId:id,baseRevision:0,operationId:'rich-loss',text:'Perda'}),{code:'UNSUPPORTED'});assert.deepEqual(session.read(),before);
});
