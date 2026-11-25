---
name: "site-apps-getting-started"
description: "Guided first-time setup for Sundogs, one lesson at a time, for owners who are new to Cloudflare or not set up yet. Works out where the owner is (site, host, domain, DNS, Cloudflare account, GitHub, terminal), then walks them from zero to a working install with a first win (a form submission in their admin, or Site Health all green), checking each step and keeping a progress note so a new session can resume. Use when the user is getting started, has no site or no Cloudflare account, has a site on another host, asks \"where do I start?\", or a progress note exists at .site-apps/onboarding.md."
---

# Getting started with Sundogs

A guided walkthrough, like a short course: one lesson at a time, each one checked before the next. You (the agent) do the work; the owner only does what a person must (sign up, click Allow, change nameservers, approve changes). The owner may not be technical: plain words, one question at a time, and say how long each step takes.

The detailed steps live in the store's playbooks. **Don't copy them here or improvise around them: open the playbook for each lesson and follow it.** Ways to read a playbook, in order:

- the `playbook-<slug>` skill, if it's installed with this one;
- the MCP tool `get_playbook("<slug>")` on the `sundogs` server;
- `https://sundo.gs/playbooks/<slug>.md` (plain Markdown, no sign-in).

## Starting free

Worth mentioning: **everything in this course can be done for free.** A free account (an email link, no card) gets the site's own admin area (one dashboard for every app, settings, an activity log, update notices, and an admin connection so you can manage the site for them in plain words) and the free apps: Forms (forms with an inbox and spam protection), Site Health (self-tests, usage against the Cloudflare free limits, uptime and a status page), Analytics (where visits and leads come from, and what each form converted) and Cookie Consent (a cookie banner every other app obeys). No end date. If they want a paid app too, recommend it with its price and set up the checkout as usual; it works alongside the free ones.

## Rules for every lesson

- **Check, then ask.** Every lesson starts with a check you can run. Ask only for what you can't detect, and say what you checked.
- **One lesson at a time.** Say which lesson you're on and what "done" looks like. Don't start the next until the check passes.
- **Show before you change.** List files and settings you'll change; wait for a yes. Never deploy to production without asking.
- **Never ask for a password, token or key in the chat.** Tokens go in the environment; sign-ins happen in the browser.
- **Never push a move to another host.** Offer it when it's the only way; the owner decides.
- **Don't block on waits.** DNS can take up to 24 hours: carry on with the next lessons on the free `workers.dev` address and come back to it.
- **Fail clearly.** If a check fails, tell the owner what you saw and the exact fix from the playbook's "When it fails" table.

## The progress note

Keep a short note at `.site-apps/onboarding.md` in the site's project folder (create the folder if needed). No project folder yet? Write it in the current folder and move it into the site's folder once lesson 2 creates one. Update it after every lesson. **Never put secrets in it** (no tokens, passwords, claim links or setup links).

At the start of every session, read it first. If it exists, greet the owner with where they are ("Last time we finished the Cloudflare account. Next: your first site.") and continue from the first lesson not marked done. Re-run that lesson's check before trusting the note.

Use this shape:

```markdown
# Site apps setup progress
Updated: 2026-11-02

## Where things are
- Site: none yet | https://example.com | https://my-site.<sub>.workers.dev
- Host: Cloudflare Workers | Cloudflare Pages | Netlify | Webflow | ...
- Domain: example.com, DNS at GoDaddy (moving to Cloudflare, nameservers changed 2026-11-02 14:00)
- Cloudflare account: yes, Wrangler logged in (device login)
- GitHub: yes, repo owner/my-site | no
- Terminal: yes

## Lessons
- [x] 0. Start here: route = no site yet
- [x] 1. Cloudflare account
- [ ] 2. First site
- [ ] 3. Domain and DNS (in parallel, waiting)
- [ ] 4. Free apps installed
- [ ] 5. Admin sign-in and agent connection
- [ ] 6. First win

## Waiting on
- Owner: nameserver change at GoDaddy (sent instructions 2026-11-02)

## Notes
- Owner prefers passkey sign-in (no card for Zero Trust)
```

