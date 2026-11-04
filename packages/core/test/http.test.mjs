import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createWritingRoomServer} from '../../../apps/web/server.mjs';

async function setup(t,{blockBackup=false,backupTickMs,existingBase}={}){
 const base=existingBase??await mkdtemp(path.join(os.tmpdir(),'writingroom-http-'));
 const backupBase=path.join(base,'migration-backups');
 if(blockBackup)await writeFile(backupBase,'blocked');
 const server=createWritingRoomServer({base,backupBase,backupTickMs,backupTargets:{local:path.join(backupBase,'managed')}});
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(base,{recursive:true,force:true});});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const port=server.address().port;
 async function request(route,method='GET',payload,headers={}){
  return new Promise((resolve,reject)=>{
   const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers:{...(payload===undefined?{}:{'content-type':'application/json'}),...headers}},response=>{
    const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);
    response.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');resolve({status:response.statusCode,data:response.headers['content-type'].includes('application/json')?JSON.parse(text):text});});
   });
   req.on('error',reject);req.end(payload===undefined?undefined:JSON.stringify(payload));
  });
 }
 const post=(route,payload)=>request(route,'POST',payload);
 async function fixture(){
  const {data:p}=await post('/api/projects',{name:'Teste 🌱'});
  const route='/api/projects/'+p.id;
  const {data:{id}}=await post(route+'/nodes',{parent_id:p.roots.draft,title:'Cena'});
  const {data:opened}=await request(route);
  return {p:opened,route,id};
 }
 return {base,port,server,request,post,fixture};
}
test('HTTP: criar, escrever, snapshot, restaurar, reabrir e exportar',async t=>{
 const {fixture,post,request,base}=await setup(t);const {p,route,id}=await fixture();
 let response=await post(route+'/text',{id,text:'Primeira versão 🌱',base_hash:p.document_hashes[id]});assert.equal(response.status,200);
 const firstHash=response.data.hash;
 const {data:version}=await post(route+'/snapshot',{id,label:'Marco',base_hash:firstHash});
 response=await post(route+'/text',{id,text:'Segunda versão',base_hash:firstHash});assert.equal(response.status,200);
 response=await post(route+'/restore-snapshot',{id:version.id,base_hash:response.data.hash});assert.equal(response.status,200);
 const {data:reopened}=await request(route);assert.equal(reopened.documents[id],'Primeira versão 🌱');assert.equal(reopened.snapshots.length,2);assert.equal(reopened.snapshots[1].content,'Segunda versão');
 assert.match((await request(route+'/export?format=md')).data,/Primeira versão 🌱/);
 assert.match((await request(route+'/export?format=txt')).data,/Primeira versão 🌱/);
 const disk=JSON.parse(await readFile(path.join(base,p.id+'.wroom','project.json'),'utf8'));assert.equal(disk.schema_version,1);assert.equal(disk.document_hashes,undefined);
});
test('HTTP: operações simultâneas em cenas diferentes não se sobrescrevem',async t=>{
 const {fixture,post,request}=await setup(t);const {p,route,id}=await fixture();
 const {data:other}=await post(route+'/nodes',{parent_id:p.roots.draft,title:'Outra'});
 const {data:opened}=await request(route);
 const responses=await Promise.all([
  post(route+'/text',{id,text:'Cena A',base_hash:opened.document_hashes[id]}),
  post(route+'/text',{id:other.id,text:'Cena B',base_hash:opened.document_hashes[other.id]}),
  post(route+'/metadata',{id,patch:{synopsis:'Sinopse preservada'}})
 ]);
 assert.deepEqual(responses.map(r=>r.status),[200,200,200]);
 const {data:after}=await request(route);assert.equal(after.documents[id],'Cena A');assert.equal(after.documents[other.id],'Cena B');assert.equal(after.nodes.find(n=>n.id===id).synopsis,'Sinopse preservada');
});
test('HTTP: edição desatualizada e restauração desatualizada retornam conflito',async t=>{
 const {fixture,post,request}=await setup(t);const {p,route,id}=await fixture();
 const {data:version}=await post(route+'/snapshot',{id,base_hash:p.document_hashes[id]});
 const results=await Promise.all(['Texto A','Texto B'].map(text=>post(route+'/text',{id,text,base_hash:p.document_hashes[id]})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await post(route+'/snapshot',{id,base_hash:p.document_hashes[id]})).status,409);
 const before=(await request(route)).data;
 assert.equal((await post(route+'/restore-snapshot',{id:version.id,base_hash:p.document_hashes[id]})).status,409);
 assert.deepEqual((await request(route)).data,before);
 assert.equal((await post(route+'/text',{id,text:'Sem base'})).status,428);
});
test('HTTP: rejeição não impede próximas operações na fila',async t=>{
 const {fixture,post,request}=await setup(t);const {route,id}=await fixture();
 assert.equal((await post(route+'/metadata',{id,patch:{title:'',synopsis:'Não gravar'}})).status,400);
 assert.equal((await post(route+'/metadata',{id,patch:{synopsis:'Válida'}})).status,200);
 const {data:p}=await request(route);assert.equal(p.nodes.find(n=>n.id===id).title,'Cena');assert.equal(p.nodes.find(n=>n.id===id).synopsis,'Válida');
});
test('HTTP: Host, Origin e contexto cross-site são rejeitados em API e estáticos',async t=>{
 const {request,port}=await setup(t);
 for(const route of ['/','/app.js','/api/projects']){
  assert.equal((await request(route,'GET',undefined,{host:'evil.example'})).status,403);
  for(const origin of ['https://evil.example','null',`https://127.0.0.1:${port}`,`http://127.0.0.1:${port}/`])assert.equal((await request(route,'GET',undefined,{origin})).status,403);
  assert.equal((await request(route,'GET',undefined,{'sec-fetch-site':'cross-site'})).status,403);
 }
 assert.equal((await request('/api/projects','GET',undefined,{origin:`http://localhost:${port}`})).status,200);
});
test('HTTP: JSON, tipos, tamanho em bytes, métodos e formatos são validados',async t=>{
 const {request,post,port,fixture}=await setup(t);
 assert.equal((await request('/api/projects','POST',{name:'X'},{'content-type':'text/plain'})).status,415);
 for(const payload of [null,[],5,{name:7}])assert.equal((await post('/api/projects',payload)).status,400);
 const invalid=await fetch(`http://127.0.0.1:${port}/api/projects`,{method:'POST',headers:{'content-type':'application/json'},body:'{'});assert.equal(invalid.status,400);await invalid.text();
 assert.equal((await post('/api/projects',{name:'á'.repeat(1_000_001)})).status,413);
 assert.equal((await request('/api/projects','DELETE')).status,405);
 const {route}=await fixture();assert.equal((await request(route+'/export?format=exe')).status,400);
 assert.equal((await post('/api/projects/../../outside',{})).status,404);
});
test('HTTP: projetos corrompidos/futuros aparecem, permanecem intactos e não vazam erro interno',async t=>{
 const {base,fixture,request}=await setup(t);const {p:validProject}=await fixture();
 const id=randomUUID(),dir=path.join(base,id+'.wroom');await mkdir(dir);
 const raw='{"schema_version":999,"name":"MANUSCRITO PRIVADO"}';await writeFile(path.join(dir,'project.json'),raw);
 // A valid-looking project with an invalid timestamp must not break library sorting.
 const malformed=randomUUID(),malformedDir=path.join(base,malformed+'.wroom');await mkdir(malformedDir);
 validProject.id=malformed;validProject.updated_at=42;delete validProject.document_hashes;
 await writeFile(path.join(malformedDir,'project.json'),JSON.stringify(validProject));
 const {data:list}=await request('/api/projects');assert.equal(list.length,3);assert.equal(list[0].state,'ready');assert.equal(list[1].state,'unavailable');assert.ok(list.some(p=>p.id===id&&p.state==='unavailable'));assert.equal(list.filter(p=>p.state==='unavailable').length,2);
 const response=await request('/api/projects/'+id);assert.equal(response.status,422);assert.ok(!JSON.stringify(response).includes(base));assert.ok(!JSON.stringify(list).includes('MANUSCRITO PRIVADO'));assert.equal(await readFile(path.join(dir,'project.json'),'utf8'),raw);
 assert.equal((await request('/api/projects/'+randomUUID())).status,404);
});
test('HTTP: symlink e identidade de pasta incompatível não dão acesso ao projeto',async t=>{
 const {base,fixture,request}=await setup(t);const {p}=await fixture();
 const id=randomUUID();await symlink(path.join(base,p.id+'.wroom'),path.join(base,id+'.wroom'),'dir');
 assert.equal((await request('/api/projects/'+id)).status,403);
 const mismatch=randomUUID(),dir=path.join(base,mismatch+'.wroom');await mkdir(dir);await writeFile(path.join(dir,'project.json'),JSON.stringify(p));
 assert.equal((await request('/api/projects/'+mismatch)).status,422);
 assert.equal((await request('/api/projects')).data.filter(p=>p.state==='unavailable').length,2);
});
test('HTTP: falha de leitura retorna erro genérico sem expor caminhos',async t=>{
 const {base,fixture,post}=await setup(t);const {p,route,id}=await fixture();
 const dir=path.join(base,p.id+'.wroom'),original=await readFile(path.join(dir,'project.json'),'utf8');
 // A directory in place of project.json simulates an unreadable project file.
 await rm(path.join(dir,'project.json'));await mkdir(path.join(dir,'project.json'));await writeFile(path.join(dir,'project.json','block'),'x');
 const response=await post(route+'/metadata',{id,patch:{title:'Novo'}});
 assert.equal(response.status,500);assert.ok(!JSON.stringify(response).includes(base));
 assert.equal(await readFile(path.join(dir,'project.json','block'),'utf8'),'x');
 assert.ok(original.includes('Cena'));assert.equal((await readdir(dir)).filter(name=>name.endsWith('.tmp')).length,0);
});

