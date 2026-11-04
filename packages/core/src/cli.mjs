import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createProject,addNode,saveProject,compileProject,listProjects,loadProject,updateText} from './core.mjs';
const base=path.resolve(process.env.WRITINGROOM_HOME||'./writingroom-projects');
const [cmd,...args]=process.argv.slice(2);
try{
 if(cmd==='demo'){
  const {dir,project}=await createProject(base,'Meu primeiro romance');
  const chapter=addNode(project,project.roots.draft,'Capítulo 1','folder');
  const scene=addNode(project,chapter,'Uma nova história','text');updateText(project,scene,'Era uma vez uma página em branco.');
  await saveProject(dir,project);await writeFile(path.join(dir,'manuscrito.md'),compileProject(project,'md'));console.log('Criado:',dir);
 }else if(cmd==='list') console.log(JSON.stringify(await listProjects(base),null,2));
 else if(cmd==='export'){const p=await loadProject(path.join(base,args[0]+'.wroom'));console.log(compileProject(p,args[1]||'md'));}
 else {console.log('writingroom CLI\n  npm run demo\n  npm run cli -- list\n  npm run cli -- export <project-id> [md|txt]');}
}catch(e){console.error('Erro:',e.message);process.exitCode=1;}
