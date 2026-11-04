import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticAuthority } from '../../sharing-spike/src/authorization.mjs';
import { createSyntheticSessionHarness } from '../../sharing-spike/src/session-harness.mjs';
function fixture() {
  let time = 1000;
  const identities = ['owner', 'editor', 'other'];
  const authority = createSyntheticAuthority({ identities, now: () => time });
  authority.createProject('owner', { id: 'book', scenes: [{ id: 'one', folder: 'draft' }, { id: 'private', folder: 'notes' }] });
  const h = createSyntheticSessionHarness({ authority, identities, now: () => time });
  const request = (path, body = {}, client = {}, extra = {}) => h.dispatch({ method: 'POST', origin: h.origin, source: 'fixture', path, body, ...client, ...extra });
  const start = device => request('/synthetic/login/start', { device }).body;
  const complete = (subject, device, s, client = {}) => {
    const code = h.issueSyntheticCode({ subject, device, state: s.state });
    const reply = request('/synthetic/login/complete', { state: s.state, code }, client, { csrf: s.csrf });
    assert.equal(reply.status, 200);
    return { cookie: reply.headers['Set-Cookie'].split(';')[0], csrf: reply.body.csrf, reply, code };
  };
  const login = (subject, device) => complete(subject, device, start(device));
  return { h, request, start, complete, login, tick: n => { time = n; }, advance: n => { time += n; } };
}
const denied = reply => { assert.equal(reply.status, 403); assert.deepEqual(reply.body, { error: 'DENIED', mode: 'SYNTHETIC_ONLY' }); };
test('synthetic login rotates session and CSRF, refuses fixation and callback replay', () => {
  const f = fixture(), s = f.start('laptop');
  const client = f.complete('owner', 'laptop', s, { cookie: '__Host-wroom_synthetic=' + 'x'.repeat(43) });
  assert.match(client.reply.headers['Set-Cookie'], /; Path=\/; Secure; HttpOnly; SameSite=Lax$/);
  assert.equal(client.reply.headers['Cache-Control'], 'no-store');
  assert.notEqual(client.cookie.split('=')[1], 'x'.repeat(43));
  denied(f.request('/synthetic/login/complete', { state: s.state, code: client.code }, {}, { csrf: s.csrf }));
  const replacement = f.login('owner', 'laptop');
  const reauth = f.complete('owner', 'laptop', f.start('laptop'), client);
  denied(f.request('/session', {}, client, { method: 'GET' }));
  denied(f.request('/logout', {}, reauth, { csrf: client.csrf }));
  assert.equal(f.request('/session', {}, replacement, { method: 'GET' }).status, 200);
});
test('callback is bound to prelogin state, CSRF, device and expiration', () => {
  const f = fixture(), a = f.start('a'), b = f.start('b');
  const code = f.h.issueSyntheticCode({ subject: 'owner', device: 'a', state: a.state });
  denied(f.request('/synthetic/login/complete', { state: b.state, code }, {}, { csrf: b.csrf }));
  denied(f.request('/synthetic/login/complete', { state: a.state, code }, {}, { csrf: b.csrf }));
  assert.throws(() => f.h.issueSyntheticCode({ subject: 'owner', device: 'b', state: a.state }), /DENIED/);
  f.advance(60_000);
  denied(f.request('/synthetic/login/complete', { state: a.state, code }, {}, { csrf: a.csrf }));
  f.advance(240_000);
  assert.throws(() => f.h.issueSyntheticCode({ subject: 'owner', device: 'a', state: a.state }), /DENIED/);
});
test('Origin, method, duplicate cookies, session CSRF and body impersonation fail closed', () => {
  const f = fixture(), a = f.login('owner', 'a'), b = f.login('editor', 'b');
  for (const extra of [{ origin: 'https://evil.invalid' }, { origin: undefined }, { origin: 'https://sharing.invalid.evil' }, { csrf: b.csrf }, { csrf: undefined }, { method: 'GET' }, { cookie: a.cookie + '; ' + a.cookie }]) denied(f.request('/logout', {}, a, extra));
  denied(f.request('/session', { actor: 'owner' }, b, { method: 'GET' }));
  denied(f.request('/session', { subject: 'owner' }, b, { method: 'GET' }));
  assert.equal(f.request('/session', {}, b, { method: 'GET' }).body.subject, 'editor');
});
test('session identity drives invite scope and recipient; GET cannot consume a grant', () => {
  const f = fixture(), owner = f.login('owner', 'a'), editor = f.login('editor', 'b'), other = f.login('other', 'c');
  const input = { projectId: 'book', recipient: 'editor', scope: ['one'], capabilities: ['read'], expiresAt: 100_000 };
  denied(f.request('/invitations/create', input, editor));
  const invite = f.request('/invitations/create', input, owner).body;
  denied(f.request('/invitations/accept', { token: invite.token, explicit: true }, other));
  denied(f.request('/invitations/accept', { token: invite.token, explicit: true }, editor, { method: 'GET' }));
  assert.deepEqual(f.request('/invitations/preview', { token: invite.token }, editor).body.scope, ['one']);
  assert.equal(f.request('/invitations/accept', { token: invite.token, explicit: true }, editor).status, 200);
  denied(f.request('/invitations/accept', { token: invite.token, explicit: true }, editor));
  const access = { projectId: 'book', sceneId: 'one', action: 'read' };
  assert.equal(f.request('/access/check', access, editor).body.allowed, true);
  denied(f.request('/access/check', { ...access, sceneId: 'private' }, editor));
  denied(f.request('/access/check', { ...access, action: 'propose' }, editor));
  f.request('/invitations/revoke', { projectId: 'book', invitationId: invite.invitationId }, owner);
  denied(f.request('/access/check', access, editor));
});
test('logout and device revocation invalidate sessions without affecting another identity', () => {
  const f = fixture(), a = f.login('owner', 'a'), b = f.login('owner', 'b'), other = f.login('editor', 'b');
  const pending = f.start('b'); const code = f.h.issueSyntheticCode({ subject: 'owner', device: 'b', state: pending.state });
  assert.equal(f.request('/devices/revoke', { device: 'b' }, a).status, 200);
  denied(f.request('/session', {}, b, { method: 'GET' }));
  denied(f.request('/synthetic/login/complete', { state: pending.state, code }, {}, { csrf: pending.csrf }));
  assert.equal(f.request('/session', {}, other, { method: 'GET' }).status, 200);
  assert.equal(f.request('/logout', {}, a).headers['Set-Cookie'].includes('Max-Age=0'), true);
  denied(f.request('/session', {}, a, { method: 'GET' }));
});
test('idle and absolute timeouts cannot be extended by rejected requests', () => {
  const f = fixture(), a = f.login('owner', 'a');
  f.advance(29 * 60_000); denied(f.request('/logout', {}, a, { csrf: 'x'.repeat(43) }));
  f.advance(60_000); denied(f.request('/session', {}, a, { method: 'GET' }));
  const b = f.login('owner', 'b');
  for (let n = 1; n < 36; n++) { f.advance(20 * 60_000); assert.equal(f.request('/session', {}, b, { method: 'GET' }).status, 200); }
  f.advance(20 * 60_000); denied(f.request('/session', {}, b, { method: 'GET' }));
});
test('public failures are uniform, login starts bounded and restart invalidates sessions', () => {
  const f = fixture(), a = f.login('owner', 'a');
  const missing = f.request('/session', {}, {}, { method: 'GET' });
  assert.deepEqual(f.request('/session', {}, { cookie: '__Host-wroom_synthetic=' + 'z'.repeat(43) }, { method: 'GET' }), missing);
  for (let i = 0; i < 4; i++) assert.equal(f.request('/synthetic/login/start', { device: 'a', email: 'unknown@invalid' }).status, 200);
  denied(f.request('/synthetic/login/start', { device: 'a', email: 'known@invalid' }));
  f.advance(60_000); assert.equal(f.request('/synthetic/login/start', { device: 'a' }).status, 200);
  const fresh = fixture(); denied(fresh.request('/session', {}, a, { method: 'GET' }));
});
