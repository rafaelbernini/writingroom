import path from 'node:path';
import {mkdir,lstat,rename} from 'node:fs/promises';
import {listProjects,loadProject} from './core.mjs';
export const archiveRoot=base=>path.join(base,'.archived');
async function folder(dir){const info=await lstat(dir);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Pasta de biblioteca inválida');}
export async function checkedLibraryProject(base,id,{archived=false}={}){
 if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw new Error('Identidade inválida');
 await folder(base);const parent=archived?archiveRoot(base):base;if(archived)await folder(parent);
 const dir=path.join(parent,id+'.wroom');await folder(dir);const file=await lstat(path.join(dir,'project.json'));if(file.isSymbolicLink()||!file.isFile())throw new Error('Arquivo de projeto inválido');
 const project=await loadProject(dir);if(project.id!==id)throw new Error('Identidade incompatível');return {dir,project};
}
export async function listLibraryProjects(base,{archived=false}={}){
 if(!archived)return listProjects(base);
 const parent=archiveRoot(base);try{await folder(parent);}catch(error){if(error.code==='ENOENT')return [];throw error;}
 return (await listProjects(parent)).map(p=>({...p,archived:true}));
}
export async function archiveLibraryProject(base,id,restore=false){
 const {dir}=await checkedLibraryProject(base,id,{archived:restore});const parent=restore?base:archiveRoot(base);
 await mkdir(parent,{recursive:true,mode:0o700});await folder(parent);const destination=path.join(parent,id+'.wroom');
 try{await lstat(destination);throw new Error('Já existe um projeto neste destino');}catch(error){if(error.code!=='ENOENT')throw error;}
 await rename(dir,destination);return {id,archived:!restore};
}
