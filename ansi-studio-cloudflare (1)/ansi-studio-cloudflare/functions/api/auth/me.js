import { json, currentUser } from '../../_utils.js';
export async function onRequestGet({ request, env }) { return json({ user: await currentUser(request, env) }); }