test('HTTP: interface nova, modelo, notas e metas sobrevivem à reabertura',async t=>{
 const {post,request}=await setup(t);assert.equal((await request('/api/status')).data.interface,'studio-19');
 const response=await post('/api/projects',{name:'Livro de interface',template:'novel'});assert.equal(response.status,201);const route='/api/projects/'+response.data.id;
 const {data:p}=await request(route),id=Object.keys(p.documents)[0];assert.ok(id);assert.equal(p.nodes.find(n=>n.id===id).include_in_compile,true);
 assert.equal((await post(route+'/metadata',{id,patch:{notes:'Uma pista importante',keywords:['mistério'],label:'sage',target_words:900}})).status,200);
 assert.equal((await post(route+'/settings',{patch:{author:'Autora',target_words:50000,language:'pt-BR'}})).status,200);
 const reopened=(await request(route)).data;assert.equal(reopened.settings.author,'Autora');assert.equal(reopened.nodes.find(n=>n.id===id).notes,'Uma pista importante');assert.equal((await request(route+'/search?q='+encodeURIComponent('mistério'))).data[0].id,id);
});
test('HTTP: preview não altera projeto, importação atômica aparece na compilação',async t=>{
 const {fixture,post,request}=await setup(t),{p,route}=await fixture(),input={filename:'Importado.md',text:'# Parte Um\nOlá\n# Parte Dois\nFinal',split:true};
 const before=(await request(route)).data;const preview=await post(route+'/inspect-import',input);assert.equal(preview.data.sections.length,2);assert.deepEqual((await request(route)).data,before);
 const response=await post(route+'/import',{...input,parent_id:p.roots.draft});assert.equal(response.status,200);assert.equal(response.data.ids.length,2);
 const compile=(await request(route+'/compile')).data;assert.deepEqual(compile.sections.slice(-2).map(n=>n.id),response.data.ids);
 const html=(await request(route+'/export?format=html')).data;assert.match(html,/Parte Um/);assert.match(html,/charset="utf-8"/);
});
test('HTTP: dividir cena verifica hash e backup restaura com nova identidade',async t=>{
 const {fixture,post,request}=await setup(t),{p,route,id}=await fixture();const saved=await post(route+'/text',{id,text:'Primeira parte. Segunda parte.',base_hash:p.document_hashes[id]});
 assert.equal((await post(route+'/split',{id,offset:15,title:'Continuação',base_hash:p.document_hashes[id]})).status,409);
 const split=await post(route+'/split',{id,offset:15,title:'Continuação',base_hash:saved.data.hash});assert.equal(split.status,200);
 const current=(await request(route)).data;assert.equal(current.documents[id]+current.documents[split.data.id],'Primeira parte. Segunda parte.');
 const backup=(await request(route+'/backup')).data;assert.equal(backup.project.document_hashes,undefined);const restored=await post('/api/restore',{backup});assert.equal(restored.status,201);assert.notEqual(restored.data.id,p.id);assert.equal(Object.keys(restored.data.documents).length,2);
 backup.project.name='Corrompido';assert.equal((await post('/api/restore',{backup})).status,400);
});

test('HTTP: substituição com prévia cria snapshots e rejeita prévia obsoleta sem save',async t=>{
 const {fixture,post,request}=await setup(t),{p,route,id}=await fixture();await post(route+'/text',{id,text:'Lia viu Lia.',base_hash:p.document_hashes[id]});
 const query={find:'Lia',replacement:'Mira',scope:'document',node_id:id,case_sensitive:true,whole_word:true};const preview=await post(route+'/replace-preview',query);assert.equal(preview.status,200);assert.equal(preview.data.occurrences.length,2);
 const result=await post(route+'/replace-apply',{query,fingerprint:preview.data.fingerprint,occurrence_ids:[preview.data.occurrences[0].id]});assert.equal(result.status,200);assert.equal(result.data.replacements,1);
 const after=(await request(route)).data;assert.equal(after.documents[id],'Mira viu Lia.');assert.equal(after.snapshots.at(-1).content,'Lia viu Lia.');assert.equal((await post(route+'/replace-apply',{query,fingerprint:preview.data.fingerprint,occurrence_ids:preview.data.occurrences.map(o=>o.id)})).status,409);assert.deepEqual((await request(route)).data,after);
});
test('HTTP: fichas, coleções e capturas persistem e usam hash de base',async t=>{
 const {fixture,post,request}=await setup(t),{p,route}=await fixture();const entity=await post(route+'/entity',{type:'character',title:'Lia'});assert.equal(entity.status,200);
 const collection=await post(route+'/collection',{operation:'create',name:'Elenco',type:'manual',base_hash:p.collections_hash});assert.equal(collection.status,200);let current=(await request(route)).data;
 assert.equal((await post(route+'/collection',{operation:'add',id:collection.data.id,node_id:entity.data.id,base_hash:p.collections_hash})).status,409);
 assert.equal((await post(route+'/collection',{operation:'add',id:collection.data.id,node_id:entity.data.id,base_hash:current.collections_hash})).status,200);
 assert.equal((await post(route+'/scratchpad',{text:'Ideia nova 🌱',base_hash:current.scratchpad_hash})).status,200);assert.equal((await post(route+'/scratchpad',{text:'Obsoleto',base_hash:current.scratchpad_hash})).status,409);
 current=(await request(route)).data;const capture=await post(route+'/capture',{title:'Ideia desenvolvida',parent_id:p.roots.draft,base_hash:current.scratchpad_hash});assert.equal(capture.status,200);const after=(await request(route)).data;assert.equal(after.documents[capture.data.id],after.scratchpad);assert.equal(after.collections[0].node_ids[0],entity.data.id);
});
test('HTTP: DOCX e EPUB são enviados como ZIP binário e MIME correto',async t=>{
 const {fixture,request,port}=await setup(t),{route}=await fixture();
 for(const format of ['docx','epub']){const response=await fetch(`http://127.0.0.1:${port}${route}/export?format=${format}`);assert.equal(response.status,200);const data=Buffer.from(await response.arrayBuffer());assert.equal(data.readUInt32LE(0),0x04034b50);assert.ok(response.headers.get('content-type').includes(format==='docx'?'wordprocessingml':'epub+zip'));}
 assert.equal((await request('/api/status')).data.interface,'studio-19');
});

