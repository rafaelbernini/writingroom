// Synthetic, in-memory policy proof. No authentication, HTTP, persistence or manuscript IO.
import { randomUUID, randomBytes, createHash } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw new Error('DENIED'); };
const actions = new Set(['read', 'propose']);
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export function createSyntheticAuthority({ identities, now = Date.now } = {}) {
  if (!Array.isArray(identities) || !identities.length || identities.length > 100 ||
      identities.some(id => !identifier(id)) || new Set(identities).size !== identities.length) fail();
  const users = new Set(identities), projects = new Map(), invitations = new Map(), grants = new Map();
  const user = id => { if (!users.has(id)) fail(); };
  const project = id => projects.get(id) || fail();
  const owner = (actor, id) => { user(actor); const p = project(id); if (p.owner !== actor) fail(); return p; };
  const copy = value => structuredClone(value);
  function createProject(actor, { id, scenes }) {
    user(actor);
    if (!identifier(id) || projects.has(id) || projects.size >= 100 || !Array.isArray(scenes) || !scenes.length || scenes.length > 200 ||
        scenes.some(s => !s || !identifier(s.id) || !identifier(s.folder)) || new Set(scenes.map(s => s.id)).size !== scenes.length) fail();
    // Only opaque IDs/folders are retained, never caller-supplied manuscript fields.
    projects.set(id, { owner: actor, scenes: scenes.map(({ id, folder }) => ({ id, folder })) });
  }
  function invite(actor, { projectId, recipient, scope, capabilities, expiresAt }) {
    const p = owner(actor, projectId); user(recipient);
    if (recipient === actor || invitations.size >= 1000 || !Number.isSafeInteger(expiresAt) || expiresAt <= now() || expiresAt > now() + 7 * 86400000 ||
        !Array.isArray(scope) || !scope.length || scope.length > 200 || new Set(scope).size !== scope.length ||
        scope.some(id => !p.scenes.some(s => s.id === id)) || !Array.isArray(capabilities) || !capabilities.length ||
        new Set(capabilities).size !== capabilities.length || capabilities.some(a => !actions.has(a)) || !capabilities.includes('read')) fail();
    const token = randomBytes(32).toString('base64url');
    const record = { id: randomUUID(), projectId, recipient, scope: [...scope], capabilities: [...capabilities], expiresAt, revoked: false, consumed: false };
    invitations.set(digest(token), record);
    return { invitationId: record.id, token };
  }
  function pending(actor, token) {
    user(actor); if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) fail();
    const i = invitations.get(digest(token));
    if (!i || i.recipient !== actor || i.revoked || i.consumed || now() >= i.expiresAt) fail();
    return i;
  }
  function preview(actor, token) {
    const i = pending(actor, token);
    return copy({ invitationId: i.id, projectId: i.projectId, scope: i.scope, capabilities: i.capabilities, expiresAt: i.expiresAt });
  }
  function accept(actor, token, { explicit = false } = {}) {
    const i = pending(actor, token); if (explicit !== true) fail();
    const id = randomUUID();
    grants.set(id, { ...copy(i), id, invitationId: i.id }); i.consumed = true;
    return id;
  }
  function revoke(actor, projectId, invitationId) {
    owner(actor, projectId);
    const invitation = [...invitations.values()].find(i => i.id === invitationId && i.projectId === projectId);
    if (!invitation) fail();
    invitation.revoked = true;
    for (const grant of grants.values()) if (grant.invitationId === invitationId) grant.revoked = true;
  }
  function authorize(actor, { projectId, sceneId, action }) {
    user(actor); const p = project(projectId);
    if (!actions.has(action) || !p.scenes.some(s => s.id === sceneId)) fail();
    if (p.owner === actor) return true;
    if (![...grants.values()].some(g => g.recipient === actor && g.projectId === projectId && !g.revoked && now() < g.expiresAt && g.scope.includes(sceneId) && g.capabilities.includes(action))) fail();
    return true;
  }
  function previewFolder(actor, projectId, folder) {
    const p = owner(actor, projectId);
    return p.scenes.filter(s => s.folder === folder).map(s => s.id);
  }
  return Object.freeze({ mode: 'SYNTHETIC_ONLY', createProject, invite, preview, accept, revoke, authorize, previewFolder });
}
