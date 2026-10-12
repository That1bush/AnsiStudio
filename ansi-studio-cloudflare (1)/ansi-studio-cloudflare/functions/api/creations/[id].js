import { json, fail, checkOrigin, currentUser } from '../../_utils.js';
export async function onRequestDelete({ request, env, params }) {
  if (!checkOrigin(request)) return fail('Request origin was not accepted.', 403);
  const user = await currentUser(request, env); if (!user) return fail('Please log in first.', 401);
  const result = await env.DB.prepare('DELETE FROM creations WHERE id=? AND user_id=?').bind(params.id, user.id).run();
  if (!result.meta?.changes) return fail('Saved creation was not found.', 404);
  return json({ ok: true });
}