test('HTTP: visual salva formato, reabre e bloqueia cliente textual ou hash obsoleto',async t=>{
 const {fixture,post,request}=await setup(t),{p,route,id}=await fixture();const text=await post(route+'/text',{id,text:'Visual',base_hash:p.document_hashes[id]});
 assert.ok(text.data.rich_hash);const enabled=await post(route+'/rich-enable',{id,base_rich_hash:text.data.rich_hash});assert.equal(enabled.status,200);assert.ok(enabled.data.migration_backup?.id);
 const rich={schema_version:1,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Visual',marks:[{type:'strong'}]}]}]}};
 const saved=await post(route+'/rich-save',{id,rich_document:rich,base_rich_hash:enabled.data.rich_hash});assert.equal(saved.status,200);assert.notEqual(saved.data.rich_hash,enabled.data.rich_hash);
 assert.equal((await post(route+'/rich-save',{id,rich_document:rich,base_rich_hash:enabled.data.rich_hash})).status,409);
 assert.equal((await post(route+'/text',{id,text:'Perda',base_hash:saved.data.hash})).status,409);
 const current=(await request(route)).data;assert.equal(current.rich_documents[id].doc.content[0].content[0].marks[0].type,'strong');assert.equal(current.documents[id],'Visual');
 const version=await post(route+'/snapshot',{id,base_hash:saved.data.hash,base_rich_hash:saved.data.rich_hash});assert.equal(version.status,200);
 const plain=await post(route+'/rich-disable',{id,base_rich_hash:saved.data.rich_hash});assert.equal(plain.status,200);assert.equal((await request(route)).data.rich_documents[id],undefined);
 assert.equal((await post(route+'/restore-snapshot',{id:version.data.id,base_hash:plain.data.hash,base_rich_hash:plain.data.rich_hash})).status,200);assert.ok((await request(route)).data.rich_documents[id]);
});
test('HTTP: schema visual hostil é rejeitado sem alterar projeto ou snapshots',async t=>{
 const {fixture,post,request}=await setup(t),{p,route,id}=await fixture(),before=(await request(route)).data;
 const rich_document={schema_version:1,doc:{type:'doc',content:[{type:'image',attrs:{src:'https://evil.test/x'}}]}};
 assert.equal((await post(route+'/rich-save',{id,rich_document,base_rich_hash:p.rich_hashes[id]})).status,400);assert.deepEqual((await request(route)).data,before);
});

test('HTTP: falha de backup impede migração visual sem alterar arquivo original',async t=>{
 const {fixture,post,request,base}=await setup(t,{blockBackup:true}),{p,route,id}=await fixture();
 const file=path.join(base,p.id+'.wroom','project.json'),before=await readFile(file);
 const result=await post(route+'/rich-enable',{id,base_rich_hash:p.rich_hashes[id]});
 assert.equal(result.status,500);assert.deepEqual(await readFile(file),before);
 const after=(await request(route)).data;assert.equal(after.schema_version,1);assert.equal(after.rich_documents,undefined);assert.deepEqual(after.snapshots,p.snapshots);
});
test('HTTP: revisão de comentário conflita mesmo sem mudar texto; export não revela comentário',async t=>{
 const {annotateDocument,reviseAnnotation}=await import('../../editor/src/annotations.mjs');const {plainToRich}=await import('../../editor/src/schema.mjs');
 const {fixture,post,request}=await setup(t),{p,route,id}=await fixture();const comment='n-'+randomUUID();
 let rich=annotateDocument(plainToRich('Trecho de revisão'),{type:'comment',id:comment,body:'REVISÃO PRIVADA',from:1,to:7});
 rich=annotateDocument(rich,{type:'footnote',id:'n-'+randomUUID(),body:'Fonte para publicação',from:1,to:7});
 const saved=await post(route+'/rich-save',{id,rich_document:rich,base_rich_hash:p.rich_hashes[id]});assert.equal(saved.status,200);assert.ok(saved.data.migration_backup.id);
 const revised=reviseAnnotation(rich,comment,{resolved:true});const result=await post(route+'/rich-save',{id,rich_document:revised,base_rich_hash:saved.data.rich_hash});assert.equal(result.status,200);assert.equal(result.data.hash,saved.data.hash);assert.notEqual(result.data.rich_hash,saved.data.rich_hash);
 assert.equal((await post(route+'/rich-save',{id,rich_document:rich,base_rich_hash:saved.data.rich_hash})).status,409);
 for(const format of ['html','txt','md']){const output=(await request(route+'/export?format='+format)).data;assert.ok(output.includes('Fonte para publicação'));assert.ok(!output.includes('REVISÃO PRIVADA'));}
 assert.equal((await request(route)).data.rich_documents[id].doc.content[0].content[0].marks.find(m=>m.type==='comment').attrs.resolved,true);
});
test('HTTP: anexo é pré-visualizado sem migrar, confirmado com backup e baixado sem alterar bytes',async t=>{
 const {fixture,post,request,port,base}=await setup(t),{p,route}=await fixture(),input={name:'Referência.md',data_base64:Buffer.from('# Fonte\r\nTexto literal <script>sem execução</script>').toString('base64')};
 const before=(await request(route)).data,preview=await post(route+'/attachment-preview',input);assert.equal(preview.status,200);assert.equal(preview.data.mime,'text/markdown');assert.deepEqual((await request(route)).data,before);
 const result=await post(route+'/attachment-add',{...input,expected_sha256:preview.data.sha256,base_hash:p.attachments_hash});assert.equal(result.status,200);assert.ok(result.data.migration_backup.id);
 const current=(await request(route)).data;assert.equal(current.schema_version,3);assert.notEqual(current.attachments_hash,p.attachments_hash);const asset=current.attachments[0];
 const response=await fetch(`http://127.0.0.1:${port}${route}/asset?id=${asset.id}&preview=1`);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'text/markdown');assert.match(response.headers.get('content-disposition'),/^attachment;/);assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(input.data_base64,'base64'));assert.match(response.headers.get('content-security-policy'),/object-src 'none'/);
 assert.equal((await post(route+'/attachment-add',{...input,expected_sha256:preview.data.sha256,base_hash:p.attachments_hash})).status,409);
 assert.equal((await post(route+'/metadata',{id:result.data.id,patch:{include_in_compile:true}})).status,400);
 await post(route+'/trash',{id:result.data.id});assert.equal((await request(route+'/asset?id='+asset.id)).status,404);await post(route+'/restore',{id:result.data.id});assert.equal((await fetch(`http://127.0.0.1:${port}${route}/asset?id=${asset.id}`)).status,200);
 const raw=JSON.parse(await readFile(path.join(base,p.id+'.wroom','project.json')));assert.equal(raw.attachments_hash,undefined);assert.equal(raw.attachments[0].data_base64,input.data_base64);
});
test('HTTP: anexo inválido ou backup bloqueado deixa arquivo do projeto intacto',async t=>{
 const {fixture,post,base}=await setup(t,{blockBackup:true}),{p,route}=await fixture(),file=path.join(base,p.id+'.wroom','project.json'),before=await readFile(file),input={name:'fonte.txt',data_base64:Buffer.from('Fonte preservada').toString('base64')};
 const preview=await post(route+'/attachment-preview',input);assert.equal(preview.status,200);
 assert.equal((await post(route+'/attachment-add',{...input,expected_sha256:'incompatível',base_hash:p.attachments_hash})).status,400);assert.deepEqual(await readFile(file),before);
 assert.equal((await post(route+'/attachment-add',{...input,expected_sha256:preview.data.sha256,base_hash:p.attachments_hash})).status,500);assert.deepEqual(await readFile(file),before);
 assert.equal((await post(route+'/attachment-preview',{name:'../privado.txt',data_base64:input.data_base64})).status,400);
});
test('HTTP: biblioteca duplica e arquiva/restaura com bytes originais intactos',async t=>{
 const {fixture,request,post,base}=await setup(t),{p,route}=await fixture(),file=path.join(base,p.id+'.wroom','project.json'),before=await readFile(file);
 const duplicate=await post(route+'/project-duplicate',{name:'Cópia escolhida'});assert.equal(duplicate.status,200);assert.notEqual(duplicate.data.id,p.id);assert.equal(duplicate.data.name,'Cópia escolhida');assert.deepEqual(await readFile(file),before);
 assert.equal((await post(route+'/project-archive',{})).status,200);assert.equal((await request('/api/projects')).data.length,1);assert.equal((await request('/api/projects?archived=1')).data[0].id,p.id);assert.equal((await request(route)).status,404);
 assert.deepEqual(await readFile(path.join(base,'.archived',p.id+'.wroom','project.json')),before);assert.equal((await post(route+'/project-unarchive',{})).status,200);assert.deepEqual(await readFile(file),before);assert.equal((await request('/api/projects')).data.length,2);
});
test('HTTP: organizar/desfazer exige estrutura atual e duplicação preserva texto',async t=>{
 const {fixture,request,post}=await setup(t),{p,route,id}=await fixture();const added=await post(route+'/nodes',{parent_id:p.roots.draft,title:'Outra'}),current=(await request(route)).data;
 assert.equal((await post(route+'/organize',{id:added.data.id,target_id:id,placement:'before',base_hash:p.structure_hash})).status,409);
 const moved=await post(route+'/organize',{id:added.data.id,target_id:id,placement:'before',base_hash:current.structure_hash});assert.equal(moved.status,200);
 assert.equal((await post(route+'/undo-organize',{previous:moved.data.previous,base_hash:moved.data.structure_hash})).status,200);assert.equal((await request(route)).data.structure_hash,current.structure_hash);
 const duplicate=await post(route+'/duplicate-node',{id});assert.equal(duplicate.status,200);assert.notEqual(duplicate.data.id,id);assert.equal((await request(route)).data.documents[duplicate.data.id],p.documents[id]);
});
test('HTTP: catálogo, autoria explícita e perfil privado não vazam para backup de obra',async t=>{
 const {request,post}=await setup(t),catalog=(await request('/api/catalog')).data;assert.equal(catalog.length,20);const current=(await request('/api/profile')).data;
 const profile={version:1,real_name:'Nome',pseudonym:'Pseudônimo',use_pseudonym:true,address:'PRIVATE-CONTACT-ADDRESS',phone:'PRIVATE-PHONE',email:'private@example.invalid',bio:'Biografia privada'};
 const preview=await post('/api/profile-preview',{profile});assert.equal(preview.status,200);assert.equal((await request('/api/profile')).data.hash,current.hash);
 const saved=await post('/api/profile',{profile,base_hash:current.hash});assert.equal(saved.status,200);assert.equal((await post('/api/profile',{profile,base_hash:current.hash})).status,409);
 const created=await post('/api/projects',{name:'Roteiro',template:'screenplay',preset:'historical',author:'Pseudônimo'});assert.equal(created.status,201);assert.equal(created.data.settings.author,'Pseudônimo');assert.equal(created.data.settings.project_type,'screenplay');const backup=await request('/api/projects/'+created.data.id+'/backup');assert.ok(!JSON.stringify(backup).includes('PRIVATE-CONTACT'));assert.ok(!JSON.stringify(backup).includes('PRIVATE-PHONE'));
 assert.equal((await post('/api/profile',{backup:preview.data,base_hash:saved.data.hash})).status,200);
});
test('HTTP: fonte migra com backup, protege hash e não perde vínculos ao restaurar',async t=>{
 const {fixture,post,request}=await setup(t),{p,route,id}=await fixture(),source={url:'https://example.org',author:'Autor da fonte',publisher:'Acervo',date:'1918',accessed:'2026-11-02',basis:'documented',refs:[id]};
 const created=await post(route+'/source',{operation:'create',title:'Fonte vinculada',source});assert.equal(created.status,200);assert.ok(created.data.migration_backup.id);const current=(await request(route)).data;assert.equal(current.schema_version,4);assert.deepEqual(current.nodes.find(n=>n.id===created.data.id).source.refs,[id]);
 const updated=await post(route+'/source',{operation:'update',id:created.data.id,title:'Fonte revisada',source,base_hash:created.data.hash});assert.equal(updated.status,200);assert.equal((await post(route+'/source',{operation:'update',id:created.data.id,title:'Conflito',source,base_hash:created.data.hash})).status,409);
 const backup=(await request(route+'/backup')).data,restored=await post('/api/restore',{backup});assert.equal(restored.status,201);const n=restored.data.nodes.find(n=>n.source);assert.ok(restored.data.nodes.some(other=>other.id===n.source.refs[0]));assert.notEqual(n.source.refs[0],id);assert.ok(!JSON.stringify(backup.project).includes('source_hashes'));
});
test('HTTP: backup indisponível impede primeira fonte sem modificar arquivo',async t=>{const {fixture,post,base}=await setup(t,{blockBackup:true}),{p,route,id}=await fixture(),file=path.join(base,p.id+'.wroom','project.json'),before=await readFile(file),source={url:'',author:'',publisher:'',date:'',accessed:'',basis:'unclassified',refs:[id]};assert.equal((await post(route+'/source',{operation:'create',title:'Fonte',source})).status,500);assert.deepEqual(await readFile(file),before);});
test('HTTP: central cria/verifica/baixa e restaura cópia local sem mudar original',async t=>{
 const {fixture,request,post,port,base}=await setup(t),{p,route}=await fixture(),before=await readFile(path.join(base,p.id+'.wroom','project.json'));
 const initial=(await request('/api/backup-center')).data;assert.equal(initial.settings.enabled,false);assert.equal(initial.history.length,0);
 const created=await post('/api/backup-center/create',{project_id:p.id,destination:'local'});assert.equal(created.status,200);const input={project_id:p.id,id:created.data.manifest.id,destination:'local'};assert.equal((await post('/api/backup-center/verify',input)).data.verified,true);
 const response=await fetch(`http://127.0.0.1:${port}/api/backup-center/download?`+new URLSearchParams(input));assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment/);const bundle=await response.json();assert.equal(bundle.project.id,p.id);
 const restored=await post('/api/backup-center/restore',input);assert.equal(restored.status,200);assert.notEqual(restored.data.id,p.id);assert.deepEqual(Object.values(restored.data.documents),Object.values(p.documents));assert.deepEqual(await readFile(path.join(base,p.id+'.wroom','project.json')),before);
 assert.equal((await request('/api/backup-center')).data.history.length,1);
 assert.equal((await request('/api/backup-center?project_id='+restored.data.id)).data.history.length,0);
 assert.equal((await request('/api/backup-center?project_id=invalid')).status,400);
 assert.equal((await post('/api/backup-center/create',{project_id:'../escape'})).status,400);assert.equal((await post('/api/backup-center/verify',{...input,id:'../escape'})).status,400);
});
test('HTTP: rotina é opt-in, configuração conflitante não substitui e não duplica obra sem mudanças',async t=>{
 const {fixture,request,post}=await setup(t),{p,route,id}=await fixture(),initial=(await request('/api/backup-center')).data;assert.equal((await post('/api/backup-center/run',{})).status,400);
 const settings={...initial.settings,enabled:true,retain_automatic:2,interval_minutes:15};assert.equal((await post('/api/backup-center/settings',{settings,base_hash:initial.hash})).status,200);assert.equal((await post('/api/backup-center/settings',{settings:initial.settings,base_hash:initial.hash})).status,409);
 const first=await post('/api/backup-center/run',{});assert.equal(first.status,200);assert.ok(first.data.results[0].backup_id);const second=await post('/api/backup-center/run',{});assert.equal(second.data.results[0].unchanged,true);assert.equal((await request('/api/backup-center')).data.history.length,1);
 await post(route+'/text',{id,text:'Conteúdo novo',base_hash:p.document_hashes[id]});const third=await post('/api/backup-center/run',{});assert.ok(third.data.results[0].backup_id);assert.equal((await request('/api/backup-center')).data.history.length,2);
 await post(route+'/project-archive',{});assert.equal((await post('/api/backup-center/run',{})).data.results.length,0);const manual=await post('/api/backup-center/create',{project_id:p.id,archived:true});assert.equal(manual.status,200);
});
test('HTTP: cópia adulterada é recusada e destino bloqueado registra falha sem apagar fonte',async t=>{
 const {fixture,request,post,base}=await setup(t),{p}=await fixture(),created=await post('/api/backup-center/create',{project_id:p.id}),input={project_id:p.id,id:created.data.manifest.id,destination:'local'},file=path.join(base,'migration-backups','managed',p.id,input.id,'backup.json');await writeFile(file,'corrompido');assert.equal((await post('/api/backup-center/verify',input)).status,500);assert.equal((await post('/api/backup-center/restore',input)).status,500);assert.equal((await request('/api/projects')).data.length,1);
 const other=await setup(t,{blockBackup:true}),f=await other.fixture(),original=await readFile(path.join(other.base,f.p.id+'.wroom','project.json'));assert.equal((await other.post('/api/backup-center/create',{project_id:f.p.id})).status,500);assert.deepEqual(await readFile(path.join(other.base,f.p.id+'.wroom','project.json')),original);assert.equal((await other.request('/api/backup-center')).data.state.projects['local:'+f.p.id].result,'failed');
});

