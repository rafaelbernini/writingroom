import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const packages=['prosemirror-model','prosemirror-view','prosemirror-state','prosemirror-transform','prosemirror-commands','prosemirror-history','prosemirror-keymap','prosemirror-schema-basic','prosemirror-schema-list','orderedmap','rope-sequence','w3c-keyname'];
let notices='WritingRoom editor dependencies — MIT licenses\n\n';
for(const name of packages){const pkg=JSON.parse(await readFile(new URL('../node_modules/'+name+'/package.json',import.meta.url),'utf8'));let license;for(const filename of ['LICENSE','LICENSE.txt']){try{license=await readFile(new URL('../node_modules/'+name+'/'+filename,import.meta.url),'utf8');break;}catch{}}
 if(!license)throw new Error('License missing: '+name);notices+=name+' '+pkg.version+' ('+pkg.license+')\n'+license+'\n\n';}
await build({entryPoints:['packages/editor/src/browser.mjs'],outfile:'apps/web/editor.bundle.js',bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,legalComments:'inline',banner:{js:'/*! ProseMirror and dependencies: MIT. License notices: /editor-licenses.txt */'}});
await writeFile('apps/web/editor-licenses.txt',notices);
console.log('Editor bundle and MIT notices generated locally.');
