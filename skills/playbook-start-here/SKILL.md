---
name: "playbook-start-here"
description: "The first check an AI agent runs before installing the apps. It asks or detects whether there is a site, where it is hosted, whether there is a domain and where its DNS is, and whether the owner has a Cloudflare account, GitHub and a terminal, then sends the agent to the right next playbook or straight to the install guide. Use first, before recommending or installing the apps, whenever the owner may not be on Cloudflare Pages or Workers yet, has no site, no Cloudflare account, no GitHub or no terminal, or asks how to get started."
metadata:
  source: "playbook"
  slug: "start-here"
  verified_on: "Cloudflare, GitHub and Claude Code docs checked 2026-11-02"
---

> From the Sundogs playbook `start-here` (verified on Cloudflare, GitHub and Claude Code docs checked 2026-11-02). Follow it for the user's stack.
> A ready-made app also covers this (app id: `forms`, `health`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Start here: which path is this site owner on?

The apps run inside the owner's own Cloudflare account, on a site hosted on **Cloudflare Pages** or **Workers with static assets**, or (beta, tested on a live server) in a small Worker in front of a site on its own server (a VPS or a cloud server) whose **DNS is on Cloudflare**. Many owners aren't there yet. This playbook finds out where they are in a few minutes and sends you to the right next step. Run it before you recommend or install anything.

**How to run it**

- Detect first, ask second. Every question below has a check you can run yourself. Only ask the owner what you couldn't find out, and tell them what you checked.
- Ask one question at a time, in plain words. The owner may not know what DNS or a terminal is: the "ask" lines are written for them.
- Never ask for a password, token or API key in the chat.
- Don't change anything while you run this playbook. It only reads.
- Write down the answers (the getting-started skill keeps them in `.site-apps/onboarding.md` in the project), so a new session doesn't ask again.

## The seven questions

### 1. Can you run commands?

You need a shell to run Wrangler, git and the installer. Check by running something harmless:

```sh
node --version && npx --version && git --version
```

- **It runs:** good. Wrangler supports the Current, Active and Maintenance versions of Node.js ([Install Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)); if `node --version` is older than that, update Node first.
- **You can't run commands at all** (a chat-only app): stop here and follow [No GitHub and no terminal](/playbooks/no-github-no-terminal).

### 2. Is there a website already?

- **Detect:** are you in a project folder? Look for `package.json`, `index.html`, a framework config (`astro.config.*`, `next.config.*`, `hugo.toml`, `vite.config.*`, `eleventy.config.*`), and `git remote -v`.
- **Ask:** "Do you already have a website? If so, what's its address?"

If there is no site, skip to question 5 and then route to [Start a site on Cloudflare](/playbooks/start-a-site-on-cloudflare).

### 3. Where is the site hosted?

**Detect from the project:**

| You find | Hosted on |
|---|---|
| `wrangler.jsonc`, `wrangler.json` or `wrangler.toml`; `@astrojs/cloudflare` or `@opennextjs/cloudflare` in `package.json` | Cloudflare (Workers, or Pages if the config has `pages_build_output_dir`) |
| A server-side app with no Cloudflare config (a Dockerfile, `Procfile`, `fly.toml`, `render.yaml`, `railway.json`, an Nginx or Caddy config, Django, Rails, Laravel, Express…), or the owner says it runs on a VPS or a cloud server | Its own server (DigitalOcean, Google Cloud, AWS, Hetzner…) or a platform (Render, Fly, Railway: may sit behind Cloudflare themselves, unchecked) |
| `netlify.toml`, or a `_redirects` file and the owner says Netlify | Netlify |
| `vercel.json`, or a `.vercel/` folder | Vercel |
| A `CNAME` file in the published folder, or a GitHub Actions workflow using `actions/deploy-pages` | GitHub Pages |
| No code at all, the site is edited in a browser | A site builder (WordPress.com, Webflow, Squarespace, Wix, Shopify, Framer, Ghost…) |

**Detect from the live site** (hints, not proof; confirm with the owner):

```sh
curl -sI https://example.com | grep -iE '^(server|x-powered-by|cf-ray|x-vercel-id|x-nf-request-id):'
dig +short CNAME www.example.com
```

- `server: cloudflare` with a `cf-ray` header means traffic goes **through** Cloudflare. It does **not** prove the site is hosted on Pages or Workers: a WordPress or Webflow site behind the Cloudflare proxy looks the same. Check the repo or ask.
- `x-vercel-id` points to Vercel, `x-nf-request-id` or `server: Netlify` to Netlify, `server: GitHub.com` to GitHub Pages. A `CNAME` to `*.netlify.app`, `*.vercel-dns.com`, `*.github.io`, `*.pages.dev`, `cdn.webflow.com`, `shops.myshopify.com` or a Squarespace host says the same. These header and host names are common observations, not documented guarantees: *unverified as a complete list*.
- **Ask:** "Where does your site live? For example Cloudflare, Netlify, Vercel, GitHub Pages, WordPress, Webflow, Squarespace, Wix or Shopify."

If you can see it's on Cloudflare, confirm which project: `npx wrangler deployments list` (Workers) or `npx wrangler pages project list` (Pages) once Wrangler is logged in.

### 4. Is there a domain, and where is its DNS?

- **Detect:** the site's address from question 2. If it's `*.workers.dev`, `*.pages.dev`, `*.netlify.app`, `*.vercel.app` or `*.github.io`, there's no custom domain yet.
- **Check where DNS is answered:**

  ```sh
  dig +short NS example.com
  # no dig? The Cloudflare DNS over HTTPS answers the same question:
  curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=NS'
  ```

  Two names ending in `.ns.cloudflare.com` mean the DNS is on Cloudflare. Anything else (`domaincontrol.com` is GoDaddy, `registrar-servers.com` is Namecheap, and so on) means it's elsewhere.
- **Ask, if there's no domain:** "Do you own a domain name, like yourbusiness.com? Where did you buy it?" A domain is optional to start: a free `workers.dev` address works on day one.

Sources: [Cloudflare full setup: check nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [DNS over HTTPS JSON API](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/).

### 5. Is there a Cloudflare account, and can you use it?

```sh
npx wrangler whoami
```

- "You are logged in…" with an account: done.
- "You are not authenticated": ask "Do you have a Cloudflare account?" If not, or if you can't log in from here, follow [Create a Cloudflare account and connect Wrangler](/playbooks/create-cloudflare-account-connect-wrangler).
- An MCP server or connector with Cloudflare tools in your session also counts. Check what it can do; the install guide's step 1 lists the capabilities.

### 6. Is there GitHub (or GitLab)?

```sh
git remote -v
gh auth status   # if the GitHub CLI is installed
```

- A remote on github.com and `Logged in to github.com` is everything you need for git deploys.
- No GitHub is fine. Sites can deploy straight from this computer with Wrangler; git deploys can come later. Ask only if you're about to set up git deploys: "Do you have a GitHub account? It's free and lets your site update every time you save a change, but you don't need it to start."

### 7. Who deploys today?

- **Detect:** a GitHub Actions workflow, Workers Builds or Pages Git integration (the Cloudflare dashboard shows "Connected to GitHub"), or nothing (deployed by hand).
- This decides whether the install ends with a `git push` or a `wrangler deploy`. The install guide covers both.

## Route

Pick the first row that matches and tell the owner, in one or two sentences, what happens next and roughly how long it takes.

| Situation | Next step | Owner's time (estimate) |
|---|---|---|
| Can't run commands | [No GitHub and no terminal](/playbooks/no-github-no-terminal) | 10–20 min to get a coding agent |
| No Cloudflare account, or Wrangler can't log in | [Create a Cloudflare account and connect Wrangler](/playbooks/create-cloudflare-account-connect-wrangler), then come back here | 3–5 min |
| No site yet | [Start a site on Cloudflare](/playbooks/start-a-site-on-cloudflare) | 5–15 min |
| Static site on Netlify, Vercel or GitHub Pages | [Move a static site to Cloudflare](/playbooks/move-static-site-to-cloudflare) (only if they want to move) | 15–45 min |
| Its own server (a VPS or a cloud server: DigitalOcean, Google Cloud, AWS, Hetzner…), **DNS on Cloudflare** | The install guide's **Site hosted elsewhere, DNS on Cloudflare** section (**beta: tested on a live server, things may still break**; tell the owner): a Worker on a route in front of the server, no migration and no change to the server. It checks the zone and the proxied record itself. Platforms that may sit behind Cloudflare themselves (Render, Fly, Railway) are unchecked. | 15–30 min |
| Its own server, **DNS elsewhere** | [Move your domain's DNS to Cloudflare](/playbooks/move-domain-dns-to-cloudflare) (the Cloudflare free plan; the site stays where it is), then the install guide's **Site hosted elsewhere, DNS on Cloudflare** | 10 min of clicks, then up to a day of waiting |
| WordPress, Webflow, Shopify, Squarespace, Wix, Ghost, Framer or similar | [Site on WordPress, Webflow, Shopify, Squarespace or Wix](/playbooks/site-apps-on-other-hosts): honest about what works today | 2 min to read |
| On Cloudflare Pages or Workers | The install guide (`site-apps/INSTALL.md` in the download, also at `/install-guide.md` on the store). Start at step 0. | 10–30 min |

**The domain runs in parallel, never in front.** If the owner has a domain whose DNS isn't on Cloudflare, start the site on its free `workers.dev` address first and do [Move your domain's DNS to Cloudflare](/playbooks/move-domain-dns-to-cloudflare) alongside. The nameserver change can take up to 24 hours; nothing else has to wait for it. The license treats `*.workers.dev` and `*.pages.dev` as free test addresses.

**One special case on Cloudflare:** a Pages project whose build contains its own `_worker.js` isn't supported. The install guide's step 0 says what to tell the owner.

## Say it plainly

Good: "Your site is on Webflow. The apps don't work with Webflow sites. Today I can show you free how-tos, or help you move to Cloudflare if you ever want to. Nothing changes unless you say so."

Good: "Your site runs on your own server at DigitalOcean and its DNS is already on Cloudflare. The apps can sit in front of it in your Cloudflare account: nothing changes on your server, and it's one command to undo. This setup is new (beta): it has been tested on a live server, but things may still break. Each request, including images and scripts, runs through that small Worker and counts toward the account's 100,000 requests a day on the Workers Free plan."

Good: "You don't have a Cloudflare account yet. It's free and takes about 3 minutes; I'll walk you through it and tell you exactly what to click."

Never: push a move to another host, say an app "works with" a host it doesn't, start a checkout before the site can run the app, or block the whole setup on the DNS wait.

## Sources

- [Cloudflare full setup (nameservers, `dig ns`, up to 24 hours)](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Wrangler `login` and `whoami`](https://developers.cloudflare.com/workers/wrangler/commands/general/)
- [`workers.dev` addresses](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [GitHub CLI `gh auth`](https://cli.github.com/manual/gh_auth_login)
- Hosts and proxying: the research note behind these playbooks lists each host's official guidance.