test('HTTP: temporizador do servidor executa rotina habilitada sem navegador aberto',async t=>{
 const {fixture,request,post}=await setup(t,{backupTickMs:1000}),{p}=await fixture(),initial=(await request('/api/backup-center')).data;
 await post('/api/backup-center/settings',{settings:{...initial.settings,enabled:true},base_hash:initial.hash});let current;
 for(let i=0;i<40;i++){await new Promise(resolve=>setTimeout(resolve,100));current=(await request('/api/backup-center')).data;if(current.history.length)break;}
 assert.equal(current.history.length,1);assert.equal(current.history[0].kind,'automatic');assert.equal(current.state.projects['local:'+p.id].result,'created');
 await post('/api/backup-center/settings',{settings:{...current.settings,enabled:false},base_hash:current.hash});assert.equal((await post('/api/backup-center/run',{})).status,400);
});

test('HTTP tradução: migração protegida, publicação só destino e revisão bilíngue',async t=>{
 const {post,request}=await setup(t);const p=(await post('/api/projects',{name:'Tradução HTTP',template:'translation-book'})).data;
 const pair=await post(`/api/projects/${p.id}/translation`,{title:'Seção',from:'en',to:'pt-BR',original:'SOURCE-PRIVATE-123',translation:'DESTINO-123'});assert.equal(pair.status,200);
 const loaded=(await request(`/api/projects/${p.id}`)).data;assert.equal(loaded.schema_version,4);assert.ok(pair.data.migration_backup);
 const compiled=(await request(`/api/projects/${p.id}/export?format=txt`)).data;assert.ok(compiled.includes('DESTINO-123'));assert.ok(!compiled.includes('SOURCE-PRIVATE'));
 const review=(await request(`/api/projects/${p.id}/bilingual`)).data;assert.ok(review.includes('SOURCE-PRIVATE'));assert.ok(review.includes('DESTINO-123'));
 assert.equal((await post(`/api/projects/${p.id}/glossary`,{term:'house',from:'en',to:'pt',equivalents:'casa'})).status,200);
 assert.equal((await post(`/api/projects/${p.id}/translation`,{title:'Erro',from:'en',to:'en',original:'x'})).status,400);
});
test('HTTP tradução/glossário: falha no backup de migração preserva obra anterior',async t=>{
 const {post,request}=await setup(t,{blockBackup:true});const p=(await post('/api/projects',{name:'Preservar'})).data;
 for(const [action,input] of [['translation',{title:'Seção',from:'en',to:'pt',original:'x'}],['glossary',{term:'x',from:'en',to:'pt'}]]){assert.notEqual((await post(`/api/projects/${p.id}/${action}`,input)).status,200);assert.deepEqual((await request(`/api/projects/${p.id}`)).data,p);}
});

