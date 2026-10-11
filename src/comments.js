// Comments made on the developer site with the comment tool (public/_tools/comments.js).
// Stored in Cloudflare KV, binding COMMENTS. Only reachable with a pass (worker.js).
//   GET  /api/comments                 open comments (?status=all|done, ?page=/setup for one page)
//   GET  /api/comments?img=<id>        a picture attached to a comment (<id>:<n>)
//   POST /api/comments                 new comment (JSON)
//   POST /api/comments?resolve=<id>    mark done (JSON {note} optional, shown to the person)
//   POST /api/comments?reopen=<id>     open again
//   POST /api/comments?edit=<id>       change a saved comment (JSON {comment, newText}); earlier wording kept in history
// Kinds: a normal comment, or kind "design" (a font and colour design from the switcher that Claude should make permanent).
const MAX_IMAGE = 15 * 1024 * 1024;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clip = (v, n) => (v == null ? '' : String(v).slice(0, n));
const newId = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14) + '-' + crypto.randomUUID().slice(0, 6);

export async function onRequest({ request, env }) {
  const kv = env.COMMENTS;
  if (!kv) return json({ error: 'Comment storage is not set up yet (KV binding COMMENTS missing).' }, 503);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const img = url.searchParams.get('img');
    if (img) {
      const { value, metadata } = await kv.getWithMetadata('img:' + img, { type: 'arrayBuffer' });
      if (!value) return new Response('Not found', { status: 404 });
      return new Response(value, { headers: { 'content-type': metadata?.type || 'application/octet-stream', 'cache-control': 'private, max-age=3600' } });
    }
    const status = url.searchParams.get('status') || 'open';
    const page = url.searchParams.get('page');
    const out = [];
    let cursor;
    do {
      const list = await kv.list({ prefix: 'c:', cursor });
      for (const k of list.keys) {
        const c = await kv.get(k.name, { type: 'json' });
        if (!c) continue;
        if (status !== 'all' && c.status !== status) continue;
        if (page && c.page !== page) continue;
        out.push(c);
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
    out.sort((a, b) => a.created.localeCompare(b.created));
    return json(out);
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  for (const action of ['resolve', 'reopen']) {
    const id = url.searchParams.get(action);
    if (!id) continue;
    const c = await kv.get('c:' + id, { type: 'json' });
    if (!c) return json({ error: 'Not found' }, 404);
    const body = await request.json().catch(() => ({}));
    c.status = action === 'resolve' ? 'done' : 'open';
    c.resolvedNote = action === 'resolve' ? clip(body.note, 2000) : '';
    c.resolvedAt = action === 'resolve' ? new Date().toISOString() : '';
    await kv.put('c:' + id, JSON.stringify(c));
    return json(c);
  }

  const editId = url.searchParams.get('edit');
  if (editId) {
    const c = await kv.get('c:' + editId, { type: 'json' });
    if (!c) return json({ error: 'Not found' }, 404);
    const body = await request.json().catch(() => ({}));
    const comment = body.comment != null ? clip(body.comment, 5000) : c.comment;
    const newText = body.newText != null ? clip(body.newText, 10000) : c.newText;
    if (!comment && !newText && !(c.attachments || []).length && !c.design) return json({ error: 'Empty comment' }, 400);
    c.history = [...(c.history || []), { at: new Date().toISOString(), comment: c.comment, newText: c.newText }].slice(-20);
    c.comment = comment; c.newText = newText; c.edited = new Date().toISOString();
    await kv.put('c:' + editId, JSON.stringify(c));
    return json(c);
  }

  const b = await request.json().catch(() => null);
  const atts = Array.isArray(b?.attachments) ? b.attachments.slice(0, 8) : [];
  const design = b && b.kind === 'design' && b.design && typeof b.design === 'object' ? b.design : null;
  if (!b || (!b.comment && !b.newText && !atts.length && !design)) return json({ error: 'Empty comment' }, 400);
  if (design && JSON.stringify(design).length > 30000) return json({ error: 'Design too large' }, 413);
  const id = newId();
  const c = {
    id, created: new Date().toISOString(), status: 'open', kind: design ? 'design' : 'comment',
    author: clip(b.author, 60), page: clip(b.page, 300), lang: clip(b.lang, 5), view: clip(b.view, 10), width: +b.width || 0,
    selector: clip(b.selector, 600), elementId: clip(b.elementId, 80), tag: clip(b.tag, 20),
    elementText: clip(b.elementText, 600), highlight: clip(b.highlight, 2000),
    comment: clip(b.comment, 5000), newText: clip(b.newText, 10000), x: +b.x || 0, y: +b.y || 0,
    design: design || undefined,
  };
  // Pictures added to explain a comment (screenshots, examples, a photo to use).
  c.attachments = [];
  for (const [n, a] of atts.entries()) {
    const m = typeof a?.data === 'string' && a.data.match(/^data:(image\/[\w+.-]+);base64,(.*)$/);
    if (!m) continue;
    const bytes = Uint8Array.from(atob(m[2]), (ch) => ch.charCodeAt(0));
    if (bytes.length > MAX_IMAGE) return json({ error: 'Picture larger than 15 MB' }, 413);
    await kv.put(`img:${id}:${n}`, bytes, { metadata: { type: m[1], name: clip(a.name, 200) } });
    c.attachments.push({ type: m[1], name: clip(a.name, 200), size: bytes.length, url: `/api/comments?img=${id}:${n}` });
  }
  await kv.put('c:' + id, JSON.stringify(c));
  return json(c, 201);
}
