const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
const date=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
export function validateReviews(project){
 if(project.reviews===undefined)return;if(project.schema_version<5||!Array.isArray(project.reviews)||project.reviews.length>1000||Buffer.byteLength(JSON.stringify(project.reviews))>4000000||Buffer.byteLength(JSON.stringify(project))>30000000)throw new Error('Revisões incompatíveis');
 const ids=new Set();for(const r of project.reviews){
  if(!r||!uuid(r.id)||ids.has(r.id)||!project.nodes.some(n=>n.id===r.node_id&&n.kind==='text')||!['pending','accepted','rejected'].includes(r.status)||!['writer','editor'].includes(r.role)||typeof r.author!=='string'||!r.author.trim()||r.author.length>100||typeof r.reason!=='string'||r.reason.length>2000||!date(r.created_at)||typeof r.base_hash!=='string'||!/^[a-f0-9]{64}$/.test(r.base_hash)||!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.end)||r.start<0||r.end<r.start||r.end>2000000||typeof r.original!=='string'||r.original.length!==r.end-r.start||r.original.length>20000||typeof r.replacement!=='string'||r.replacement.length>20000||r.original===r.replacement)throw new Error('Proposta inválida');
  if(r.status==='pending'){if(r.decision!==undefined||r.snapshot_id!==undefined)throw new Error('Decisão inválida');}
  else{if(!r.decision||typeof r.decision.author!=='string'||!r.decision.author.trim()||r.decision.author.length>100||typeof r.decision.reason!=='string'||r.decision.reason.length>2000||!date(r.decision.at))throw new Error('Decisão inválida');if(r.status==='accepted'&&!project.snapshots.some(s=>s.id===r.snapshot_id&&s.node_id===r.node_id))throw new Error('Versão anterior ausente');if(r.status==='rejected'&&r.snapshot_id!==undefined)throw new Error('Rejeição não aplica texto');}
  ids.add(r.id);
 }
}