test('HTTP tradução: alteração confirmada do original reabre revisão sem afetar tradução',async t=>{
 const {post,request}=await setup(t);const p=(await post('/api/projects',{name:'Revisão'})).data,pair=(await post(`/api/projects/${p.id}/translation`,{title:'Seção',from:'en',to:'pt',original:'Original',translation:'Tradução'})).data;
 const route=`/api/projects/${p.id}`;await post(route+'/metadata',{id:pair.target_id,patch:{status:'done'}});let loaded=(await request(route)).data;
 assert.equal((await post(route+'/text',{id:pair.source_id,text:'Outra versão',base_hash:'0'.repeat(64)})).status,409);assert.equal((await request(route)).data.nodes.find(n=>n.id===pair.target_id).status,'done');
 assert.equal((await post(route+'/text',{id:pair.source_id,text:'Outra versão',base_hash:loaded.document_hashes[pair.source_id]})).status,200);loaded=(await request(route)).data;
 assert.equal(loaded.nodes.find(n=>n.id===pair.target_id).status,'review');assert.equal(loaded.documents[pair.target_id],'Tradução');
});

test('HTTP anexo: extrair prévia é leitura; criar pesquisa/tradução exige SHA e mantém vínculos',async t=>{
 const {post,request}=await setup(t);const p=(await post('/api/projects',{name:'Pesquisa anexada'})).data,route=`/api/projects/${p.id}`,input={name:'original.txt',data_base64:Buffer.from('Fonte pesquisável 1920').toString('base64')},preview=(await post(route+'/attachment-preview',input)).data;
 const added=(await post(route+'/attachment-add',{...input,expected_sha256:preview.sha256,base_hash:p.attachments_hash})).data,before=(await request(route)).data;
 const extracted=await post(route+'/extract-attachment',{asset_id:added.asset_id});assert.equal(extracted.status,200);assert.equal(extracted.data.text,'Fonte pesquisável 1920');assert.deepEqual((await request(route)).data,before);
 assert.equal((await post(route+'/use-extraction',{...extracted.data,title:'Fonte',mode:'research',sha256:'bad'})).status,400);
 const linked=await post(route+'/use-extraction',{...extracted.data,title:'Fonte',mode:'research'});assert.equal(linked.status,200);assert.ok(linked.data.migration_backup);assert.equal((await request(route)).data.nodes.find(n=>n.id===linked.data.id).source.refs[0],added.id);
 const pair=await post(route+'/use-extraction',{...extracted.data,title:'Tradução',mode:'translation',from:'pt',to:'en'});assert.equal(pair.status,200);assert.equal((await request(route)).data.nodes.find(n=>n.id===pair.data.source_id).source.refs.length,2);
});
test('HTTP base lexical: importação explícita, consulta, export e ausência de serviço de tradução',async t=>{
 const {post,request}=await setup(t),data={format:'writingroom-lexicon-1',name:'Autoral',source:'Autor',license:'Autorizado',entries:[{term:'casa',language:'pt-BR',definition:'Moradia',synonyms:['lar'],translations:[]}]};
 assert.equal((await post('/api/language/lexicon',{operation:'import',data,confirm:false})).status,400);assert.equal((await post('/api/language/lexicon',{operation:'import',data,confirm:true})).status,200);assert.equal((await post('/api/language/lexicon',{operation:'lookup',term:'casa',language:'pt-BR'})).data.results[0].definition,'Moradia');assert.deepEqual((await request('/api/language/lexicon')).data,data);
 assert.equal((await post('/api/language/translate',{text:'House',from:'en',to:'pt',consent:false})).status,400);
});

