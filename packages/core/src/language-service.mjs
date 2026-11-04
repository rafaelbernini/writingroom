import {readFile,open,realpath} from 'node:fs/promises';
import {languageCode} from './translation.mjs';
const dictionaries={pt:'th_pt_BR_v2',en:'th_en_US_v2'};
const cache=new Map();
export async function localSynonyms(term,language,{directory='/usr/share/mythes'}={}){
 if(typeof term!=='string'||!term.trim()||term.length>180||!languageCode(language))throw new Error('Consulta inválida');
 const base=dictionaries[language.split('-')[0]];if(!base)return {available:false,senses:[],notice:'Idioma sem base local configurada'};
 const prefix=directory+'/'+base;
 try{let index=cache.get(prefix);if(!index){const data=await readFile(prefix+'.idx');if(data.length>8000000)throw new Error('Base grande demais');const encoding=data.subarray(0,60).toString('ascii').split('\n')[0].trim(),decoder=new TextDecoder(encoding==='UTF-8'?'utf-8':'iso-8859-15');const lines=decoder.decode(data).split(/\r?\n/);index={decoder,offsets:new Map(lines.slice(2).filter(Boolean).map(line=>{const split=line.lastIndexOf('|');return [line.slice(0,split).normalize('NFC').toLocaleLowerCase(),Number(line.slice(split+1))];}))};cache.set(prefix,index);}
 const offset=index.offsets.get(term.trim().normalize('NFC').toLocaleLowerCase());if(offset===undefined)return {available:true,senses:[],notice:'Termo não encontrado nesta base',source:base};
 if(!Number.isSafeInteger(offset)||offset<0)throw new Error('Índice inválido');const file=await open(prefix+'.dat','r');let chunk;try{const buffer=Buffer.alloc(32768),{bytesRead}=await file.read(buffer,0,buffer.length,offset);chunk=index.decoder.decode(buffer.subarray(0,bytesRead));}finally{await file.close();}
 const lines=chunk.split(/\r?\n/),count=Number(lines[0].split('|').at(-1));if(!Number.isSafeInteger(count)||count<0||count>100||lines.length<=count)throw new Error('Base inválida');
 const resolved=await realpath(prefix+'.dat');return {available:true,source:resolved.split('/').at(-1),senses:lines.slice(1,count+1).map(line=>{const [label,...words]=line.split('|');return {label,words:words.slice(0,100)};}),notice:'Base MyThes instalada no sistema; cobertura e variante dependem do pacote. Não é uma base de definições.'};
 }catch{return {available:false,senses:[],notice:'Base MyThes não instalada ou indisponível'};}
}
export function translatorConfig(env=process.env){
 if(!env.WRITINGROOM_TRANSLATE_URL)return null;const url=new URL(env.WRITINGROOM_TRANSLATE_URL);if(url.username||url.password||url.hash||url.search||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new Error('Use HTTPS ou serviço local');return {url:url.toString(),key:env.WRITINGROOM_TRANSLATE_KEY||'',label:env.WRITINGROOM_TRANSLATE_LABEL||'LibreTranslate configurado'};
}
export async function machineTranslation(input,config){
 if(!config)throw new Error('Serviço de tradução não configurado');if(input.consent!==true||typeof input.text!=='string'||!input.text.trim()||input.text.length>10000||!languageCode(input.from)||!languageCode(input.to)||input.from===input.to)throw new Error('Confira consentimento, idiomas e limite de 10 mil caracteres');
 const response=await fetch(config.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json'},body:JSON.stringify({q:input.text,source:input.from,target:input.to,format:'text',...(config.key?{api_key:config.key}:{})})});
 if(!response.ok)throw new Error('Serviço de tradução indisponível');const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>100000)throw new Error('Resposta excede limite');chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');
 const data=JSON.parse(raw);if(typeof data.translatedText!=='string'||data.translatedText.length>30000)throw new Error('Resposta inválida');return {text:data.translatedText,provider:config.label};
}
