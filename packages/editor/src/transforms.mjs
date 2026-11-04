import {Transform} from 'prosemirror-transform';
import {richSchema,normalizeRichDocument,richText} from './schema.mjs';
function layout(value){
 const normalized=normalizeRichDocument(value),doc=richSchema.nodeFromJSON(normalized.doc),positions=[];let text='';
 function append(value,from=null){text+=value;for(let i=0;i<value.length;i++)positions.push(from===null?null:from+i);}
 function walk(node,pos){
  if(node.isText){append(node.text,pos);return;}
  if(node.type===richSchema.nodes.hard_break||node.type===richSchema.nodes.horizontal_rule){append('\n',pos);return;}
  node.forEach((child,offset,index)=>{if(index&&!node.isTextblock)append('\n');walk(child,pos+1+offset);});
 }walk(doc,-1);if(text!==richText(normalized))throw new Error('Mapa visual incompatível');return {normalized,doc,text,positions};
}
function supported(map,start,end,replacement){
 if(/[\r\n]/.test(replacement)||start<0||end<=start||end>map.positions.length||map.positions.slice(start,end).some(p=>p===null))return false;
 const from=map.positions[start],to=map.positions[end-1]+1,$from=map.doc.resolve(from),$to=map.doc.resolve(to);
 if(!$from.parent.isTextblock||$from.parent!==$to.parent)return false;
 const signatures=new Set();map.doc.nodesBetween(from,to,node=>{if(node.isText)signatures.add(node.marks.filter(m=>['comment','footnote'].includes(m.type.name)).map(m=>m.attrs.id).sort().join(','));});return signatures.size<=1;
}
export function richRangeChecker(value){const map=layout(value);return (start,end,replacement)=>supported(map,start,end,replacement);}
export function replaceRichRanges(value,occurrences,replacement){
 const map=layout(value),transform=new Transform(map.doc);let expected=map.text;
 for(const occurrence of [...occurrences].reverse()){
  if(!supported(map,occurrence.start,occurrence.end,replacement))throw new Error('Substituição entre blocos ou limites de anotações exige edição manual.');
  const from=map.positions[occurrence.start],to=map.positions[occurrence.end-1]+1,marks=transform.doc.nodeAt(from)?.marks||transform.doc.resolve(from).marks();
  if(replacement)transform.replaceWith(from,to,richSchema.text(replacement,marks));else transform.delete(from,to);
  expected=expected.slice(0,occurrence.start)+replacement+expected.slice(occurrence.end);
 }
 const result=normalizeRichDocument({schema_version:1,doc:transform.doc.toJSON()});if(richText(result)!==expected)throw new Error('Substituição visual divergente.');return result;
}
