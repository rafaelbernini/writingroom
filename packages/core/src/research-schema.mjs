export function safeResearchURL(value){if(value==='')return true;if(typeof value!=='string'||value.length>2000||/[\u0000-\u0020\u007F]/u.test(value))return false;try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}}
export function normalizeSource(value,project,self){
 const keys=['url','author','publisher','date','accessed','basis','refs'];if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new Error('Fonte inválida');
 for(const field of keys.filter(k=>!['refs'].includes(k)))if(typeof value[field]!=='string'||value[field].length>(field==='url'?2000:300)||/[\u0000-\u001F\u007F]/u.test(value[field]))throw new Error('Campo de fonte inválido');
 if(!safeResearchURL(value.url)||!['documented','hypothesis','fiction','unclassified'].includes(value.basis))throw new Error('URL ou classificação inválida');
 if(value.accessed&&(!/^\d{4}-\d{2}-\d{2}$/.test(value.accessed)||!Number.isFinite(Date.parse(value.accessed))||new Date(value.accessed).toISOString().slice(0,10)!==value.accessed))throw new Error('Data de acesso inválida');
 if(!Array.isArray(value.refs)||value.refs.length>100||new Set(value.refs).size!==value.refs.length||value.refs.some(id=>id===self||!project.nodes.some(n=>n.id===id&&n.parent_id!==null)))throw new Error('Referência de fonte inválida');
 return {url:value.url,author:value.author,publisher:value.publisher,date:value.date,accessed:value.accessed,basis:value.basis,refs:[...value.refs]};
}
