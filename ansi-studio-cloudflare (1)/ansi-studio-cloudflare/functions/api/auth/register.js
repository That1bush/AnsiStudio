import { json, fail, readJson, checkOrigin, hashPassword, createSession, cookieHeader, validUsername, TERMS_VERSION, publicUser } from '../../_utils.js';
export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  let body; try { body = await readJson(request); } catch (e) { return fail(e.message); }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!validUsername(username)) return fail('Username must be 3–24 characters and use only letters, numbers or underscores.');
  if (password.length < 10 || password.length > 128) return fail('Password must be between 10 and 128 characters.');
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return fail('Enter a valid email address or leave it blank.');
  if (body.acceptTerms !== true || body.termsVersion !== TERMS_VERSION) return fail('You must accept the current Terms of Service, Privacy Policy and Community Rules.');
  const id = crypto.randomUUID();
  try {
    const passwordHash = await hashPassword(password);
    await env.DB.prepare('INSERT INTO users (id,username,password_hash,email,accepted_terms_version,accepted_terms_at) VALUES (?,?,?,?,?,?)').bind(id, username, passwordHash, email || null, TERMS_VERSION, new Date().toISOString()).run();
    const session = await createSession(id, env);
    const row = await env.DB.prepare('SELECT id,username,email,display_name,avatar_data,created_at FROM users WHERE id=?').bind(id).first();
    return json({ user: publicUser(row) }, 201, { 'Set-Cookie': cookieHeader(session.token, 14 * 86400) });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('users.username')) return fail('That username is already taken.', 409);
    if (email && msg.includes('users.email')) return fail('That email address is already attached to an account.', 409);
    return fail('Could not create the account. Please try again.', 500);
  }
}
