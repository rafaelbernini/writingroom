const lines=text=>text.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g)||[];
export function compareTexts(before,after,{budget=250000}={}){
 if(typeof before!=='string'||typeof after!=='string')throw new Error('Textos inválidos');
 const a=lines(before),b=lines(after);if(a.length+b.length>20000){const equal=before===after;return {rows:[{kind:equal?'same':before&&after?'change':before?'remove':'add',left:before||null,right:after||null,left_line:before?1:null,right_line:after?1:null}],added:!equal&&after?1:0,removed:!equal&&before?1:0,unchanged:equal?1:0,coarse:true,equal};}let prefix=0,suffix=0;
 while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
 while(suffix<a.length-prefix&&suffix<b.length-prefix&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
 const x=a.slice(prefix,a.length-suffix),y=b.slice(prefix,b.length-suffix),coarse=(x.length+1)*(y.length+1)>budget;let operations=[];
 if(coarse){operations=[...x.map(text=>({kind:'remove',text})),...y.map(text=>({kind:'add',text}))];}
 else{const width=y.length+1,table=new Uint32Array((x.length+1)*width);for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)table[i*width+j]=x[i]===y[j]?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);let i=0,j=0;while(i<x.length||j<y.length){if(i<x.length&&j<y.length&&x[i]===y[j]){operations.push({kind:'same',text:x[i]});i++;j++;}else if(i<x.length&&(j===y.length||table[(i+1)*width+j]>=table[i*width+j+1]))operations.push({kind:'remove',text:x[i++]});else operations.push({kind:'add',text:y[j++]});}}
 operations=[...a.slice(0,prefix).map(text=>({kind:'same',text})),...operations,...a.slice(a.length-suffix).map(text=>({kind:'same',text}))];
 const rows=[];let left=0,right=0,added=0,removed=0;
 for(let i=0;i<operations.length;){const op=operations[i];if(op.kind==='same'){rows.push({kind:'same',left:op.text,right:op.text,left_line:++left,right_line:++right});i++;continue;}const deleted=[],inserted=[];while(i<operations.length&&operations[i].kind!=='same'){const item=operations[i++];(item.kind==='remove'?deleted:inserted).push(item.text);}removed+=deleted.length;added+=inserted.length;for(let k=0;k<Math.max(deleted.length,inserted.length);k++)rows.push({kind:deleted[k]!==undefined&&inserted[k]!==undefined?'change':deleted[k]!==undefined?'remove':'add',left:deleted[k]??null,right:inserted[k]??null,left_line:deleted[k]!==undefined?++left:null,right_line:inserted[k]!==undefined?++right:null});}
 return {rows,added,removed,unchanged:operations.filter(o=>o.kind==='same').length,coarse,equal:before===after};
}
export function compareVersions(project,{node_id,left='current',right='current'}){
 const node=project.nodes.find(n=>n.id===node_id&&n.kind==='text');if(!node)throw new Error('Documento inválido');
 function version(id){if(id==='current')return {id,label:'Texto atual no disco',text:project.documents[node_id],rich:project.rich_documents?.[node_id]??null};const item=project.snapshots.find(v=>v.id===id&&v.node_id===node_id);if(!item)throw new Error('Versão não pertence ao documento');return {id,label:item.label,text:item.content,rich:item.rich_document??null};}
 const a=version(left),b=version(right);return {...compareTexts(a.text,b.text),left:{id:a.id,label:a.label},right:{id:b.id,label:b.label},document_title:node.title,semantic_difference:JSON.stringify(a.rich)!==JSON.stringify(b.rich)};
}
