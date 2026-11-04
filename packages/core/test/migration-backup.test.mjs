import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {makeProject} from '../src/core.mjs';
import {createMigrationBackup,verifyMigrationBackup} from '../src/migration-backup.mjs';
test('backup de migração preserva bytes de origem e envelope restaurável',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-migration-backup-'));t.after(()=>rm(base,{recursive:true,force:true}));const p=makeProject(),raw=Buffer.from(JSON.stringify(p,null,4)+'\r\n');const result=await createMigrationBackup(base,raw),dir=path.join(base,p.id,result.id);assert.deepEqual(await readFile(path.join(dir,'project.json')),raw);const manifest=await verifyMigrationBackup(dir);assert.equal(manifest.source_schema,1);assert.equal(manifest.target_schema,2);const envelope=JSON.parse(await readFile(path.join(dir,'backup.json')));assert.deepEqual(envelope.project,p);
});
test('corrupção é detectada e erro de destino não regrava a fonte',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-migration-backup-'));t.after(()=>rm(base,{recursive:true,force:true}));const p=makeProject(),raw=JSON.stringify(p),result=await createMigrationBackup(base,raw),dir=path.join(base,p.id,result.id);await writeFile(path.join(dir,'project.json'),'corrompido');await assert.rejects(verifyMigrationBackup(dir));
 const blocked=path.join(base,'blocked');await writeFile(blocked,'Preservar');await assert.rejects(createMigrationBackup(blocked,raw));assert.equal(await readFile(blocked,'utf8'),'Preservar');assert.equal(JSON.stringify(p),raw);
});
test('backup da migração de anexos preserva projeto formato 2 e registra destino 3',async t=>{const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-migration-assets-'));t.after(()=>rm(base,{recursive:true,force:true}));const p=makeProject();p.schema_version=2;const raw=Buffer.from(JSON.stringify(p,null,2)+'\n'),result=await createMigrationBackup(base,raw,{targetSchema:3}),dir=path.join(base,p.id,result.id),manifest=await verifyMigrationBackup(dir);assert.equal(manifest.source_schema,2);assert.equal(manifest.target_schema,3);assert.deepEqual(await readFile(path.join(dir,'project.json')),raw);});
