---
name: "playbook-start-a-site-on-cloudflare"
description: "No site yet? An AI agent creates one on the Cloudflare free plan, puts it live on a free workers.dev address, and installs the app you need (say, a contact form inbox) with a health page, offering the other free apps once it works. With GitHub you get automatic deploys on every push; without GitHub it deploys straight from your computer. Includes the Cloudflare temporary accounts, where the agent deploys first and you claim the site within an hour. Use when the site owner has no website yet and wants one on Cloudflare that the apps can be installed into."
metadata:
  source: "playbook"
  slug: "start-a-site-on-cloudflare"
  verified_on: "create-cloudflare, Workers static assets, Workers Builds, workers.dev, custom domains and temporary accounts docs checked 2026-11-02"
---

> From the Sundogs playbook `start-a-site-on-cloudflare` (verified on create-cloudflare, Workers static assets, Workers Builds, workers.dev, custom domains and temporary accounts docs checked 2026-11-02). Follow it for the user's stack.
> A ready-made app also covers this (app id: `forms`, `health`, `analytics`, `consent`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Start a new website on Cloudflare

The plan: a simple site live on a free `workers.dev` address within minutes, the app you need on it plus Site Health (the other free apps offered once it works), and your own domain later. Everything runs on the Cloudflare free plan.

**The owner's part:** answer two or three questions and, depending on the route, sign up or click Allow once. **The agent's part:** everything else.

## 0. Ask two things (agent)

1. "What's the site for, in a sentence? A business page, a portfolio, a waitlist for a product?" Use it to write the first page; keep it short and let the owner edit later.
2. "Do you have a GitHub account?" Check yourself first with `gh auth status` and `git remote -v`. **GitHub is optional.** With it, the site redeploys on every push. Without it, you deploy from this computer.

Then check Cloudflare: `npx wrangler whoami`.

| Wrangler says | Route |
|---|---|
| Logged in | **A** (GitHub) or **B** (no GitHub) |
| Not logged in, owner has no account yet | **C** (temporary account: deploy first, owner claims within 60 minutes), or create the account first: [Create a Cloudflare account and connect Wrangler](/playbooks/create-cloudflare-account-connect-wrangler) |
| Not logged in, owner has an account | Log in first (same playbook, step 3) |

## 1. Make the site (agent, about 2 minutes)

Two good starting points:

**Plain static site with Astro (recommended for the free apps).** Static sites are the simplest install path.

```sh
npm create astro@latest my-site -- --template minimal --no-install --no-git --skip-houston
cd my-site && npm install
```

Add a Wrangler config at the project root, `wrangler.jsonc`:

```jsonc
{
  "name": "my-site",                 // becomes my-site.<your-subdomain>.workers.dev
  "compatibility_date": "2026-11-02", // today's date
  "assets": { "directory": "./dist" }
}
```

No `main` and no Astro adapter: a static site needs no Worker code ([Astro on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)). The site-apps install adds the small Worker the apps need.

**Or the Cloudflare scaffolder** for any framework (React, Vue, Next.js, Astro and more). It creates a Workers project by default and can deploy at the end:

```sh
npm create cloudflare@latest -- my-site --framework=astro --no-deploy
```

Flags: `--framework` picks the framework, `--platform=pages` makes a Pages project instead (Workers is the default), `--no-deploy` and `--no-git` skip those steps, `-y` accepts defaults ([create-cloudflare](https://developers.cloudflare.com/pages/get-started/c3/)). Framework templates may add a server adapter; the install guide supports Astro with `@astrojs/cloudflare` and Next.js with OpenNext, but plain static is fewer moving parts.

**Before you deploy, add a 404 page** (`src/pages/404.astro` using the site's layout). Without one, unknown URLs return the home page with status 200, and redirects and the 404 monitor can't work.

Check it builds: `npm run build` should create `dist/` with `index.html` and `404.html`.

## 2. Put it live

### Route A: with GitHub, deploys on every push

1. **Create the repo and push** (agent):

   ```sh
   git init -b main && git add -A && git commit -m "First version of the site"
   gh repo create my-site --private --source=. --push
   ```

   No `gh`? The owner creates an empty private repo at https://github.com/new, then you `git remote add origin <url>` and `git push -u origin main`.

2. **First deploy** (agent): `npx wrangler deploy` after `npm run build`. It prints the live address, `https://my-site.<subdomain>.workers.dev`.

3. **Connect Workers Builds** so each push deploys (owner, about 2 minutes). Tell them:
   - Cloudflare dashboard → **Workers & Pages** → select **my-site** → **Settings** → **Builds** → **Connect**.
   - Pick **GitHub**, sign in to GitHub if asked and allow Cloudflare to see the repo, then select **my-site**.
   - **Build command:** `npm run build`. **Deploy command:** leave the default, `npx wrangler deploy`. Branch: `main`.
   - Save.

   The Worker's name in the dashboard must match `name` in `wrangler.jsonc`, or the build fails. Other branches get preview builds with their own preview address.

4. **Check** (agent): push a small change, wait about a minute, then `curl -s https://my-site.<subdomain>.workers.dev | grep "<the change>"`. The build log is under the Worker → **Deployments** (or **Builds**) in the dashboard.

Source: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

### Route B: no GitHub, deploy from this computer

```sh
npm run build && npx wrangler deploy
```

That's the whole deploy. Run the same two commands after every change. `git init` locally is still a good idea (it makes every change easy to undo), but nothing has to be online. You can connect GitHub later with Route A step 3.

### Route C: no Cloudflare account yet (temporary account)

Cloudflare lets an agent deploy **before** anyone signs up. The deploy gets a claim link; the owner has **60 minutes** to open it and sign up or sign in, or Cloudflare deletes it.

```sh
npx wrangler@latest --version   # must be 4.102.0 or later
npm run build && npx wrangler deploy --temporary
```

- Works only when Wrangler has **no** credentials (no login, no `CLOUDFLARE_API_TOKEN`).
- Supports Workers on `workers.dev`, static assets (up to 1,000 files, 5 MiB each) and **one D1 database up to 100 MB**, which is what the apps use. R2 isn't supported, and the docs don't mention custom domains.
- Give the owner the claim link straight away: "Open this within the hour and sign up (free) to keep your site. Opening it isn't enough; finish the sign-up." Then help with email verification (account playbook, step 2).
- After they claim it, the site and its database stay. Log in for future deploys: `npx wrangler login` (or `--device` in a cloud agent), then deploy without `--temporary`.

Temporary accounts are new (June 2026) and Cloudflare says their capabilities may change: re-check the page before relying on a detail.

Source: [Deploy without an account (claim deployments)](https://developers.cloudflare.com/workers/platform/claim-deployments/).

## 3. Add your first app (agent, about 10 minutes)

The free apps are Forms (a forms inbox: contact form, spam filter, email notifications), Site Health (a health page for the site and its apps), Analytics (where visits and leads come from) and Cookie Consent (a cookie banner, when the site needs one). `search_catalog` shows which apps are free today.

1. Connect the store's MCP server if it isn't already. Install what the owner asked for (for a new site, usually Forms): `get_download` with the site's `workers.dev` address and `apps: ["forms"]` claims it on the way (the owner signs in once in the browser), and Site Health comes with every install. Test addresses are covered. Don't add Analytics or Cookie Consent unasked: once the first form works, offer them in one plain question.
2. Unzip as `site-apps/` and follow `site-apps/INSTALL.md`. This site is "Workers, static, has a Wrangler config": step 4 → Workers. The database is created on deploy.
3. Admin sign-in: for a new owner, the **passkey sign-in** (install guide 7a) avoids Cloudflare Zero Trust, whose setup asks for card details even on the free plan.
4. Check: `curl -s https://my-site.<subdomain>.workers.dev/.well-known/site-apps.json` shows `"ok": true`.
5. First win: put a contact form on the home page, send a test message, and show the owner it arrived in the admin inbox.

## 4. Your own domain, later

`workers.dev` is fine to start, but Cloudflare calls it "intended for personal or hobby projects that aren't business-critical" and recommends a custom domain for production ([workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)).

1. The domain's DNS must be on Cloudflare (an active zone). If it isn't: [Move your domain's DNS to Cloudflare](/playbooks/move-domain-dns-to-cloudflare). The site keeps working on `workers.dev` while you wait.
2. Then the owner (or agent, with access): **Workers & Pages** → the Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain** → type `example.com` → **Add Custom Domain**. Or add to `wrangler.jsonc`: `"routes": [{ "pattern": "example.com", "custom_domain": true }]` and deploy. Do `www.example.com` too if wanted.
3. Cloudflare creates the DNS record and the certificate. It refuses if the hostname already has a CNAME record: delete that first (after checking what it was for).
4. Check: `curl -sI https://example.com` returns 200, then the `.well-known/site-apps.json` check on the real domain. Download the apps for the real domain from the store so the license covers it.

Source: [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## When it fails

| What you see | Fix |
|---|---|
| `wrangler deploy` asks you to log in | Route C (`--temporary`), or log in |
| `--temporary` errors about existing credentials | You're logged in: deploy without `--temporary` |
| Claim link expired (over 60 minutes) | The temporary deploy is deleted; deploy again (Route C) or log in and use Route B |
| Workers Builds fails with a name mismatch | Make the dashboard Worker name and `name` in `wrangler.jsonc` the same |
| Unknown pages return 200 | Add `src/pages/404.astro` and rebuild |
| Custom domain refused | The zone isn't active yet, or a CNAME exists on that hostname |
