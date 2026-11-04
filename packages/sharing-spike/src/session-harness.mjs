// Synthetic-only session policy. Network use is restricted to the isolated loopback TLS adapter.
import { randomBytes, createHash } from 'node:crypto';
const token = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');
const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const deny = () => { throw new Error('DENIED'); };
const ORIGIN = 'https://sharing.invalid';
const COOKIE = '__Host-wroom_synthetic';
const IDLE = 30 * 60_000, MAX = 12 * 60 * 60_000;
export function createSyntheticSessionHarness({ authority, identities, now = Date.now, origin = ORIGIN } = {}) {
  if (authority?.mode !== 'SYNTHETIC_ONLY' || !Array.isArray(identities) || !identities.length || identities.length > 100 || new Set(identities).size !== identities.length || identities.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) deny();
  if(typeof origin!=='string'||!/^https:\/\/(?:sharing\.invalid|127\.0\.0\.1(?::[0-9]+)?)$/.test(origin))deny();
  const users = new Set(identities), sessions = new Map(), logins = new Map(), codes = new Map(), limits = new Map();
  let epoch = authority.sessionEpoch;
  const cookie = value => `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax`;
  function prune() {
    const current = authority.sessionEpoch;
    if(current !== epoch){sessions.clear();logins.clear();codes.clear();epoch=current;}
    const time = now();
    for (const [key, s] of sessions) if (time >= s.created + MAX || time >= s.seen + IDLE) sessions.delete(key);
    for (const map of [logins, codes, limits]) for (const [key, entry] of map) if (time >= entry.expires) map.delete(key);
  }
  function session(request) {
    const parts = typeof request.cookie === 'string' && request.cookie.length <= 4096 ? request.cookie.split(';').map(p => p.trim()).filter(p => p.startsWith(`${COOKIE}=`)) : [];
    if (parts.length !== 1) deny();
    const value = parts[0].slice(COOKIE.length + 1); if (!validToken(value)) deny();
    const key = hash(value), record = sessions.get(key); if (!record) deny();
    return { key, record };
  }
  // Fixture-only issuer; it is deliberately NOT a route or real OIDC implementation.
  function issueSyntheticCode({ subject, device, state }) {
    prune();
    const login = validToken(state) && logins.get(hash(state));
    if (!login || login.device !== device || !users.has(subject) || codes.size >= 1000) deny();
    const value = token(); codes.set(hash(value), { subject, device, stateHash: hash(state), expires: now() + 60_000 });
    return value;
  }
  function dispatch(request = {}) {
    try {
      prune();
      if (!request || typeof request !== 'object' || !['GET', 'POST'].includes(request.method) || request.origin !== origin) deny();
      const body = request.body ?? {};
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.hasOwn(body, 'actor') || Object.hasOwn(body, 'subject')) deny();
      const response = value => ({ status: 200, headers: { 'Cache-Control': 'no-store' }, body: value });
      if (request.path === '/synthetic/login/start') {
        if (request.method !== 'POST' || typeof body.device !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.device) || logins.size >= 1000) deny();
        // A bounded source bucket models a trusted adapter's transport-derived source.
        // Never use a forwarded header or body field as this value in a real adapter.
        if (typeof request.source !== 'string' || !/^[a-zA-Z0-9_.:-]{1,100}$/.test(request.source)) deny();
        if (!limits.has(request.source) && limits.size >= 1000) deny();
        const bucket = limits.get(request.source) ?? { count: 0, expires: now() + 60_000 };
        if (++bucket.count > 5) deny(); limits.set(request.source, bucket);
        const state = token(), csrf = token();
        logins.set(hash(state), { device: body.device, csrfHash: hash(csrf), expires: now() + 300_000 });
        return response({ mode: 'SYNTHETIC_ONLY', state, csrf });
      }
      if (request.path === '/synthetic/login/complete') {
        if (request.method !== 'POST' || !validToken(body.state) || !validToken(body.code) || !validToken(request.csrf)) deny();
        const login = logins.get(hash(body.state)), code = codes.get(hash(body.code));
        if (!login || !code || login.csrfHash !== hash(request.csrf) || code.stateHash !== hash(body.state) || code.device !== login.device || sessions.size >= 1000) deny();
        // Ignore supplied IDs for session creation; invalidate the previous session on reauthentication.
        if (request.cookie) { try { sessions.delete(session(request).key); } catch {} }
        codes.delete(hash(body.code)); logins.delete(hash(body.state));
        const id = token(), csrf = token();
        sessions.set(hash(id), { subject: code.subject, device: code.device, csrfHash: hash(csrf), created: now(), seen: now(), handle: Object.freeze({}) });
        const result = response({ mode: 'SYNTHETIC_ONLY', csrf }); result.headers['Set-Cookie'] = cookie(id); return result;
      }
      const { key, record } = session(request);
      if (request.method === 'POST' && (!validToken(request.csrf) || record.csrfHash !== hash(request.csrf))) deny();
      let result;
      if (request.path === '/session' && request.method === 'GET') result = { mode: 'SYNTHETIC_ONLY', subject: record.subject, device: record.device };
      else if (request.path === '/logout' && request.method === 'POST') {
        sessions.delete(key); const reply = response({ ok: true }); reply.headers['Set-Cookie'] = `${cookie('')}; Max-Age=0`; return reply;
      } else if (request.path === '/devices/revoke' && request.method === 'POST') {
        if (typeof body.device !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.device)) deny();
        for (const [id, s] of sessions) if (s.subject === record.subject && s.device === body.device) sessions.delete(id);
        // Pending synthetic authorizations cannot resurrect the revoked device.
        for (const [id, c] of codes) if (c.subject === record.subject && c.device === body.device) codes.delete(id);
        result = { ok: true };
      } else if (request.path === '/invitations/create' && request.method === 'POST') result = authority.invite(record.subject, body);
      else if (request.path === '/invitations/preview' && request.method === 'POST') result = authority.preview(record.subject, body.token);
      else if (request.path === '/invitations/accept' && request.method === 'POST') result = { grantId: authority.accept(record.subject, body.token, { explicit: body.explicit }) };
      else if (request.path === '/invitations/revoke' && request.method === 'POST') { authority.revoke(record.subject, body.projectId, body.invitationId); result = { ok: true }; }
      else if (request.path === '/access/check' && request.method === 'POST') result = { allowed: authority.authorize(record.subject, body) };
      else deny();
      if (sessions.has(key)) record.seen = now();
      return response(result);
    } catch {
      return { status: 403, headers: { 'Cache-Control': 'no-store' }, body: { error: 'DENIED', mode: 'SYNTHETIC_ONLY' } };
    }
  }
  const leases=new WeakMap();
  function captureSession(request){
    prune();if(request.origin!==origin||!(request.method==='POST'||(request.method==='GET'&&request.path==='/session')))deny();const {key,record}=session(request);
    if(request.method==='POST'&&(!validToken(request.csrf)||record.csrfHash!==hash(request.csrf)))deny();
    const lease=Object.freeze({subject:record.subject,device:record.device,handle:record.handle});leases.set(lease,{key,record});return lease;
  }
  function validateSession(lease){prune();const entry=leases.get(lease);if(!entry||sessions.get(entry.key)!==entry.record)deny();return true;}
  function invalidateSession(lease){const entry=leases.get(lease);if(entry&&sessions.get(entry.key)===entry.record)sessions.delete(entry.key);}
  return Object.freeze({ mode: 'SYNTHETIC_ONLY', origin, dispatch, issueSyntheticCode, captureSession, validateSession, invalidateSession });
}
