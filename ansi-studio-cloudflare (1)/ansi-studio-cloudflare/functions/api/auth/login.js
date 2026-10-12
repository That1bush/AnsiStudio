import { json, fail, readJson, checkOrigin, verifyPassword, createSession, cookieHeader, publicUser } from '../../_utils.js';
export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  let body; try { body = await readJson(request); } catch (e) { return fail(e.message); }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || username.length > 24 || password.length > 128) return fail('Username or password is incorrect.', 401);
  const row = await env.DB.prepare('SELECT id,username,email,display_name,avatar_data,password_hash,created_at FROM users WHERE username=? COLLATE NOCASE').bind(username).first();
  if (!row || !(await verifyPassword(password, row.password_hash))) return fail('Username or password is incorrect.', 401);
  const session = await createSession(row.id, env);
  return json({ user: publicUser(row) }, 200, { 'Set-Cookie': cookieHeader(session.token, 14 * 86400) });
}