Offer to commit it with the project (it holds no secrets) so another computer or a cloud session can pick it up.

## Lesson 0: Start here (always first)

Run the **Start here** playbook (`start-here`). It detects or asks: can you run commands, is there a site, where it's hosted, is there a domain and where its DNS is, is there a Cloudflare account, GitHub, and who deploys today. Record the answers and the route in the note.

Then tell the owner the plan in two or three sentences, with times. For example: "You have a domain at GoDaddy but no site yet. Plan: a free Cloudflare account (3 minutes), your site live on a free address (10 minutes), the free apps (10 minutes), and in parallel we point your domain at Cloudflare (10 minutes of clicks, then up to a day of waiting)."

Routes that stop the course early, honestly:

- **You can't run commands** (chat-only): follow `no-github-no-terminal` and stop until the owner has an agent that can. The note lets the new agent resume.
- **Site on WordPress, Webflow, Shopify, Squarespace, Wix, Ghost, Framer** and the owner doesn't want to move: follow `site-apps-on-other-hosts`. Record it, and stop; nothing to install yet.

## Lesson 1: A Cloudflare account Wrangler can use

- **Check:** `npx wrangler whoami` shows the owner's account (or an API token in the environment verifies as active).
- **Playbook:** `create-cloudflare-account-connect-wrangler`. In a cloud session, use the device-code login (`npx wrangler login --device --browser=false`) or a token in the environment.
- **Skip for now** if the owner has no account and you'll use a temporary account deploy in lesson 2. Then this lesson happens at the claim step.
- **Done when:** `whoami` shows the right account; note which.

## Lesson 2: A site on Cloudflare

Pick by route:

- **No site:** `start-a-site-on-cloudflare`. Without an account yet, Route C (`wrangler deploy --temporary`) puts it live first; give the owner the claim link at once (60 minutes), and don't write the link into the note.
- **Static site on Netlify, Vercel or GitHub Pages, and the owner wants to move:** `move-static-site-to-cloudflare`, up to and including a working `workers.dev` deploy. Leave the domain switch for lesson 3.
- **Already on Cloudflare Pages or Workers:** nothing to do; note the project.
- **Site on its own server (a VPS or a cloud server) with DNS on Cloudflare:** nothing to move; the site stays where it is. Lesson 4 installs with INSTALL.md's **Site hosted elsewhere, DNS on Cloudflare** section (beta: tested on a live server, things may still break; tell the owner). DNS elsewhere: lesson 3 first, and wait for it; this setup has no `workers.dev` address.
- **Check:** `curl -sI https://<site address>` returns 200, and a made-up path returns 404 (`curl -s -o /dev/null -w "%{http_code}" https://<site address>/does-not-exist`).
- **Done when:** both checks pass.

## Lesson 3: Domain and DNS (in parallel, optional)

Only if the owner has a domain and its DNS isn't on Cloudflare (`dig +short NS <domain>` doesn't end in `.ns.cloudflare.com`).

