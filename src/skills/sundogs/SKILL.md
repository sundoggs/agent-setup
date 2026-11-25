---
name: sundogs
description: Find, get and install ready-made mini apps for a website hosted on Cloudflare Pages or Workers (contact forms, redirects and 404 monitor, popups, countdown timers, reviews, waitlist, SEO, cookie consent, tracking tags, and more) from the {{PRODUCT}} catalog. Use when the user wants a feature on their site, asks if there is an app for something, or wants to install, update or remove a site app.
argument-hint: "[what the site needs]"
---

# Find and install site apps ({{PRODUCT}})

{{PRODUCT}} sells and gives away small apps for websites. They install into the owner's own repo and run in the owner's own Cloudflare account (Workers, D1, static assets, Cloudflare Access). The site never contacts {{PRODUCT}}, and no site data is sent anywhere. The registry only ever learns the owner's account, the site's domain and app ids.

You do the whole job for the owner: recommend, get, install, verify. Ask them only for what you cannot do (signing in, paying, a Cloudflare dashboard step). If the user gave an argument with the command, that is what the site needs.

## Tools

The registry is the MCP server `{{MCP_SERVER}}` ({{MCP_URL}}; on older setups it was added as `site-apps`, the same server). Its tools:

{{STORE_TOOL_TABLE}}

`?` marks an optional argument; each tool's own description says more.

Tools that need sign-in answer with a sign-in request: let the client open the browser for the owner. Never ask the owner to paste a key or token into the chat.

If these tools are not available, the MCP server is not connected. In Claude Code you can add it yourself, for all the owner's projects: `claude mcp add --transport http -s user {{MCP_SERVER}} {{MCP_URL}}`; then tell the owner exactly: "Restart Claude Code in this folder, type /mcp, choose Authenticate on each connection, click Allow in the browser." (You can't run `claude mcp login`: it needs a real terminal. New connections load only when Claude Code starts.) Already added but signed out: the same `/mcp` → Authenticate. Elsewhere tell the owner: in Codex run `codex mcp login {{MCP_SERVER}}`; in Cursor open Settings, MCP and connect `{{MCP_SERVER}}` (its `.cursor/mcp.json` entry needs the `auth` block with `CLIENT_ID` `cursor`, as on {{ORIGIN}}/agents). If the browser sign-in fails or can't open (a remote or headless machine), the owner makes an API key at {{ORIGIN}}/account/agents and you add it as an `Authorization: Bearer` header read from the `SITE_APPS_KEY` environment variable; never ask for the key in the chat. Without a connection you can still read the public catalog at {{ORIGIN}}/llms.txt (apps and playbooks as Markdown), but you cannot claim or download.

## 1. Understand the site and the need

Ask only what you cannot find out yourself, then look in the repo (read-only):
- What the owner wants, in their words (a contact form, redirects for old URLs, a popup, a countdown, reviews, a waitlist...).
- The site's production domain, e.g. `example.com`.
- The host: look for a Wrangler config (`wrangler.jsonc`, `wrangler.json`, `wrangler.toml`), `pages_build_output_dir`, and the framework's Cloudflare adapter in `package.json`. Cloudflare Pages and Workers with static assets are both supported, as are server-rendered sites on Workers (Astro with `@astrojs/cloudflare`, Next.js with OpenNext, or a custom Worker). `INSTALL.md` has the exact table and the one setup that is not supported yet (Pages with its own `_worker.js`): if you hit it, stop and tell the owner plainly. Moving to Workers is their choice, never part of an install.

## 2. Search and recommend

1. `search_catalog` with the need in plain words.
2. For the best match, `get_app`. If it fits, recommend it. For a bigger job (a whole system, or a problem on a given framework), or when only a playbook matches, use `get_playbook` (or the matching `playbook-*` skill if it is installed): it gives the steps to run with the owner and shows where each app fits.
3. Several apps are fine: they work together with no setup (a popup uses the site's existing forms, for example). Do not recommend an app the owner does not need.

## 3. State the requirements before anything is claimed or bought

Tell the owner, in a few plain lines, then carry on (do not block on it unless something is missing):
- The price and the license: free, or per site, or all sites (the license follows the website, not the host).
- The Cloudflare plan: free, or Workers Paid. If Workers Paid is needed, say it plainly, e.g. "this needs a one-time upgrade to Workers Paid", and carry on. Take the cost from `get_app` or the Cloudflare current pricing page, never from memory.
- Bindings, secrets and outside accounts the app needs (from `get_app` and `manifest.json`).
- What you will change in their repo, and that every step is reversible.
- If the app is in beta (`stage: "beta"` in `get_app`), relay it in one line: it works, but things may still break, and a problem report helps. If something breaks later, help the owner report it: {{REPORT}}. Include the app id and version, the core version, the host (Workers or Pages), what happened and the self-test output; never secrets, tokens or visitors' data.

## 4. Get it

- **Free app:** nothing to do here: `get_download` (step 5) claims free apps named in its `apps` that the account doesn't own yet, and its answer (`claimed`) names the free license; tell the owner which license they accepted. `claim_free_app` (app id and the site's domain) does the claim on its own, e.g. to record it before the download. The first signed-in call opens the browser so the owner can sign in (Cloudflare, GitHub, Google or an email link); then repeat the call.
- **Paid app:** first tell the owner the price and the one-line license summary from `get_app` (a site license covers one website; all sites costs more). Then `create_checkout(items, site_domain)`: it answers with what's already owned (never bought twice) and a checkout link on the registry's own site. Give the owner that link (or your client opens it for them): they sign in, tick the license box and pay with Stripe. Never ask for or handle card details yourself. Poll `get_checkout(checkout_id)` until it says `paid`, then continue with the download. If `get_app` says buying through agents isn't open, give the owner the app page ({{ORIGIN}}/apps/<id>) and continue once they own it (`list_owned`).
- **Updates ran out:** `check_updates` says when an app's 12 months of updates ended; `renew_updates` gives a renewal checkout link the same way.

