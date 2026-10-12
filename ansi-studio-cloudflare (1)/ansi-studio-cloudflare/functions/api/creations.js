import { json, fail, readJson, checkOrigin, currentUser } from '../_utils.js';
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  const result = await env.DB.prepare('SELECT id,title,raw_text AS rawText,ansi_code AS ansiCode,style,created_at AS createdAt FROM creations WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();
  return json({ creations: result.results || [] });
}
export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  let body; try { body = await readJson(request); } catch (e) { return fail(e.message); }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const rawText = typeof body.rawText === 'string' ? body.rawText : '';
  const ansiCode = typeof body.ansiCode === 'string' ? body.ansiCode : '';
  const style = typeof body.style === 'string' ? body.style : 'rainbow';
  if (!title || title.length > 80) return fail('Give your creation a name of 1–80 characters.');
  if (rawText.length > 2000 || ansiCode.length > 30000) return fail('This creation is too large.');
  if (!['rainbow','pink','dreamy','ocean','sunset','solid','alternate','custom','plain'].includes(style)) return fail('Invalid text style.');
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO creations (id,user_id,title,raw_text,ansi_code,style,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,user.id,title,rawText,ansiCode,style,now,now).run();
  return json({ ok: true, id }, 201);
}
