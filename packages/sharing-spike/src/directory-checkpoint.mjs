// Public-state commitment only, not a signature or independent trust anchor.
import {createHash} from 'node:crypto';
const compare=(a,b)=>a<b?-1:a>b?1:0;
export function directoryCheckpoint(summary){
 const pins=summary.pins.map(p=>({subject:p.subject,fingerprint:p.fingerprint,revoked:Boolean(p.revoked)})).sort((a,b)=>compare(a.subject,b.subject));
 const bindings=summary.bindings.map(b=>({hash:b.hash,subject:b.subject,device:b.device,status:b.status})).sort((a,b)=>compare(a.hash,b.hash));
 const state={domain:summary.domain,revision:summary.revision,suspended:Boolean(summary.suspended),pins,bindings,revokedHashes:[...summary.revokedHashes].sort()};
 return {domain:state.domain,revision:state.revision,hash:createHash('sha256').update(JSON.stringify(state)).digest('hex')};
}
