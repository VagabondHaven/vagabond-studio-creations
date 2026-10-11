# Rules for Claude working on this site

This site was made with Vagabond Studio. The owner is not technical: write to them warmly, plainly and briefly, in their language.

## Where things are

- Live site: `public/` (open to everyone). Developer site: `public/_dev/` (only the owner, behind a pass; see `src/worker.js`).
- Each creation is a folder in `public/_dev/` with an `index.html` (one HTML file with its CSS inside for single pages). The website is `public/_dev/website/` (home `index.html`, pages as folders like `about/index.html`, one shared `style.css`).
- Pictures: `public/_dev/media/`. The editing tools in `public/_tools/` and the "My creations" page `public/_dev/index.html` are kept up to date by Vagabond Studio: never change them here. Fonts: `public/_fonts/fonts.css` (Playfair Display, Lora, Cormorant Garamond, DM Serif Display, Lato, Inter, Montserrat, Nunito, Raleway, Josefin Sans, Poppins, Caveat).
- `notes/<slug>.md` (outside `public/`, never on the web): what to remember about each creation and its business, kept by Claude in Vagabond Studio. Read it before changing a creation, and update it when the owner tells you a fact or a decision is made.
- `public/_dev/creations.json`: the list on "My creations" ({slug, title, kind, size, updated, published, publishedFiles}). Update it whenever you add or change a creation.

## How to make and change things

- Change only what the owner asked; mention other problems separately.
- Every link and picture uses a RELATIVE address (`about/`, `../style.css`, `../media/x.jpg`, `../_fonts/fonts.css`), never one starting with `/`, so pages work the same on the developer site and after publishing.
- Printable pages (flyers, posters, cards): design for the exact paper size with `@page { size: A5; margin: 0 }` and a page box of that size.
- Colours as CSS variables on `:root` (`--bg`, `--text`, `--muted`, `--dark`, `--on-dark`, `--light`, `--line`, `--accent`) and the text-role variables (`--f1`..`--f7`, `--s1`..`--s7`, `--c1`..`--c7`) with your own values as fallbacks, so the design switcher works. See `public/_tools/` for the tools.
- Never invent facts about the owner's business (prices, opening hours, reviews, awards). Use a placeholder like [opening hours] and ask.
- Only pictures the owner gave you; never hotlink from other sites. Never link Google Fonts or other outside services on pages.
- Never use the em dash character.

## Comments

The owner comments on the developer site with the comment tool. Comments are stored in Cloudflare KV (binding `COMMENTS`), read with `GET /api/comments` and closed with `POST /api/comments?resolve=<id>` {note}; both need the owner's pass or `DEV_OPEN=true`. When the owner asks for a plan first, describe the changes and wait for their OK.

## Publishing

Publishing copies `public/_dev/<slug>/**` to `public/<slug>/` (the website to `public/`) and `public/_dev/media/**` to `public/media/`, sets `published` in `creations.json`, and is one commit. Only publish when the owner asks.
