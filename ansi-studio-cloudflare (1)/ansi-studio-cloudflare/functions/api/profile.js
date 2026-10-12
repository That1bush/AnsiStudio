import { json, fail, readJson, checkOrigin, currentUser, validImageData } from '../_utils.js';
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  return json({ profile: { username: user.username, displayName: user.displayName, avatarData: user.avatarData, createdAt: user.createdAt } });
}
export async function onRequestPut({ request, env }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  let body; try { body = await readJson(request); } catch (e) { return fail(e.message); }
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const avatar = typeof body.avatarData === 'string' ? body.avatarData : '';
  if (displayName.length > 40) return fail('Display name must be 40 characters or fewer.');
  if (!validImageData(avatar)) return fail('Profile image must be a PNG, JPG, WEBP or GIF under 200 KB.');
  await env.DB.prepare("UPDATE users SET display_name=?,avatar_data=?,updated_at=? WHERE id=?").bind(displayName, avatar, new Date().toISOString(), user.id).run();
  return json({ ok: true });
}
