const COOKIE_NAME = '__Host-ansi_session';
const SESSION_DAYS = 14;
export const TERMS_VERSION = '2026-10-12-v1';
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders } });
}
export function fail(message, status = 400) { return json({ error: message }, status); }
export async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('Send this request as JSON.');
  const text = await request.text();
  if (text.length > 600_000) throw new Error('Request is too large.');
  try { return JSON.parse(text || '{}'); } catch { throw new Error('Invalid JSON request.'); }
}
export function checkOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
export function cookieHeader(value, maxAge) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearCookie() { return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
export function getCookie(request, name = COOKIE_NAME) {
  const header = request.headers.get('Cookie') || '';
  for (const item of header.split(';')) { const i = item.indexOf('='); if (i > -1 && item.slice(0, i).trim() === name) return item.slice(i + 1).trim(); }
  return '';
}
export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function toBase64Url(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
export function randomToken(bytes = 32) { const data = new Uint8Array(bytes); crypto.getRandomValues(data); return toBase64Url(data); }
export async function hashPassword(password, saltText = randomToken(16)) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(saltText), iterations: 310000 }, key, 256);
  return `pbkdf2-sha256$310000$${saltText}$${toBase64Url(new Uint8Array(bits))}`;
}
export async function verifyPassword(password, stored) {
  try {
    const [scheme, countText, salt, expected] = stored.split('$');
    if (scheme !== 'pbkdf2-sha256' || Number(countText) !== 310000 || !salt || !expected) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 310000 }, key, 256);
    return toBase64Url(new Uint8Array(bits)) === expected;
  } catch { return false; }
}
export async function createSession(userId, env) {
  const token = randomToken(32), tokenHash = await sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(tokenHash, userId, expires).run();
  return { token, expires };
}
export async function currentUser(request, env) {
  const token = getCookie(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT u.id,u.username,u.email,u.display_name,u.avatar_data,u.created_at,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > ?`).bind(tokenHash, new Date().toISOString()).first();
  if (!row) return null;
  return { id: row.id, username: row.username, email: row.email || '', displayName: row.display_name || '', avatarData: row.avatar_data || '', createdAt: row.created_at };
}
export function publicUser(row) { return { id: row.id, username: row.username, email: row.email || '', displayName: row.display_name || '', avatarData: row.avatar_data || '', createdAt: row.created_at }; }
export function validUsername(username) { return typeof username === 'string' && /^[A-Za-z0-9_]{3,24}$/.test(username); }
export function validImageData(value, max = 210 * 1024) {
  if (value === '' || value == null) return true;
  if (typeof value !== 'string' || value.length > max * 1.4) return false;
  return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export async function requireUser(request, env) {
  const user = await currentUser(request, env);
  return user;
}
