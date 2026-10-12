import { json, checkOrigin, fail, getCookie, sha256, clearCookie } from '../../_utils.js';
export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  const token = getCookie(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}
