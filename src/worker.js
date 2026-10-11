// The site's small server program (a Cloudflare Worker). It only runs for the addresses listed under
// run_worker_first in wrangler.jsonc; every other address is served straight from public/ (the live site).
//
//   /_dev/...        the developer site: only with a pass (see below), plus the editing tools
//   /_pass?t=...     where "My site" in Vagabond Studio sends you: checks the pass and remembers it for 30 days
//   /_studio/hello   tells Vagabond Studio that this is one of its sites
//   /api/comments    comments from the comment tool (KV, binding COMMENTS)
//   /api/designs     saved designs of the design switcher (same KV)
//   /api/publish     the Publish button: asks Vagabond Studio to copy a creation to the live site
//   /api/swap        "Replace this picture now": asks Vagabond Studio to save the new picture
//
// The pass: Vagabond Studio signs a short note "this is <person>, for <this address>, until <date>" with its private
// key. This site checks the signature with the Studio's public key in studio.json, so nobody can make a pass
// without the Studio. With DEV_OPEN = "true" the developer site is open without a pass.
import studio from '../studio.json';
import * as comments from './comments.js';
import * as designs from './designs.js';

const SIG = { name: 'ECDSA', hash: 'SHA-256' };
const COOKIE = 'vs_pass';
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const cookieOf = (req, name) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : null; };

async function readPass(env, token, host) {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    // The live Studio's key (passKey) and the developer copy's key (passKeys) are both accepted.
    const jwks = env.PASS_KEY_FOR_TESTS ? [JSON.parse(env.PASS_KEY_FOR_TESTS)] : [studio.passKey].concat(studio.passKeys || []);
    let ok = false;
    for (const jwk of jwks) {
      const key = await crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['verify'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      if (await crypto.subtle.verify(SIG, key, unb64u(sig), new TextEncoder().encode(payload))) { ok = true; break; }
    }
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    if (!(p.exp > Date.now() / 1000) || p.host !== host) return null;
    return p;
  } catch (e) { return null; }
}

// Who is asking: {kind: "owner"|"studio"|"open", token} or null.
async function who(request, env, host) {
  const bearer = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/);
  if (bearer) { const p = await readPass(env, bearer[1], host); if (p) return { kind: p.kind, token: bearer[1] }; }
  const c = cookieOf(request, COOKIE);
  if (c) { const p = await readPass(env, c, host); if (p && p.kind === 'owner') return { kind: 'owner', token: c }; }
  if (env.DEV_OPEN === 'true') return { kind: 'open', token: '' };
  return null;
}

function locked(env) {
  const studioUrl = env.STUDIO_URL || studio.studioUrl;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Private</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:17px/1.6 system-ui,sans-serif;background:#f4f5f3;color:#222}main{max-width:30rem;padding:2rem}h1{font-size:1.6rem;margin:0 0 .5rem}a{color:#2e5450}</style></head>
<body><main><h1>This is a private developer site</h1><p>Only its owner can open it. If that's you, open it from <a href="${studioUrl}/go/site">Vagabond Studio</a> with "My site".</p></main></body></html>`,
    { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// The editing tools, added to every page of the developer site.
const HEAD = '<link rel="stylesheet" href="/_tools/tools.css"><link rel="stylesheet" href="/_tools/design.css"><link rel="stylesheet" href="/_tools/dev.css"><script src="/_tools/design-early.js"></script>';
const BODY = '<script src="/_tools/dev.js"></script><script src="/_tools/design.js" defer></script><script src="/_tools/comments.js" defer></script>';

async function forwardToStudio(request, env, path, access) {
  if (access.kind !== 'owner') return json({ error: 'Please open your site from Vagabond Studio ("My site") first.' }, 401);
  const studioUrl = env.STUDIO_URL || studio.studioUrl;
  const r = await fetch(studioUrl + path, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + access.token }, body: await request.text() });
  return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname, host = url.host;

    if (path === '/_studio/hello') return json({ studio: true, template: 'vagabond-studio-site', version: 1, studioUrl: env.STUDIO_URL || studio.studioUrl });

    if (path === '/_pass') {
      const t = url.searchParams.get('t') || '';
      const to = (url.searchParams.get('to') || '/_dev/').replace(/[^\w\/.-]/g, '');
      const p = await readPass(env, t, host);
      if (!p || p.kind !== 'owner') return locked(env);
      const age = Math.max(60, Math.min(30 * 86400, Math.floor(p.exp - Date.now() / 1000)));
      return new Response(null, { status: 302, headers: { Location: to.startsWith('/_dev') ? to : '/_dev/', 'Set-Cookie': `${COOKIE}=${t}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`, 'cache-control': 'no-store' } });
    }

    const access = await who(request, env, host);

    if (path.startsWith('/api/')) {
      if (!access) return json({ error: 'Not allowed. Open your site from Vagabond Studio ("My site").' }, 401);
      if (path === '/api/comments') return comments.onRequest({ request, env });
      if (path === '/api/designs') return designs.onRequest({ request, env });
      if (path === '/api/publish' && request.method === 'POST') return forwardToStudio(request, env, '/api/space/publish', access);
      if (path === '/api/swap' && request.method === 'POST') return forwardToStudio(request, env, '/api/space/swap', access);
      return json({ error: 'Not found' }, 404);
    }

    if (path === '/_dev' || path.startsWith('/_dev/')) {
      if (!access) return locked(env);
      if (path === '/_dev') return Response.redirect(url.origin + '/_dev/', 302);
      // Shared files live once on the site: /_dev/_fonts/x is /_fonts/x (so pages work the same before and after publishing).
      const assetUrl = new URL(url);
      if (path.startsWith('/_dev/_fonts/')) assetUrl.pathname = path.slice('/_dev'.length);
      const res = await env.ASSETS.fetch(new Request(assetUrl, request));
      const type = res.headers.get('content-type') || '';
      const out = new Response(res.body, res);
      out.headers.set('cache-control', 'no-store');
      out.headers.set('x-robots-tag', 'noindex');
      if (!type.includes('text/html') || access.kind === 'studio' || url.searchParams.has('thumb')) return out; // thumbnails on My creations: no tools
      return new HTMLRewriter()
        .on('head', { element(el) { el.append(HEAD, { html: true }); } })
        .on('body', { element(el) { el.append(BODY, { html: true }); } })
        .transform(out);
    }

    // Anything else that reached the Worker: not a file on the live site.
    return env.ASSETS.fetch(request);
  },
};