test('HTTP comparação: somente leitura entre snapshots da mesma cena e texto atual do disco',async t=>{const {post,request}=await setup(t),p=(await post('/api/projects',{name:'Comparar'})).data,route=`/api/projects/${p.id}`,id=(await post(route+'/nodes',{parent_id:p.roots.draft,title:'Cena'})).data.id;let saved=(await request(route)).data;const snap=(await post(route+'/snapshot',{id,label:'Anterior',base_hash:saved.document_hashes[id]})).data.id;await post(route+'/text',{id,text:'Outra sessão',base_hash:saved.document_hashes[id]});saved=(await request(route)).data;const comparison=await post(route+'/compare-versions',{node_id:id,left:snap,right:'current'});assert.equal(comparison.status,200);assert.equal(comparison.data.rows[0].right,'Outra sessão');assert.deepEqual((await request(route)).data,saved);assert.equal((await post(route+'/compare-versions',{node_id:id,left:'missing'})).status,400);});

test('HTTP redline: migração verificada, aceitação com CAS/histórico e rejeição sem texto novo',async t=>{const {post,request}=await setup(t),p=(await post('/api/projects',{name:'Revisão local'})).data,route=`/api/projects/${p.id}`,id=(await post(route+'/nodes',{parent_id:p.roots.draft,title:'Cena'})).data.id;let current=(await request(route)).data;await post(route+'/text',{id,text:'Casa azul',base_hash:current.document_hashes[id]});current=(await request(route)).data;const input={node_id:id,start:5,end:9,replacement:'verde',author:'Editor',role:'editor',reason:'Coerência',base_hash:current.rich_hashes[id]},proposed=await post(route+'/review-propose',input);assert.equal(proposed.status,200);assert.ok(proposed.data.migration_backup.id);current=(await request(route)).data;assert.equal(current.schema_version,5);assert.equal(current.documents[id],'Casa azul');const r=current.reviews[0],decision={id:r.id,operation:'accept',author:'Escritor',reason:'Aceito',base_hash:current.rich_hashes[id],base_review_hash:current.review_hashes[r.id]};assert.equal((await post(route+'/review-decide',decision)).status,200);current=(await request(route)).data;assert.equal(current.documents[id],'Casa verde');assert.equal(current.reviews[0].status,'accepted');assert.equal(current.snapshots.find(s=>s.id===current.reviews[0].snapshot_id).content,'Casa azul');assert.equal((await post(route+'/review-decide',decision)).status,409);});
test('HTTP redline: falha de backup de migração impede criação da proposta',async t=>{const {post,request}=await setup(t,{blockBackup:true}),p=(await post('/api/projects',{name:'Preservar'})).data,route=`/api/projects/${p.id}`,id=(await post(route+'/nodes',{parent_id:p.roots.draft,title:'Cena'})).data.id,current=(await request(route)).data;const result=await post(route+'/review-propose',{node_id:id,start:0,end:0,replacement:'Novo',author:'Escritor',role:'writer',reason:'',base_hash:current.rich_hashes[id]});assert.notEqual(result.status,200);assert.deepEqual((await request(route)).data,current);});
test('HTTP redline: alterar cena bloqueia aceite, mantém proposta pendente e permite rejeitar',async t=>{const {post,request}=await setup(t),p=(await post('/api/projects',{name:'Conflito'})).data,route=`/api/projects/${p.id}`,id=(await post(route+'/nodes',{parent_id:p.roots.draft,title:'Cena'})).data.id;let current=(await request(route)).data;const result=await post(route+'/review-propose',{node_id:id,start:0,end:0,replacement:'Novo',author:'Editor',role:'editor',reason:'',base_hash:current.rich_hashes[id]});current=(await request(route)).data;await post(route+'/text',{id,text:'Outra sessão',base_hash:current.document_hashes[id]});const changed=(await request(route)).data,input={id:result.data.id,operation:'accept',author:'Autor',reason:'',base_hash:changed.rich_hashes[id],base_review_hash:changed.review_hashes[result.data.id]};assert.equal((await post(route+'/review-decide',input)).status,409);assert.deepEqual((await request(route)).data,changed);assert.equal((await post(route+'/review-decide',{...input,operation:'reject'})).status,200);assert.equal((await request(route)).data.documents[id],'Outra sessão');});

test('HTTP modo Editor: painel, CAS, migração verificada e backup formato 6',async t=>{
 const {request,post,fixture,base}=await setup(t),{p,route,id}=await fixture();
 const tracking={responsible:'Editora local',stage:'assessment',notes:'Observação',next_steps:'Ler cena'};
 const before=await request('/api/editorial');assert.equal(before.data[0].pending,0);assert.equal((await request(route)).data.schema_version,1);
 const saved=await post(route+'/editorial-tracking',{tracking,base_hash:p.tracking_hash});assert.equal(saved.status,200);
 const current=(await request(route)).data;assert.equal(current.schema_version,6);assert.deepEqual(current.documents,p.documents);assert.deepEqual(current.editorial_tracking,tracking);
 assert.equal((await post(route+'/editorial-tracking',{tracking,base_hash:p.tracking_hash})).status,409);
 const dirs=await readdir(path.join(base,'migration-backups',p.id));assert.equal(dirs.length,1);const manifest=JSON.parse(await readFile(path.join(base,'migration-backups',p.id,dirs[0],'manifest.json')));assert.equal(manifest.target_schema,6);
 const summary=(await request('/api/editorial')).data[0];assert.deepEqual(summary.tracking,tracking);assert.equal(summary.tracking_hash,current.tracking_hash);
 const proposal=await post(route+'/review-propose',{node_id:id,start:0,end:0,replacement:'Texto',author:'E',role:'editor',reason:'',base_hash:current.rich_hashes[id]});assert.equal(proposal.status,200);assert.equal((await request('/api/editorial')).data[0].pending,1);assert.equal((await request(route)).data.schema_version,6);
 const backup=(await request(route+'/backup')).data,restored=await post('/api/restore',{backup});assert.equal(restored.status,201);assert.deepEqual(restored.data.editorial_tracking,tracking);assert.notEqual(restored.data.reviews[0].node_id,id);
});
test('HTTP acompanhamento: backup bloqueado impede migração e mantém original',async t=>{const {request,post,fixture}=await setup(t,{blockBackup:true}),{p,route}=await fixture();const before=(await request(route)).data;assert.ok((await post(route+'/editorial-tracking',{tracking:{responsible:'',stage:'unassigned',notes:'',next_steps:''},base_hash:p.tracking_hash})).status>=400);assert.deepEqual((await request(route)).data,before);});

