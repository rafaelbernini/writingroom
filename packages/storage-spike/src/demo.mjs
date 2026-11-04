import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {makeProject,addNode} from '../../core/src/core.mjs';
import {createRepository,openRepository,verifyBackup,restoreBackup} from './repository.mjs';

const base=await mkdtemp(path.join(os.tmpdir(),'writingroom-storage-demo-'));
let session,restored;
try{
 const project=makeProject('Demonstração sintética de storage'),id=addNode(project,project.roots.draft,'Cena de teste');
 session=await createRepository(path.join(base,'source.wroom'),project);
 session.writeText({nodeId:id,baseRevision:0,operationId:'demo-edit',text:'Texto sintético para validar persistência e backup.'});
 const backup=path.join(base,'backup'),destination=path.join(base,'restored.wroom');
 await session.backup(backup);await verifyBackup(backup);await restoreBackup(backup,destination);
 restored=await openRepository(destination,{readOnly:true});
 if(restored.read().project.documents[id]!==session.read().project.documents[id])throw new Error('Conteúdo restaurado diverge.');
 console.log(JSON.stringify({experimental:true,revision:restored.read().revisions[id],backupVerified:true,restored:true,artifacts:base},null,2));
}catch(error){console.error('Demonstração não concluída:',error.code||'STORAGE_ERROR');process.exitCode=1;}
finally{if(restored)restored.close();if(session)session.close();}
