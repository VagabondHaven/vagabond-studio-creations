// Saved designs of the font and colour switcher (public/_tools/design.js), shared by everyone on the test site.
// Stored in the same KV as the comments (binding COMMENTS), all in one key.
//   GET  /api/designs                 list
//   POST /api/designs                 save {name, kind: fonts|colours, settings}; the same name overwrites
//   POST /api/designs?delete=<id>
const KEY = 'designs';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequest({ request, env }) {
  const kv = env.COMMENTS;
  if (!kv) return json({ error: 'Storage is not set up yet (KV binding COMMENTS missing).' }, 503);
  const list = (await kv.get(KEY, { type: 'json' })) || [];
  if (request.method === 'GET') return json(list);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = new URL(request.url);
  const del = url.searchParams.get('delete');
  if (del) {
    const next = list.filter((d) => d.id !== del);
    await kv.put(KEY, JSON.stringify(next));
    return json(next);
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 60);
  const kind = ['fonts', 'colours'].includes(body.kind) ? body.kind : null;
  const settings = body.settings && typeof body.settings === 'object' ? body.settings : null;
  if (!name || !kind || !settings) return json({ error: 'Name, kind and settings needed' }, 400);
  if (JSON.stringify(settings).length > 20000) return json({ error: 'Too large' }, 413);
  const now = new Date().toISOString();
  const existing = list.find((d) => d.name.toLowerCase() === name.toLowerCase() && d.kind === kind);
  if (existing) Object.assign(existing, { settings, updated: now });
  else list.push({ id: now.replace(/\D/g, '').slice(0, 14) + '-' + crypto.randomUUID().slice(0, 4), name, kind, settings, created: now, updated: now });
  await kv.put(KEY, JSON.stringify(list));
  return json(list);
}