test('HTTP pacote: prévia/cifra não gravam, abertura em staging e confirmação isolada repetível',async t=>{
 const {post,request,fixture}=await setup(t),{p,route,id}=await fixture(),input={title:'Cópia autorizada',sender:'Autor declarado',recipient:'Editor declarado',node_ids:[id]},passphrase='Frase secreta para teste HTTP';
 const before=(await request(route)).data,candidates=await request(route+'/package-candidates');assert.equal(candidates.status,200);assert.equal(candidates.data[0].id,id);
 const preview=await post(route+'/package-preview',input);assert.equal(preview.status,200);const exported=await post(route+'/package-export',{...input,preview_hash:preview.data.hash,passphrase,confirm_passphrase:passphrase});assert.equal(exported.status,200);assert.deepEqual((await request(route)).data,before);assert.equal((await request('/api/projects')).data.length,1);
 const file=JSON.stringify(exported.data),opened=await post('/api/packages/open',{file,passphrase,recipient:input.recipient});assert.equal(opened.status,200);assert.equal((await request('/api/projects')).data.length,1);assert.equal(opened.data.content.scenes.length,1);
 assert.equal((await post('/api/packages/confirm',{token:opened.data.token})).status,400);const confirmed=await post('/api/packages/confirm',{token:opened.data.token,confirm:true});assert.equal(confirmed.status,201);assert.notEqual(confirmed.data.id,p.id);assert.deepEqual((await post('/api/packages/confirm',{token:opened.data.token,confirm:true})).data,confirmed.data);
 assert.equal((await request('/api/projects')).data.length,2);assert.deepEqual((await request(route)).data,before);const copy=(await request('/api/projects/'+confirmed.data.id)).data;assert.ok(copy.name.includes('pacote'));assert.equal(copy.snapshots.length,0);assert.notEqual(copy.nodes.find(n=>n.kind==='text').id,id);
 const canceled=await post('/api/packages/open',{file,passphrase,recipient:input.recipient});assert.equal((await post('/api/packages/cancel',{token:canceled.data.token})).status,200);assert.equal((await post('/api/packages/confirm',{token:canceled.data.token,confirm:true})).status,400);assert.equal((await request('/api/projects')).data.length,2);
});
test('HTTP pacote: CAS, senha/identificação incorretas e rotas/origin recusadas sem nova obra',async t=>{
 const {post,request,fixture}=await setup(t),{route,id,p}=await fixture(),input={title:'Leitura',sender:'A',recipient:'B',node_ids:[id]},passphrase='Uma frase HTTP secreta longa';const preview=(await post(route+'/package-preview',input)).data;
 await post(route+'/text',{id,text:'Nova base',base_hash:p.document_hashes[id]});assert.equal((await post(route+'/package-export',{...input,preview_hash:preview.hash,passphrase,confirm_passphrase:passphrase})).status,409);
 const updated=(await post(route+'/package-preview',input)).data,envelope=(await post(route+'/package-export',{...input,preview_hash:updated.hash,passphrase,confirm_passphrase:passphrase})).data,file=JSON.stringify(envelope);
 for(const values of [{file,passphrase:'Uma frase HTTP incorreta',recipient:'B'},{file,passphrase,recipient:'A'},{file:file.slice(0,-4),passphrase,recipient:'B'}])assert.equal((await post('/api/packages/open',values)).status,400);
 assert.equal((await request('/api/packages/open')).status,405);assert.equal((await post('/api/packages/unknown',{})).status,404);assert.equal((await request('/api/packages/open','POST',{file,passphrase,recipient:'B'},{origin:'https://evil.invalid'})).status,403);assert.equal((await request('/api/projects')).data.length,1);
});
test('HTTP pacote: concorrência de KDF limitada a uma operação por instância',async t=>{
 const {post,fixture}=await setup(t),{route,id}=await fixture(),input={title:'L',sender:'A',recipient:'B',node_ids:[id]},passphrase='Uma frase de concorrência longa',preview=(await post(route+'/package-preview',input)).data,envelope=(await post(route+'/package-export',{...input,preview_hash:preview.hash,passphrase,confirm_passphrase:passphrase})).data;
 const results=await Promise.all([1,2].map(()=>post('/api/packages/open',{file:JSON.stringify(envelope),passphrase,recipient:'B'})));assert.deepEqual(results.map(r=>r.status).sort(),[200,429]);
});

test('HTTP identidades e pacote v2: duas instalações, pins, backup, assinatura e revogação antes de confirmar',async t=>{
 const author=await setup(t),editor=await setup(t),{route,id}=await author.fixture(),keyPhrase='Frase privada exclusiva da chave',passphrase='Frase compartilhada do pacote';
 async function create(client,name){const state=(await client.request('/api/identities')).data;const result=await client.post('/api/identities/create',{name,passphrase:keyPhrase,confirm_passphrase:keyPhrase,base_hash:state.hash});assert.equal(result.status,200);return result.data;}
 const a=await create(author,'Autor'),b=await create(editor,'Editor');function card(i){return {format:'writingroom-public-key',version:1,name:i.name,public_key:i.public_key,fingerprint:i.fingerprint};}
 assert.ok(!JSON.stringify(a).includes('ciphertext'));assert.ok(!JSON.stringify(a).includes(keyPhrase));const ac=card(a.identities[0]),bc=card(b.identities[0]);
 const ap=(await author.post('/api/identities/trust-preview',{file:JSON.stringify(bc)}));assert.equal(ap.status,200);assert.equal((await author.request('/api/identities')).data.contacts.length,0);
 assert.equal((await author.post('/api/identities/trust',{file:JSON.stringify(bc),confirmed_fingerprint:'0'.repeat(64),base_hash:a.hash})).status,400);
 const trustedA=(await author.post('/api/identities/trust',{file:JSON.stringify(bc),confirmed_fingerprint:bc.fingerprint,base_hash:a.hash})).data;
 const trustedB=(await editor.post('/api/identities/trust',{file:JSON.stringify(ac),confirmed_fingerprint:ac.fingerprint,base_hash:b.hash})).data;
 const backup=(await author.post('/api/identities/backup',{fingerprint:ac.fingerprint})).data;assert.ok(backup.key.ciphertext);assert.ok(!JSON.stringify(backup).includes(keyPhrase));
 const recovery=await setup(t),empty=(await recovery.request('/api/identities')).data;assert.equal((await recovery.post('/api/identities/restore',{file:JSON.stringify(backup),passphrase:'Uma frase incorreta longa',base_hash:empty.hash})).status,400);assert.equal((await recovery.request('/api/identities')).data.identities.length,0);const restored=await recovery.post('/api/identities/restore',{file:JSON.stringify(backup),passphrase:keyPhrase,base_hash:empty.hash});assert.equal(restored.data.active_fingerprint,ac.fingerprint);assert.equal(restored.data.contacts.length,0);
 const input={title:'Leitura assinada',sender:'Nome declarado',recipient:'Editor declarado',node_ids:[id],signature_mode:'signed',identity_hash:trustedA.hash,sender_fingerprint:ac.fingerprint,recipient_fingerprint:bc.fingerprint},before=(await author.request(route)).data,preview=(await author.post(route+'/package-preview',input)).data;
 assert.equal(preview.signing.sender_fingerprint,ac.fingerprint);const encrypted=await author.post(route+'/package-export',{...input,preview_hash:preview.hash,passphrase,confirm_passphrase:passphrase,key_passphrase:keyPhrase});assert.equal(encrypted.status,200);assert.equal(encrypted.data.version,2);
 const opened=await editor.post('/api/packages/open',{file:JSON.stringify(encrypted.data),passphrase,recipient:input.recipient,require_signature:true});assert.equal(opened.status,200);assert.equal(opened.data.verification.kind,'pinned-key');assert.equal(opened.data.verification.contact_name,'Autor');const first=await editor.post('/api/packages/confirm',{token:opened.data.token,confirm:true});assert.equal(first.status,201);
 const pending=await editor.post('/api/packages/open',{file:JSON.stringify(encrypted.data),passphrase,recipient:input.recipient,require_signature:true});assert.equal(pending.status,200);assert.equal((await editor.post('/api/identities/revoke',{fingerprint:ac.fingerprint,base_hash:trustedB.hash})).status,200);assert.equal((await editor.post('/api/packages/confirm',{token:pending.data.token,confirm:true})).status,400);assert.equal((await editor.request('/api/projects')).data.length,1);assert.equal((await editor.post('/api/packages/open',{file:JSON.stringify(encrypted.data),passphrase,recipient:input.recipient,require_signature:true})).status,400);assert.deepEqual((await author.request(route)).data,before);
});
test('HTTP identidade: CAS, origem, frases divergentes e substituição sem impressão não mudam estado',async t=>{const {request,post}=await setup(t),initial=(await request('/api/identities')).data,input={name:'Autora',passphrase:'Uma frase exclusiva de chave',confirm_passphrase:'Uma frase exclusiva de chave',base_hash:initial.hash};assert.equal((await request('/api/identities/create','POST',input,{origin:'https://evil.invalid'})).status,403);assert.equal((await post('/api/identities/create',{...input,confirm_passphrase:'Outra frase longa diferente'})).status,400);assert.deepEqual((await request('/api/identities')).data,initial);const saved=await post('/api/identities/create',input);assert.equal(saved.status,200);assert.equal((await post('/api/identities/create',input)).status,409);assert.equal((await post('/api/identities/create',{...input,base_hash:saved.data.hash})).status,400);assert.deepEqual((await request('/api/identities')).data,saved.data);assert.equal((await request('/api/identities/create')).status,405);});