- **Playbook:** `move-domain-dns-to-cloudflare`. Save the current records first, check the copy, DNSSEC off, nameservers at the registrar.
- Then go on to lesson 4 on the `workers.dev` address. Check the nameservers at the start of each later session, or poll every 15–30 minutes if you can schedule a check.
- **Done when:** `dig +short NS <domain> @1.1.1.1` shows the Cloudflare nameservers, then the custom domain is added to the site and `curl -sI https://<domain>` serves it. Download the apps again for the real domain (lesson 4's license step) once it's live.

No domain? Mark it "not needed yet" and move on. The site works on `workers.dev`; suggest a domain later for a business site.

## Lesson 4: Install the free apps

- **Check first:** is the store's MCP server `sundogs` connected (`site-apps` on older setups: the same server, keep it)? If its tools are missing, connect it (Claude Code: run `claude mcp add --transport http -s user sundogs https://sundo.gs/mcp` yourself, which adds it for all the owner's projects; Codex, Cursor, Gemini CLI, GitHub Copilot, opencode and other agents: https://sundo.gs/agents). If the browser sign-in fails, or the session has no browser, the owner makes an API key at https://sundo.gs/account/agents and it goes in the MCP settings as an `Authorization: Bearer` header from the `SITE_APPS_KEY` environment variable, never in the chat.
- **Sign-in is the owner's click, said up front:** your first message after adding a connection tells the owner, word for word: "Restart Claude Code in this folder, type /mcp, choose Authenticate on each connection, click Allow in the browser." An agent can't run `claude mcp login` (it needs a real terminal), and new connections load only when Claude Code starts. Keep the progress note (above) so the restarted session picks up where you were.
- **Do:** claim the free apps (`claim_free_app` for Forms, Analytics and Cookie Consent; Site Health comes with every download, or name them all in `get_download`'s `apps`; `search_catalog` shows which apps are free today), `get_download` for the site's address, unzip as `site-apps/`, verify, and follow `site-apps/INSTALL.md` from step 0. INSTALL.md covers this end to end (with the Claude Code plugin, its `sundogs` skill drives it).
- **Done when:** `curl -s https://<site address>/.well-known/site-apps.json` shows `"ok": true`, `"db": "connected"` and `"schema": "ok"`.

## Lesson 5: Admin sign-in, and connect the admin to the agent

- **Sign-in:** for an owner new to Cloudflare, recommend the admin's **passkey sign-in** (`node site-apps/admin-setup.mjs`, INSTALL.md step 7a): no Zero Trust setup, no card. Cloudflare Access (step 7) is the alternative, and you set it up yourself: `node site-apps/admin-setup.mjs access --url https://<domain> --email <owner email>` creates the Access application through the Cloudflare API once the owner approves one short-lived, two-permission token (or the Cloudflare API MCP server's Access scopes). Say plainly that a new account's one-time Zero Trust onboarding (team name, Free plan, payment details even though nothing is charged) is a dashboard step only the owner can do.
- **Connect the agent:** INSTALL.md steps 7b and 8: `node site-apps/connect-agent.mjs --domain <domain> --store https://sundo.gs` writes the site's own admin connection (`site-admin`, `https://<site address><admin path>/mcp`) and the store's into the project's `.mcp.json`; commit it with the site, so every later session in this folder has both. Then the same sign-in line: "Restart Claude Code in this folder, type /mcp, choose Authenticate on each connection, click Allow in the browser."
- **Done when:** the admin address asks for sign-in when signed out, the owner can sign in, and (if connected) an admin tool call such as `site_status` answers. Tell the owner to bookmark the admin address.

## Lesson 6: First win

Pick one with the owner and do it together:

- **A working form:** add a contact form to a page (or connect the site's existing form; the site-forms skill has "If the site already has forms"), deploy, send a test message, and show the owner it arrived in the admin **Inbox**. Offer email notifications (the forms skill's "Email notifications" section).
- **Site Health all green:** open the admin's Site Health page, go through anything not green using each check's fix, and show the owner the all-clear.

**Done when:** the owner has seen it work. Mark the course done in the note, then tell them in a few lines: the site address, the admin address, what's installed, anything still waiting (like DNS), and what they can ask for next ("ask me for a popup, redirects or a waitlist any time").

## After the course

- Copy `site-apps/skills/*` into the agent's skills folder (INSTALL.md step 8) so later sessions know each app.
- More apps: ask the store (`search_catalog` on the `sundogs` server: requirements and price first, then install with INSTALL.md); with the Claude Code plugin, its `sundogs` skill does the same.
- Updates: the `site-apps-update` skill.
