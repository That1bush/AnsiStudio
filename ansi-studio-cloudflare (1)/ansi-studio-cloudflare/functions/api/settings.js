import { json, fail, readJson, checkOrigin, currentUser, validImageData } from '../_utils.js';
const allowedStyles = new Set(['rainbow','pink','dreamy','ocean','sunset','solid','alternate','custom','plain']);
const validHex = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
function cleanSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const s = {};
  if (typeof input.siteName === 'string') s.siteName = input.siteName.trim().slice(0,40) || 'ANSI Studio';
  if (input.logoDataUrl === '' || input.logoDataUrl == null) s.logoDataUrl = '';
  else if (validImageData(input.logoDataUrl, 210 * 1024)) s.logoDataUrl = input.logoDataUrl;
  else return null;
  if (allowedStyles.has(input.style)) s.style = input.style;
  if (['normal','upper','lower','title'].includes(input.caseMode)) s.caseMode = input.caseMode;
  if (input.formatting && typeof input.formatting === 'object') {
    s.formatting = {};
    for (const k of ['bold','italic','underline','strike','useBackground']) if (typeof input.formatting[k] === 'boolean') s.formatting[k] = input.formatting[k];
  }
  for (const k of ['startColor','endColor','backgroundColor']) if (input[k] !== undefined) { if (!validHex(input[k])) return null; s[k] = input[k]; }
  return s;
}
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  const row = await env.DB.prepare('SELECT settings_json FROM user_settings WHERE user_id=?').bind(user.id).first();
  let settings = {}; try { settings = JSON.parse(row?.settings_json || '{}'); } catch {}
  return json({ settings });
}
export async function onRequestPut({ request, env }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  let body; try { body = await readJson(request); } catch (e) { return fail(e.message); }
  const settings = cleanSettings(body.settings);
  if (!settings) return fail('One or more settings are invalid. Try a smaller logo image.');
  await env.DB.prepare("INSERT INTO user_settings (user_id,settings_json,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET settings_json=excluded.settings_json,updated_at=excluded.updated_at").bind(user.id, JSON.stringify(settings), new Date().toISOString()).run();
  return json({ ok: true });
}
