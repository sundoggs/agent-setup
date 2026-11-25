## Site apps (Sundogs)

When the user wants a feature on their website (a form, redirects, a popup, a countdown, reviews, a waitlist, SEO, cookie consent, tracking tags) and the site is hosted on Cloudflare Pages or Workers, use the `sundogs` MCP server (https://sundo.gs/mcp) and the `site-apps` skill (`.agents/skills/site-apps/SKILL.md`): search the catalog, tell the owner the requirements and price, claim or buy, download, check `site-apps/license.json` covers the site's domain, install by following `site-apps/INSTALL.md`, and verify `https://<domain>/.well-known/site-apps.json`.
If the site isn't on Cloudflare Pages or Workers yet (or there is no site, no Cloudflare account or no terminal), use the `site-apps-getting-started` skill first: it runs the store's "Start here" playbook and walks the owner through setup.
Do not edit files inside `site-apps/`: it is replaced on every update. Use each app's settings and its skill instead. Never ask the owner to paste a token into the chat.
