---
name: "playbook-site-apps-on-other-hosts"
description: "The honest answer for sites on WordPress, Webflow, Shopify, Squarespace, Wix, Ghost, Framer, Vercel or Netlify. Today the apps run on sites hosted on Cloudflare Pages or Workers, and (beta) in front of a site on its own server or VPS with DNS on Cloudflare. Site builders aren't supported. What works now, and what your AI agent can offer you today. Use when the site owner's site is on WordPress, Webflow, Shopify, Squarespace, Wix, Ghost, Framer or another host that is not Cloudflare Pages or Workers, so the agent gives an honest answer instead of attempting an install."
metadata:
  source: "playbook"
  slug: "site-apps-on-other-hosts"
  verified_on: "Wix and Ghost help pages checked 2026-11-02; Cloudflare Workers limits (daily requests, error 1027, fail open and closed) and routes docs checked 2026-11-22; the own-server conditions from the install guide (core 0.31.1)"
---

> From the Sundogs playbook `site-apps-on-other-hosts` (verified on Wix and Ghost help pages checked 2026-11-02; Cloudflare Workers limits (daily requests, error 1027, fail open and closed) and routes docs checked 2026-11-22; the own-server conditions from the install guide (core 0.31.1)). Follow it for the user's stack.

# Can I use these apps on WordPress, Webflow, Shopify, Squarespace or Wix?

**Site builders aren't supported; a site on its own server works as a beta.** The apps run inside a small Cloudflare Worker that sits in front of your pages, in your own Cloudflare account. That works when the site itself is hosted on **Cloudflare Pages** or **Workers**, or, as a beta, on its own server.

**Sites on their own server or VPS with DNS on Cloudflare: a beta.** The same Worker runs in front of the server, and nothing changes on the server. It has been tested on a live server; things may still break. Report issues at https://github.com/sundoggs/support/issues/new. Before choosing it, know what it needs:

- **The DNS record must be proxied** (the orange cloud in the Cloudflare DNS settings). The Worker only runs on a proxied hostname. Turning the proxy on changes how traffic reaches the server, so your agent asks you first.
- **Every request counts.** Every request to the site that runs through the Worker, images, CSS and scripts included, counts toward the account's 100,000 free Worker requests a day, shared by every Worker in the account. A page with 20 files is 21 requests.
- **The route must be set to fail open.** Otherwise, once those requests run out, the whole site shows Cloudflare error 1027 until midnight UTC. With fail open the site keeps loading, without the apps. The install sets it after every deploy and checks it.

The steps are the install guide's **Site hosted elsewhere, DNS on Cloudflare** section ([/install-guide.md](/install-guide.md), for your agent; `site-apps/INSTALL.md` in the download). The domain's DNS has to be on Cloudflare first: [Move your domain's DNS to Cloudflare](/playbooks/move-domain-dns-to-cloudflare).

**Site builders** (Webflow, Shopify, Wix, Squarespace, WordPress.com and so on): not supported. Nothing here is on sale for those hosts, and an agent shouldn't try to install it there.

**For the agent:** for a site on its own server with DNS on Cloudflare, tell the owner it is a beta and the three points above, then follow that section of the install guide. For a site builder, say this plainly, then offer the two options below. Don't push a move, don't claim support, don't start a checkout.

## What the agent can offer today

1. **Free how-to playbooks.** Some work on any site, for example [collecting reviews within Google's and the FTC's rules](/playbooks/collect-show-reviews-google-ftc-rules) (the rules and the markup) and [getting new pages indexed faster](/playbooks/get-new-pages-indexed-faster-cloudflare) (sitemaps, Search Console and IndexNow). Most playbooks assume Cloudflare; say so when one doesn't fit.
2. **Moving to a Cloudflare-hosted site, if the owner wants it.** Never pushed; it's a real change. For a static site on Netlify, Vercel or GitHub Pages: [Move a static site to Cloudflare](/playbooks/move-static-site-to-cloudflare). For a site builder (Webflow, Squarespace, Wix, Shopify, WordPress.com) a move means rebuilding the site in code, which is a project, not an install. Say that honestly.

## WordPress

- **On its own server or VPS:** the own-server beta above. It hasn't been tested with WordPress itself yet. List the admin (`/wp-admin/*`, `/wp-login.php`) in `exclude`, so the apps leave it alone.
- **On WordPress.com or a managed WordPress host:** not supported.

## Hosts whose records must stay DNS only

Some hosts don't allow the Cloudflare proxy in front of them. Wix: "Currently, Wix does not support proxied DNS records for domain connections." Ghost(Pro) says its records must be DNS only (not proxied). Never turn the proxy on for a host that says DNS only.

## Say it plainly

Good: "Your site is on Wix. These apps can't run on Wix sites. I can show you free how-tos, or we can talk about a Cloudflare-hosted site if you ever want one."

Good: "Your site is on Webflow. The apps don't work with Webflow sites. For now I can share free how-tos. Nothing has changed on your site."

Good: "Your site runs on your own server and its DNS is on Cloudflare. The apps can run in front of it as a beta: it has been tested on a live server, but things may still break. Nothing changes on your server. Every request to your site will count toward the 100,000 free Worker requests a day, and I'll set the route to fail open so your site keeps loading if they run out."

Never: say an app works on a host it doesn't, start a checkout for a site that can't run the app, turn on the Cloudflare proxy for a host that says DNS only, or tell the owner they must move.

## Sources

- Cloudflare: [Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/) (a route only runs on a proxied hostname), [Workers limits: daily requests](https://developers.cloudflare.com/workers/platform/limits/#daily-requests) (fail open or closed)
- [Wix: proxy support](https://support.wix.com/en/article/request-cloudflare-proxy-support)
- [Ghost: Cloudflare domain setup](https://ghost.org/help/cloudflare-domain-setup/)
