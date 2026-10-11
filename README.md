# My studio site

A website made with [Vagabond Studio](https://studio.vagabondhaven.com): flyers, posters, brochures, business cards and a whole website, created by describing them to Claude.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VagabondHaven/studio-site)

## How it works

- `public/` is the **live site**, open to everyone.
- `public/_dev/` is the **developer site**, only for the owner: each creation is a folder (`public/_dev/summer-flyer/`), the website is `public/_dev/website/`, pictures are in `public/_dev/media/`, and `public/_dev/creations.json` is the list on "My creations".
- **Publish** copies a creation from `public/_dev/<name>/` to `public/<name>/` (the website to the top of the site), together with the pictures.
- `src/worker.js` is the small server program: the lock on the developer site, comments, saved designs, and the Publish and picture buttons. `wrangler.jsonc` holds the Cloudflare settings.
- `public/_tools/` are the editing tools (comment tool, design switcher, developer bar). `public/_fonts/` are the self-hosted fonts.
- `CLAUDE.md` tells any Claude how this site works.

## Doing it by hand instead of the button

1. On GitHub, open this repository and press **Use this template** to make your own copy.
2. In Cloudflare: Workers & Pages, Create, Import a repository, choose your copy, Deploy.
3. If Cloudflare did not create the comment storage: Storage & databases, KV, Create, then in your Worker, Settings, Bindings, add a KV namespace binding named `COMMENTS`.

## Working on it with your own Claude

Open this repository with Claude (Cowork with GitHub connected, or Claude Code). Claude reads `CLAUDE.md` first. To open the developer site without Vagabond Studio, set the variable `DEV_OPEN` to `true` in Cloudflare (Worker, Settings, Variables); then anyone with the address can see it.
