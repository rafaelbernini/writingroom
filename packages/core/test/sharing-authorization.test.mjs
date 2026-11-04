import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticAuthority } from '../../sharing-spike/src/authorization.mjs';
function fixture() {
  let clock = 1000;
  const api = createSyntheticAuthority({ identities: ['owner', 'editor', 'other'], now: () => clock });
  api.createProject('owner', { id: 'book', scenes: [{ id: 'one', folder: 'draft', secret: 'excluded' }, { id: 'two', folder: 'private' }] });
  api.createProject('other', { id: 'second', scenes: [{ id: 'one', folder: 'draft' }] });
  const input = { projectId: 'book', recipient: 'editor', scope: ['one'], capabilities: ['read', 'propose'], expiresAt: 2000 };
  return { api, input, tick: n => { clock = n; }, request: { projectId: 'book', sceneId: 'one', action: 'read' } };
}
const denied = fn => assert.throws(fn, /^Error: DENIED$/);
test('synthetic authority denies by default and requires explicit recipient acceptance', () => {
  const { api, input, request } = fixture(); const { token } = api.invite('owner', input);
  denied(() => api.authorize('editor', request));
  denied(() => api.preview('other', token)); denied(() => api.accept('editor', token));
  assert.deepEqual(api.preview('editor', token).scope, ['one']);
  assert.deepEqual(api.preview('editor', token).scope, ['one']);
  api.accept('editor', token, { explicit: true });
  assert.equal(api.authorize('editor', request), true);
  denied(() => api.accept('editor', token, { explicit: true }));
});
test('scope is immutable and isolated across works, scenes, recipients and capabilities', () => {
  const { api, input, request } = fixture(); input.capabilities = ['read'];
  const { token } = api.invite('owner', input); input.scope.push('two'); input.capabilities.push('propose');
  const preview = api.preview('editor', token); preview.scope.push('two');
  api.accept('editor', token, { explicit: true });
  for (const req of [{ ...request, projectId: 'second' }, { ...request, sceneId: 'two' }, { ...request, action: 'propose' }, { ...request, action: 'manage' }]) denied(() => api.authorize('editor', req));
  denied(() => api.authorize('other', request)); denied(() => api.authorize('unknown', request));
});
test('expiry and revocation are rechecked after preview and after acceptance', () => {
  const { api, input, tick, request } = fixture();
  const first = api.invite('owner', input); api.preview('editor', first.token);
  api.revoke('owner', 'book', first.invitationId); denied(() => api.accept('editor', first.token, { explicit: true }));
  const second = api.invite('owner', input); api.accept('editor', second.token, { explicit: true });
  denied(() => api.revoke('other', 'book', second.invitationId));
  denied(() => api.revoke('other', 'second', second.invitationId));
  api.revoke('owner', 'book', second.invitationId); denied(() => api.authorize('editor', request));
  const third = api.invite('owner', input); api.accept('editor', third.token, { explicit: true });
  const fourth = api.invite('owner', input); tick(2000);
  denied(() => api.authorize('editor', request)); denied(() => api.preview('editor', fourth.token));
});
test('folder preview freezes an explicit allowlist and no private fields escape', () => {
  const { api, input } = fixture();
  assert.deepEqual(api.previewFolder('owner', 'book', 'draft'), ['one']);
  denied(() => api.previewFolder('editor', 'book', 'private'));
  const { token } = api.invite('owner', input);
  assert.equal(JSON.stringify(api.preview('editor', token)).includes('excluded'), false);
  assert.equal(JSON.stringify(api.preview('editor', token)).includes('private'), false);
});
test('malformed scopes, capabilities, lifetime and forged tokens fail closed', () => {
  const { api, input } = fixture();
  for (const change of [{ scope: [] }, { scope: ['one', 'one'] }, { scope: ['missing'] }, { capabilities: ['manage'] }, { capabilities: ['propose'] }, { expiresAt: 1000 }, { expiresAt: Infinity }, { recipient: 'unknown' }]) denied(() => api.invite('owner', { ...input, ...change }));
  denied(() => api.invite('editor', input)); denied(() => api.preview('editor', 'x'.repeat(43)));
  denied(() => api.preview('editor', {}));
});
test('restart discards every synthetic grant; no durable authorization is claimed', () => {
  const { api, input, request } = fixture(); const { token } = api.invite('owner', input);
  api.accept('editor', token, { explicit: true });
  const fresh = fixture().api; denied(() => fresh.authorize('editor', request));
  denied(() => fresh.preview('editor', token)); assert.equal(fresh.mode, 'SYNTHETIC_ONLY');
});