## 5. Download and check the license

1. `get_download` with the site's domain (and `apps` to limit it to what the site needs). A site on `localhost`, `*.pages.dev` or `*.workers.dev` can be used for testing.
2. Run the command it returns to fetch the zip, check the sha256 and unpack it at the repo root so you have `site-apps/`. The answer's `download.needs` says what the link needs (after browser sign-in it carries a one-time secret; with an API key it needs the same key). Do not paste it anywhere.
3. **Check the license before you change anything.** Read `site-apps/license.json` and compare its `domains` with the site's domain. Apex and `www` are the same site; `localhost`, `*.pages.dev` and `*.workers.dev` are free test addresses; a free app is licensed for any site. If it does not cover this site, stop and tell the owner plainly ("this download is licensed for X, not Y") with the fix: download again for this domain, buy a site license for it, or, if the site changed domain, `move_license`. Never edit `license.json`: it is signed, and an edited copy only makes the admin say it does not verify. A license never stops a site working; it decides who gets downloads and updates. No `license.json` means this copy came from the source, not the store: fine for local and test addresses. For a real site, download it from the store so the license and updates work.

## 6. Install

Follow `site-apps/INSTALL.md` from the download. It matches the version you downloaded and is the authority; do not work from memory. In short, it has you:
0. check the site (host, build output, 404 page, admin path, existing functions);
1. check what Cloudflare access you have (session tools, Wrangler login, API token) and tell the owner which parts you can do and which they must (a dashboard step takes about a minute);
2. copy `site-apps/` to the repo root and leave it untouched (it is replaced on every update);
3. connect one D1 database as `SITE_DB`;
4. wire the apps into the site's middleware or Worker entry (the apps list comes from `site-apps/site-apps.mjs`, so adding or removing an app later never changes this file);
5. deploy a preview first, then production;
6. verify;
7. protect the admin with one Cloudflare Access application (recommended), which you create through the API with `node site-apps/admin-setup.mjs access --url https://<domain> --email <owner email>` (it finds or creates the app for exactly the admin path, prints `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD` and checks the redirect; a new account first needs the owner's one-time Zero Trust onboarding in the dashboard), or, only if the owner can't use Access, the admin's own passkey sign-in (`node site-apps/admin-setup.mjs`, INSTALL.md 7a);
8. finish: write both agent connections into the site's project (`node site-apps/connect-agent.mjs --domain <domain> --store {{ORIGIN}}` merges `{{MCP_SERVER}}` and `site-admin` into `.mcp.json`, keeping the owner's other servers; `--cursor` for Cursor) and commit `.mcp.json` with the site; copy `site-apps/skills/*` into the agent skills folder so later sessions know how to manage each app (Claude Code: `.claude/skills/`, Codex, Cursor and most other agents, including Gemini CLI, Copilot and opencode: `.agents/skills/`), and add the one-line note to the README.

Ground rules from the guide that always apply: do not change the site's pages, content or styles; do not change any file before steps 0 and 1 are done; if a step fails or does not match what you find, stop and tell the owner exactly what you saw instead of improvising; never ask for a token in chat (point them to their tool's environment settings).

## 7. Verify

Always run the public ping first, on the site's own domain (it needs no login and returns no site data):

```sh
curl -s https://<domain>/.well-known/site-apps.json
```

Use this address, not `<admin path>/api/ping`: the admin ping answers a plain 404 unless you are signed in (Cloudflare Access, or the admin's own sign-in), so that it never gives the admin's address away. Expect `"ok": true`, `"db": "connected"` and `"schema": "ok"`. The `build` code in it changes with every install or update, so compare it with the one from before you deployed. `INSTALL.md` step 6 says what every other value means and the exact fix for each. Then check that the site's existing pages still return what they did before.

Finish by telling the owner the admin address (`https://<domain><admin path>`), what was installed, what they still have to do, and anything that did not go as planned. Your first line after writing the connections is the sign-in, word for word: "Restart Claude Code in this folder, type /mcp, choose Authenticate on each connection, click Allow in the browser." (Claude Code asks once to approve the project's servers.) After that, use the `site-admin` tools for the site's settings instead of its database.

## Later changes

- **Update:** use the `site-apps-update` skill.
- **Remove one app, or everything:** "Removing one app" and "Uninstall" in `INSTALL.md`. The app's data stays in the database until the owner asks for it to go.
- **Change how an app looks or behaves:** use the app's settings, its styling hooks and core events, and the app's own skill (in `site-apps/skills/`). Do not edit files in `site-apps/`: the next update replaces them.
- **Site moved to a new domain:** `move_license`.
