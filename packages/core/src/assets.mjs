import {createHash} from 'node:crypto';
export const MAX_ASSET_BYTES=8_000_000,MAX_ASSET_TOTAL=16_000_000,MAX_ASSETS=100,MAX_PROJECT_BYTES=30_000_000;
export const assetDigest=bytes=>createHash('sha256').update(bytes).digest('hex');
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
function dimensions(width,height){if(!width||!height||width>10000||height>10000||width*height>25000000)throw new Error('Imagem ultrapassa o limite de dimensões');return {width,height};}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function imageInfo(data,ext){
 if(ext==='png'){
  if(data.length<45||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.readUInt32BE(8)!==13||data.toString('ascii',12,16)!=='IHDR')throw new Error('PNG inválido');
  const depth=data[24],color=data[25],depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};if(!depths[color]?.includes(depth)||data[26]||data[27]||data[28]>1)throw new Error('Cabeçalho PNG inválido');
  let offset=8,ended=false,hasData=false;while(offset+12<=data.length){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);if(length>data.length-offset-12)throw new Error('PNG truncado');if(['acTL','fcTL','fdAT'].includes(type))throw new Error('Use PNG estático');if(crc32(data.subarray(offset+4,offset+8+length))!==data.readUInt32BE(offset+8+length))throw new Error('CRC do PNG incompatível');if(type==='IDAT')hasData=true;offset+=12+length;if(type==='IEND'){if(length||offset!==data.length)throw new Error('PNG inválido');ended=true;break;}}
  if(!ended||!hasData)throw new Error('PNG incompleto');return {mime:'image/png',...dimensions(data.readUInt32BE(16),data.readUInt32BE(20))};
 }
 if(data.length<12||data[0]!==255||data[1]!==216||data[data.length-2]!==255||data[data.length-1]!==217)throw new Error('JPEG inválido');
 let offset=2,info=null,scan=false;while(offset<data.length-2){if(data[offset++]!==255)throw new Error('JPEG inválido');while(data[offset]===255)offset++;const marker=data[offset++];if(marker===218){scan=true;break;}if(marker===1||(marker>=208&&marker<=215))continue;if(offset+2>data.length)throw new Error('JPEG truncado');const length=data.readUInt16BE(offset);if(length<2||offset+length>data.length)throw new Error('JPEG truncado');if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(length<8)throw new Error('JPEG inválido');info=dimensions(data.readUInt16BE(offset+5),data.readUInt16BE(offset+3));}offset+=length;}
 if(!info||!scan)throw new Error('JPEG sem dimensões ou dados');return {mime:'image/jpeg',...info};
}
export function inspectAsset({name,data_base64}){
 if(typeof name!=='string'||!name.trim()||name.length>180||/[\\/\u0000-\u001f\u007f]/.test(name))throw new Error('Nome de arquivo inválido');
 if(typeof data_base64!=='string'||!data_base64.length||data_base64.length>4*Math.ceil(MAX_ASSET_BYTES/3)||(data_base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(data_base64)))throw new Error('Arquivo inválido ou maior que 8 MB');
 const data=Buffer.from(data_base64,'base64');if(!data.length||data.length>MAX_ASSET_BYTES||data.toString('base64')!==data_base64)throw new Error('Base64 inválido');
 const ext=name.split('.').pop().toLowerCase();let info;
 if(['png','jpg','jpeg'].includes(ext))info=imageInfo(data,ext);
 else if(ext==='pdf'){if(!/^%PDF-1\.[0-7]|^%PDF-2\.0/.test(data.subarray(0,9).toString('ascii'))||!data.subarray(Math.max(0,data.length-1024)).toString('ascii').trimEnd().endsWith('%%EOF'))throw new Error('PDF sem assinatura ou terminador');info={mime:'application/pdf'};}
 else if(['txt','md','markdown'].includes(ext)){const text=new TextDecoder('utf-8',{fatal:true}).decode(data);if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text))throw new Error('Texto contém controles binários');info={mime:['md','markdown'].includes(ext)?'text/markdown':'text/plain'};}
 else if(['docx','odt'].includes(ext)){if(data.length<4||data.readUInt32LE(0)!==0x04034b50)throw new Error('Documento ZIP inválido');info={mime:ext==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/vnd.oasis.opendocument.text'};}
 else info={mime:'application/octet-stream'};
 return {name,mime:info.mime,bytes:data.length,sha256:assetDigest(data),...(info.width?{width:info.width,height:info.height}:{}),data_base64};
}
export function validateAttachments(project){
 if(project.attachments===undefined)return;
 if(Buffer.byteLength(JSON.stringify(project),'utf8')>MAX_PROJECT_BYTES)throw new Error('Projeto com anexos ultrapassa 30 MB');
 if(project.schema_version<3||!Array.isArray(project.attachments)||project.attachments.length>MAX_ASSETS)throw new Error('Anexos incompatíveis');
 const ids=new Set(),nodes=new Set();let total=0;
 for(const asset of project.attachments){
  if(!asset||!uuid(asset.id)||!uuid(asset.node_id)||ids.has(asset.id)||nodes.has(asset.node_id)||Object.keys(asset).some(k=>!['id','node_id','name','mime','bytes','sha256','width','height','data_base64'].includes(k)))throw new Error('Identidade de anexo inválida');
  const node=project.nodes.find(n=>n.id===asset.node_id);if(!node||node.kind!=='research'||node.include_in_compile)throw new Error('Anexo deve ser material de pesquisa');
  const checked=inspectAsset(asset);for(const key of ['name','mime','bytes','sha256','width','height'])if(checked[key]!==asset[key])throw new Error('Integridade do anexo incompatível');
  total+=asset.bytes;if(total>MAX_ASSET_TOTAL)throw new Error('Limite de 16 MB de anexos por projeto');ids.add(asset.id);nodes.add(asset.node_id);
 }
}
export const attachmentsHash=project=>assetDigest(JSON.stringify(project.attachments||[]));