async function roundHttpFixture(t,options={}){
 let author=await setup(t,options);const editor=await setup(t),{route,id,p}=await author.fixture(),phrase='Frase exclusiva de rodada HTTP';await author.post(route+'/text',{id,text:'Uma casa azul.',base_hash:p.document_hashes[id]});
 async function identity(client,name){const empty=(await client.request('/api/identities')).data;return (await client.post('/api/identities/create',{name,passphrase:phrase,confirm_passphrase:phrase,base_hash:empty.hash})).data;}
 const a=await identity(author,'Autor'),b=await identity(editor,'Editora'),card=i=>({format:'writingroom-public-key',version:1,name:i.name,public_key:i.public_key,fingerprint:i.fingerprint}),ac=card(a.identities[0]),bc=card(b.identities[0]);const as=(await author.post('/api/identities/trust',{file:JSON.stringify(bc),confirmed_fingerprint:bc.fingerprint,base_hash:a.hash})).data,bs=(await editor.post('/api/identities/trust',{file:JSON.stringify(ac),confirmed_fingerprint:ac.fingerprint,base_hash:b.hash})).data;
 const input={title:'Rodada HTTP',sender:'Autor declarado',recipient:'Editora declarada',node_ids:[id],sender_fingerprint:ac.fingerprint,recipient_fingerprint:bc.fingerprint,identity_hash:as.hash},preview=(await author.post(route+'/round-preview',input)).data,created=await author.post(route+'/round-create',{...input,preview_hash:preview.hash,passphrase:phrase,confirm_passphrase:phrase,key_passphrase:phrase});if(created.status!==200)return {author,editor,created,route,id,p,phrase};
 const opened=(await editor.post('/api/round-packages/open',{file:JSON.stringify(created.data.package),passphrase:phrase,recipient:input.recipient})).data,confirmed=await editor.post('/api/round-packages/confirm',{token:opened.token,confirm:true});assert.equal(confirmed.status,200);const copyRoute='/api/projects/'+confirmed.data.id,copy=(await editor.request(copyRoute)).data,copyId=copy.editorial_rounds[0].scenes[0].node_id;assert.equal((await editor.post(copyRoute+'/review-propose',{node_id:copyId,base_hash:copy.rich_hashes[copyId],start:9,end:13,replacement:'verde',author:'Revisora declarada',role:'editor',reason:'Cor'})).status,200);
 const transfer={round_id:created.data.round_id,identity_hash:bs.hash,passphrase:phrase,confirm_passphrase:phrase,key_passphrase:phrase},rp=(await editor.post(copyRoute+'/round-return-preview',transfer)).data,returned=await editor.post(copyRoute+'/round-return-export',{...transfer,preview_hash:rp.hash});assert.equal(returned.status,200);return {author,editor,created,route,id,p,phrase,returnFile:JSON.stringify(returned.data),recipient:input.sender};
}
test('HTTP rodada completa: migração verificada, backup pré-importação, replay após restart e restauração',async t=>{
 const f=await roundHttpFixture(t);let author=f.author;assert.equal(f.created.status,200);const current=(await author.request(f.route)).data;assert.equal(current.schema_version,7);assert.equal(current.documents[f.id],'Uma casa azul.');assert.ok(f.created.data.migration_backup);
 async function open(target=f.p.id){return author.post('/api/round-packages/open',{file:f.returnFile,passphrase:f.phrase,recipient:f.recipient,project_id:target});}
 const stage=await open();assert.equal(stage.status,200);assert.equal(stage.data.preview.imported,1);assert.equal((await author.request(f.route)).data.reviews,undefined);const imported=await author.post('/api/round-packages/confirm',{token:stage.data.token,confirm:true});assert.equal(imported.status,200);assert.equal(imported.data.imported,1);assert.ok(imported.data.checkpoint_id);const source=(await author.request(f.route)).data;assert.equal(source.documents[f.id],'Uma casa azul.');assert.equal(source.reviews.length,1);const r=source.reviews[0];assert.equal((await author.post(f.route+'/review-decide',{id:r.id,operation:'accept',author:'Autor',reason:'Conferido',base_review_hash:source.review_hashes[r.id],base_hash:source.rich_hashes[f.id]})).status,200);
 author.server.closeAllConnections();await new Promise(resolve=>author.server.close(resolve));author=await setup(t,{existingBase:author.base});const replay=await open();assert.equal(replay.data.preview.duplicates,1);assert.equal(replay.data.preview.conflicts,0);assert.equal((await author.post('/api/round-packages/confirm',{token:replay.data.token,confirm:true})).data.imported,0);assert.equal((await author.request(f.route)).data.reviews.length,1);assert.equal((await author.request(f.route)).data.documents[f.id],'Uma casa verde.');
 const restored=await author.post('/api/restore',{backup:(await author.request(f.route+'/backup')).data});assert.equal(restored.status,201);const again=await open(restored.data.id);assert.equal(again.data.preview.duplicates,1);assert.equal((await author.post('/api/round-packages/confirm',{token:again.data.token,confirm:true})).data.imported,0);assert.equal((await author.request('/api/projects/'+restored.data.id)).data.reviews.length,1);
});
test('HTTP rodada: conflito depois da prévia e falha de checkpoint preservam texto, recibos e histórico',async t=>{
 const f=await roundHttpFixture(t),{author}=f;const open=()=>author.post('/api/round-packages/open',{file:f.returnFile,passphrase:f.phrase,recipient:f.recipient,project_id:f.p.id}),stage=await open(),current=(await author.request(f.route)).data;await author.post(f.route+'/text',{id:f.id,text:'Outra base',base_hash:current.document_hashes[f.id]});const before=(await author.request(f.route)).data;assert.equal((await author.post('/api/round-packages/confirm',{token:stage.data.token,confirm:true})).status,409);assert.deepEqual((await author.request(f.route)).data,before);await author.post(f.route+'/text',{id:f.id,text:'Uma casa azul.',base_hash:before.document_hashes[f.id]});const valid=await open(),backupRoot=path.join(author.base,'migration-backups','managed');await writeFile(backupRoot,'blocked');const pre=(await author.request(f.route)).data;assert.ok((await author.post('/api/round-packages/confirm',{token:valid.data.token,confirm:true})).status>=400);assert.deepEqual((await author.request(f.route)).data,pre);await rm(backupRoot);assert.equal((await author.post('/api/round-packages/confirm',{token:valid.data.token,confirm:true})).data.imported,1);
 const latest=(await author.request(f.route)).data;assert.equal((await author.post(f.route+'/round-close',{round_id:f.created.data.round_id,base_hash:latest.round_hashes[f.created.data.round_id]})).status,200);assert.equal((await open()).status,400);assert.equal((await author.request(f.route)).data.reviews[0].status,'pending');
});
test('HTTP rodada: backup de migração bloqueado impede schema 7 e mantém origem inteira',async t=>{const f=await roundHttpFixture(t,{blockBackup:true});assert.ok(f.created.status>=400);const p=(await f.author.request(f.route)).data;assert.equal(p.schema_version,1);assert.equal(p.editorial_rounds,undefined);assert.equal(p.documents[f.id],'Uma casa azul.');});
