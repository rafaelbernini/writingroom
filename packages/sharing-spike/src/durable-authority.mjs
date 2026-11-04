// Isolated synthetic policy journal. Never imports manuscripts or the web server.
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { open, lstat, chmod, readFile, unlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import {operationContext,operationRequest,validateOperationEvent,operationReceipt} from './operation-contract.mjs';
import { createSyntheticAuthority } from './authorization.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const deny = () => { throw new Error('DENIED'); };
const LIMIT = 2000;
async function sqlite() { try { return (await import('node:sqlite')).DatabaseSync; } catch { throw new Error('UNSUPPORTED_SQLITE'); } }
async function regular(file) { const s = await lstat(file); if (!s.isFile() || s.isSymbolicLink() || s.size > 8_000_000) deny(); }
async function sync(file) { const f = await open(file, 'r'); try { await f.sync(); } finally { await f.close(); } }
async function target(file) { return path.join(await realpath(path.dirname(path.resolve(file))), path.basename(file)); }
function inspect(db) {
  const version=db.prepare('PRAGMA user_version').get().user_version;
  if (![1,2].includes(version) || db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') deny();
  const rows = db.prepare('SELECT * FROM authority').all();
  if (rows.length !== 1 || rows[0].kind !== 'writingroom-synthetic-authority-v1') deny();
  const meta = rows[0]; const identities = JSON.parse(meta.identities);
  createSyntheticAuthority({ identities });
  const events = db.prepare('SELECT * FROM event ORDER BY sequence').all(); if (events.length > LIMIT) deny();
  for (let n = 0; n < events.length; n++) if (events[n].sequence !== n + 1 || events[n].checksum !== hash(events[n].payload)) deny();
  const seen=new Set();for(const row of events){const event=JSON.parse(row.payload);if(Object.hasOwn(event,'operation')){if(version!==2)deny();validateOperationEvent(event,seen);}}
  return { meta, events, identities, version };
}
function replay(snapshot, now) {
  let clock = 0;
  const policy = createSyntheticAuthority({ identities: snapshot.identities, now: () => clock });
  const tokens = new Map();
  function apply(event) {
    if (!Number.isSafeInteger(event.at) || event.at < 0) deny(); clock = event.at;
    if (event.action === 'createProject') return policy.createProject(event.actor, event.input);
    if (event.action === 'invite') {
      if (!/^[a-f0-9]{64}$/.test(event.tokenHash) || tokens.has(event.tokenHash)) deny();
      const result = policy.invite(event.actor, event.input); tokens.set(event.tokenHash, { token: result.token, id: result.invitationId, externalId: event.invitationId }); return;
    }
    if (event.action === 'accept') return policy.accept(event.actor, tokens.get(event.tokenHash)?.token, { explicit: true });
    if (event.action === 'revoke') {
      const found = [...tokens.values()].find(t => t.externalId === event.invitationId); if (!found) deny();
      return policy.revoke(event.actor, event.projectId, found.id);
    }
    deny();
  }
  for (const row of snapshot.events) apply(JSON.parse(row.payload));
  clock = now();
  return { policy, tokens };
}
export async function createDurableSyntheticAuthority(file, identities) {
  identities = structuredClone(identities); createSyntheticAuthority({ identities }); const Database = await sqlite(), destination = await target(file);
  const fd = await open(destination, 'wx', 0o600); await fd.close(); let db;
  try {
    db = new Database(destination); db.exec('PRAGMA synchronous=FULL; BEGIN IMMEDIATE;');
    db.exec('CREATE TABLE authority(kind TEXT NOT NULL, domain TEXT NOT NULL, identities TEXT NOT NULL, suspended INTEGER NOT NULL CHECK(suspended IN (0,1))); CREATE TABLE event(sequence INTEGER PRIMARY KEY, payload TEXT NOT NULL, checksum TEXT NOT NULL); PRAGMA user_version=1;');
    db.prepare('INSERT INTO authority VALUES (?,?,?,0)').run('writingroom-synthetic-authority-v1', randomUUID(), JSON.stringify(identities)); db.exec('COMMIT');
  } catch (error) { if (db?.isTransaction) db.exec('ROLLBACK'); db?.close(); db = null; await unlink(destination); throw error; }
  finally { db?.close(); }
  await sync(destination); await sync(path.dirname(destination));
  return openDurableSyntheticAuthority(destination);
}
export async function openDurableSyntheticAuthority(file, { now = Date.now, beforeCommit, afterCommit } = {}) {
  await regular(file); const Database = await sqlite(), db = new Database(file);
  try { db.exec('PRAGMA trusted_schema=OFF; PRAGMA busy_timeout=500;'); replay(inspect(db), now); db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;'); }
  catch (error) { db.close(); throw error; }
  function transaction(action, mutation = false, allowReplay = false) {
    db.exec(mutation ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try {
      const snapshot = inspect(db); if (snapshot.meta.suspended) deny();
      const state = replay(snapshot, now); const event = { at: now() }; const result = action(state, event, snapshot);
      let wrote=false;
      if (mutation && !(allowReplay&&event.action===undefined)) {
        if (snapshot.events.length >= LIMIT) deny();
        const payload = JSON.stringify(event); if (Buffer.byteLength(payload) > 64_000 || snapshot.events.reduce((n,e)=>n+Buffer.byteLength(e.payload),0)+Buffer.byteLength(payload)>1_000_000) deny();
        if(event.operation)db.exec('PRAGMA user_version=2');
        db.prepare('INSERT INTO event VALUES (?,?,?)').run(snapshot.events.length + 1, payload, hash(payload));
        beforeCommit?.();wrote=true;
      }
      db.exec('COMMIT');if(wrote)afterCommit?.(); return result;
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  function tokenEntry(state, value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) deny(); const entry = state.tokens.get(hash(value)); if (!entry) deny(); return entry; }
  function operation(actor,context,request,write){
    context=operationContext(context);request=operationRequest(request);
    return transaction((state,event,snapshot)=>{
      if(request.journalDomain!==snapshot.meta.domain||request.directoryDomain!==context.directoryDomain||!snapshot.identities.includes(actor))deny();
      const found=snapshot.events.find(row=>{const e=JSON.parse(row.payload);return e.actor===actor&&e.operation?.id===request.operationId;});
      if(found){const prior=JSON.parse(found.payload).operation;
        if(prior.requestHash!==request.requestHash||prior.device!==context.device||prior.bindingHash!==context.bindingHash||prior.directoryDomain!==context.directoryDomain||prior.journalDomain!==snapshot.meta.domain)deny();
        return {status:'committed',replayed:true,receipt:operationReceipt(snapshot,found,now()),...(request.action==='invite'?{secretDelivery:'not-recoverable'}:{})};
      }
      if(!write)return {status:'not_found',journalDomain:snapshot.meta.domain,directoryDomain:context.directoryDomain};
      let result;
      if(request.action==='invite'){
        state.policy.invite(actor,request.input);const token=randomBytes(32).toString('base64url'),invitationId=randomUUID();
        Object.assign(event,{action:'invite',actor,input:structuredClone(request.input),tokenHash:hash(token),invitationId});result={token,secretDelivery:'returned-once'};
      }else if(request.action==='accept'){
        state.policy.accept(actor,tokenEntry(state,request.input.token).token,{explicit:request.input.explicit});
        Object.assign(event,{action:'accept',actor,tokenHash:hash(request.input.token),grantId:randomUUID()});result={};
      }else{
        const entry=[...state.tokens.values()].find(e=>e.externalId===request.input.invitationId);if(!entry)deny();
        state.policy.revoke(actor,request.input.projectId,entry.id);Object.assign(event,{action:'revoke',actor,projectId:request.input.projectId,invitationId:request.input.invitationId});result={};
      }
      event.operation={id:request.operationId,...context,journalDomain:snapshot.meta.domain,requestHash:request.requestHash};
      const payload=JSON.stringify(event),row={sequence:snapshot.events.length+1,payload,checksum:hash(payload)};
      return {status:'committed',replayed:false,...result,receipt:operationReceipt({...snapshot,events:[...snapshot.events,row]},row,now())};
    },write,true);
  }
  const api = {
    mode: 'SYNTHETIC_ONLY',
    withEmptyDomain(expectedDomain,subject,action){if(typeof action!=='function')deny();return transaction((_state,_event,snapshot)=>{if(snapshot.meta.domain!==expectedDomain||snapshot.events.length!==0||!snapshot.identities.includes(subject))deny();const result=action();if(result&&typeof result.then==='function')deny();return result;},true,true);},
    executeOperation:(actor,context,request)=>operation(actor,context,request,true),
    reconcileOperation:(actor,context,request)=>operation(actor,context,request,false),
    get sessionEpoch() { return inspect(db).meta.domain; },
    createProject(actor, input) { return transaction(({ policy }, event) => { policy.createProject(actor, input); const clean = { id: input.id, scenes: input.scenes.map(({ id, folder }) => ({ id, folder })) }; Object.assign(event, { action: 'createProject', actor, input: clean }); }, true); },
    invite(actor, input) { return transaction(({ policy }, event) => {
      policy.invite(actor, input); const value = randomBytes(32).toString('base64url'), invitationId = randomUUID();
      const clean = { projectId: input.projectId, recipient: input.recipient, scope: [...input.scope], capabilities: [...input.capabilities], expiresAt: input.expiresAt };
      Object.assign(event, { action: 'invite', actor, input: clean, tokenHash: hash(value), invitationId }); return { token: value, invitationId };
    }, true); },
    preview(actor, value) { return transaction(state => { const entry = tokenEntry(state, value), preview = state.policy.preview(actor, entry.token); return { ...preview, invitationId: entry.externalId }; }); },
    accept(actor, value, { explicit = false } = {}) { return transaction((state, event) => {
      state.policy.accept(actor, tokenEntry(state, value).token, { explicit }); const grantId = randomUUID();
      Object.assign(event, { action: 'accept', actor, tokenHash: hash(value), grantId }); return grantId;
    }, true); },
    revoke(actor, projectId, invitationId) { return transaction((state, event) => {
      const entry = [...state.tokens.values()].find(e => e.externalId === invitationId); if (!entry) deny();
      state.policy.revoke(actor, projectId, entry.id); Object.assign(event, { action: 'revoke', actor, projectId, invitationId });
    }, true); },
    authorize(actor, request) { return transaction(({ policy }) => policy.authorize(actor, request)); },
    previewFolder(actor, projectId, folder) { return transaction(({ policy }) => policy.previewFolder(actor, projectId, folder)); },
    summary() { const s = inspect(db); return { domain: s.meta.domain, suspended: Boolean(s.meta.suspended), events: s.events.length, receipts: s.events.map(e => JSON.parse(e.payload)).filter(e => e.action === 'accept').map(({ grantId }) => grantId) }; },
    async backup(destination) {
      const out = await target(destination); const fd = await open(out, 'wx', 0o600); await fd.close();
      try { db.prepare('VACUUM INTO ?').run(out); await chmod(out, 0o600); await sync(out); const check = new Database(out, { readOnly: true }); try { replay(inspect(check), now); } finally { check.close(); } await sync(path.dirname(out)); return { checksum: hash(await readFile(out)) }; }
      catch (error) { await unlink(out); throw error; }
    },
    close() { db.close(); }
  };
  return Object.freeze(api);
}
export async function restoreDurableSyntheticAuthority(backup, destination, checksum) {
  await regular(backup); const bytes = await readFile(backup);
  if (typeof checksum !== 'string' || !/^[a-f0-9]{64}$/.test(checksum) || hash(bytes) !== checksum) deny();
  const Database = await sqlite(), out = await target(destination);
  const fd = await open(out, 'wx', 0o600); let db;
  try {
    try { await fd.writeFile(bytes); await fd.sync(); } finally { await fd.close(); }
    db = new Database(out); replay(inspect(db), Date.now); db.exec('PRAGMA synchronous=FULL; BEGIN IMMEDIATE');
    db.prepare('UPDATE authority SET domain=?, suspended=1').run(randomUUID()); db.exec('COMMIT'); db.close(); db = null;
    await sync(out); await sync(path.dirname(out)); return openDurableSyntheticAuthority(out);
  } catch (error) { db?.close(); await unlink(out); throw error; }
}
