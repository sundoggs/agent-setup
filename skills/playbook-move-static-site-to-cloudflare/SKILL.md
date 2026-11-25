---
name: "playbook-move-static-site-to-cloudflare"
description: "Move a static site (Astro, Hugo, Eleventy, Vite, Next.js static export, Jekyll or plain HTML) to Cloudflare Workers with static assets or Pages, keeping its redirects, headers and environment variables, replacing Netlify Forms, and switching the domain over with a tested rollback. The old host stays live until you're sure. Use when the site owner has a static site on Netlify, Vercel or GitHub Pages, has decided they want to move it to Cloudflare, and wants the apps on it."
metadata:
  source: "playbook"
  slug: "move-static-site-to-cloudflare"
  verified_on: "Cloudflare Netlify-to-Workers, Vercel-to-Workers and Netlify-to-Pages guides, Workers static assets redirects and headers, Netlify and Vercel environment variable docs, GitHub Pages docs checked 2026-11-02"
---

> From the Sundogs playbook `move-static-site-to-cloudflare` (verified on Cloudflare Netlify-to-Workers, Vercel-to-Workers and Netlify-to-Pages guides, Workers static assets redirects and headers, Netlify and Vercel environment variable docs, GitHub Pages docs checked 2026-11-02). Follow it for the user's stack.
> A ready-made app also covers this (app id: `forms`, `links`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Move a static site from Netlify, Vercel or GitHub Pages to Cloudflare

**Only if the owner wants to move.** The apps need a site hosted on Cloudflare (or, as a beta, on its own server with DNS on Cloudflare; Netlify, Vercel and GitHub Pages aren't that), but moving hosts is the owner's choice, never a requirement you push. Say what the move involves (below) and let them decide.

**Time:** about 15–45 minutes of agent work for a typical static site, plus the domain's DNS wait if it isn't on Cloudflare yet (up to 24 hours, in parallel). **Downtime:** none if you follow the order: new site first, check it, switch the domain last, keep the old host running.

**Is it static?** This playbook is for sites that build to plain files. Stop and assess first if the site uses **Netlify Functions or Edge Functions, Vercel Functions or server-side rendering, Netlify Identity, or Next.js features that need a server** (API routes, ISR, middleware). Those need porting: tell the owner what you found, and consider the framework's own Cloudflare guide (Next.js on Workers via OpenNext, Astro with `@astrojs/cloudflare`).

## Workers or Pages?

Both are first-class for the apps. For a move, use **Workers with static assets**: it's what the Netlify and Vercel migration guides from Cloudflare target, and it's what this playbook shows. If the owner already has a Pages project or prefers Pages, the Cloudflare [Netlify to Pages guide](https://developers.cloudflare.com/pages/migrations/migrating-from-netlify/) covers the same ground.

## 1. Read the current setup (agent, read-only)

Record each answer in the project notes.

| What | Netlify | Vercel | GitHub Pages |
|---|---|---|---|
| Build command and output folder | `netlify.toml` (`[build] command`, `publish`), or dashboard: **Project configuration → Build & deploy → Build settings** | `vercel.json`, or dashboard: project **Settings → Build & Development settings** | `.github/workflows/*.yml` (look for `actions/deploy-pages`), or Jekyll by default |
| Redirects | `_redirects` file, `[[redirects]]` in `netlify.toml` | `redirects` / `rewrites` in `vercel.json`, `next.config.*` | `jekyll-redirect-from` pages, meta refresh |
| Headers | `_headers` file, `[[headers]]` in `netlify.toml` | `headers` in `vercel.json` | none |
| Environment variables | **Project configuration → Environment variables**, or `netlify env:list --plain --context production` | project **Settings → Environment Variables**, or `vercel env pull` (Development values) | repo **Settings → Secrets and variables** if the workflow uses them |
| Forms | `data-netlify="true"` or `netlify` on `<form>`, a hidden `form-name` input | a form service or an API route | a form service (Formspree and similar) |
| Domain and DNS | `dig +short NS example.com`; Netlify DNS uses its own nameservers | same; Vercel DNS uses `*.vercel-dns.com` | `CNAME` file in the published folder |

If you can't find the build settings in the repo and can't see the dashboard, ask the owner for them, or try the framework's defaults:

| Framework | Build command | Output folder |
|---|---|---|
| Astro | `npm run build` | `dist` |
| Vite (React, Vue, Svelte) | `npm run build` | `dist` |
| Next.js static export (`output: "export"`) | `npx next build` | `out` |
| Hugo | `hugo` | `public` |
| Eleventy | `npx @11ty/eleventy` | `_site` |
| Jekyll | `jekyll build` | `_site` |
| Gatsby | `npx gatsby build` | `public` |
| Docusaurus | `npm run build` | `build` |
| Plain HTML | none | the folder with `index.html` |

Source: [Cloudflare framework presets](https://developers.cloudflare.com/pages/configuration/build-configuration/).

## 2. Make it deploy on Cloudflare (agent)

1. Check Cloudflare access: `npx wrangler whoami`. Not logged in? [Create a Cloudflare account and connect Wrangler](/playbooks/create-cloudflare-account-connect-wrangler).
2. Add `wrangler.jsonc` at the project root:

   ```jsonc
   {
     "name": "my-site",
     "compatibility_date": "2026-11-02",    // today
     "assets": { "directory": "./dist" }    // the output folder from step 1
   }
   ```

   A single-page app (every URL served by `index.html`) also needs `"not_found_handling": "single-page-application"` inside `assets`. A normal multi-page site doesn't, and must have a `404.html` instead, or unknown URLs return the home page with status 200 (and redirects and the 404 monitor can't work).
3. Build and deploy to a test address: `npm run build && npx wrangler deploy`. It prints `https://my-site.<subdomain>.workers.dev`.

Sources: [Netlify to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/netlify-to-workers/), [Vercel to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/).

## 3. Redirects and headers (agent)

- **`_redirects`:** Netlify's file format works on Cloudflare for ordinary rules: `source destination [status]`, splats (`*` → `:splat`), placeholders, and 200 rewrites to paths on the same site. Put the file in the folder that's copied to the output (`public/` for Astro and Vite, `static/` for Hugo). **Not supported:** rewrites to other domains, query-parameter conditions, domain-level redirects, country, language or cookie conditions, and status codes other than 301, 302, 303, 307, 308 and 200. Limits: 2,000 static plus 100 dynamic rules, 1,000 characters per rule. Rules in `netlify.toml` or `vercel.json` must be written into `_redirects` (Vercel's `source`/`destination`/`permanent` becomes `source destination 301` or `302`; `:path*` becomes `*` and `:splat`).
- **`_headers`:** same folder, Netlify-style syntax, up to 100 rules, 2,000 characters per line. Headers in `netlify.toml` or `vercel.json` move here.
- Both files only apply to static files. Responses made by Worker code (the apps' Worker included) don't get them; the install guide's "Security headers" section covers headers for those.
- **Check:** for a few old URLs, `curl -sI https://my-site.<subdomain>.workers.dev/old-path | head -3` shows the expected status and `location`.

With the **redirects app** installed later, redirects can be managed in the site admin, with click counts and a 404 monitor. The `_redirects` file keeps working alongside.

Sources: [Workers static assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/), [headers](https://developers.cloudflare.com/workers/static-assets/headers/).

## 4. Environment variables (agent, owner for secrets)

- **Used at build time** (the static site reads them while building, e.g. `PUBLIC_*`, `VITE_*`): with Workers Builds, add them under the Worker → **Settings** → **Build** → **Build variables and secrets**. Deploying from your own computer, put them in the shell or a `.env` file the framework reads (never committed).
- **Used at runtime** by Worker code: `vars` in `wrangler.jsonc` for plain values, and secrets with `npx wrangler secret put NAME` (the owner types the value at the prompt) or the dashboard: Worker → **Settings** → **Variables and Secrets** → **Add**.
- A purely static site often has none at runtime. Don't copy variables you can't explain; list them for the owner.

Sources: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Worker environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/), [secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Netlify env vars](https://docs.netlify.com/build/environment-variables/get-started/), [Vercel env vars](https://vercel.com/docs/environment-variables).

## 5. Forms

Netlify Forms only work on Netlify: after the move, a form with `data-netlify="true"` posts nowhere. Two options:

- **The free forms app** (recommended): install the apps (step 7), then point each form's `action` at `/forms/<name>` with `method="post"`. Remove `data-netlify`, `netlify`, `netlify-honeypot` and the hidden `form-name` input. Fields, markup and styling stay as they are. Submissions land in the site admin's inbox, with a spam filter and optional email notifications. `node site-apps/find-forms.mjs` lists every form it finds. Export old submissions from Netlify first if the owner wants them.
- **Your own code:** the Cloudflare guide suggests a Function that stores submissions; see the [contact form playbook](/playbooks/contact-form-turnstile-d1).

Forms posting to Formspree or another service keep working after the move; the forms app can take them over later if the owner wants an inbox in their own admin.

## 6. Git deploys (optional)

If the repo is on GitHub or GitLab: Cloudflare dashboard → **Workers & Pages** → the Worker → **Settings** → **Builds** → **Connect**, pick the repo, **Build command** from step 1, **Deploy command** `npx wrangler deploy` (the default). The dashboard Worker name must match `name` in `wrangler.jsonc`. Turn off the old host's automatic builds later (step 9), not now.

## 7. Add the apps (agent)

Follow the install guide (`site-apps/INSTALL.md`) on the `workers.dev` address first: it's a free test address for the license. Check `https://my-site.<subdomain>.workers.dev/.well-known/site-apps.json` says `"ok": true` and send a test form.

## 8. Switch the domain (owner and agent)

Compare the new site with the old one first: home page, a few deep pages, a 404, redirects, forms. Then:

1. **DNS on Cloudflare?** `dig +short NS example.com` ends in `.ns.cloudflare.com`? If not, [move the domain's DNS to Cloudflare](/playbooks/move-domain-dns-to-cloudflare) first, **keeping the records that point at the old host**, so nothing changes for visitors during the wait. Domains on Netlify DNS or Vercel DNS: the DNS records to copy are in that host's dashboard.
2. **Note the current records** for `example.com` and `www` (`dig +short A example.com`, `dig +short CNAME www.example.com`). They are your rollback.
3. **Switch:** Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain** for `example.com` (and `www`). Cloudflare won't add a custom domain over an existing CNAME record: delete that record first, then add the custom domain straight away. Or set `"routes": [{ "pattern": "example.com", "custom_domain": true }]` and deploy.
4. **Check:** `curl -sI https://example.com` shows `server: cloudflare` and the page is the new one; `/.well-known/site-apps.json` answers on the real domain. Download the apps for the real domain from the store so the license covers it.
5. **Remove the domain from the old host's dashboard** once it serves from Cloudflare, so the old host stops trying to renew a certificate for it.

## 9. Rollback, and when to remove the old site

- **Rollback:** remove the custom domain from the Worker (**Domains & Routes**), recreate the records you noted in step 8.2, and re-add the domain on the old host if you removed it. The old deployment is still there.
- Keep the old host's project for **one to two weeks**. Then turn off its builds and delete it (Netlify and Vercel: project settings; GitHub Pages: the repo's **GitHub Pages** section, the "…" menu next to "Your site is live at", then **Unpublish site**; also delete the `CNAME` file). The Cloudflare guides say to delete the old app only once the custom domain sends traffic to Workers.

Source: [GitHub Pages: unpublish a site](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site).

## When it fails

| What you see | Fix |
|---|---|
| Every unknown URL shows the home page | Add `404.html` (or remove `not_found_handling` if the site isn't a single-page app) |
| A redirect from `netlify.toml` stopped working | Move it into `_redirects`; check it isn't an unsupported kind (step 3) |
| Styles or images 404 after the move | The output folder or base path is wrong: check `assets.directory` and the framework's `base`/`site` setting |
| Build fails on Workers Builds but works locally | A build variable is missing (step 4), or the Node version differs |
| Custom domain refused | The zone isn't active yet, or a CNAME exists on that hostname |
