---
name: site-apps-update
description: Update the {{PRODUCT}} apps installed in this repo (the site-apps/ folder) to the newest versions the owner's license covers, check them, and deploy preview then production. Use when the user says "update my site apps", asks whether a newer version exists, or the admin shows an update notice.
---

# Update site apps ({{PRODUCT}})

Updates keep all data (links, redirects, forms, settings). New tables and columns are added automatically on the first request after the deploy. The registry is the MCP server `{{MCP_SERVER}}` ({{MCP_URL}}; `site-apps` on older setups, the same server); if its tools are not available, add it (Claude Code: `claude mcp add --transport http -s user {{MCP_SERVER}} {{MCP_URL}}`, for all the owner's projects; Codex: ask the owner to run `codex mcp login {{MCP_SERVER}}`) and tell the owner: "Restart Claude Code in this folder, type /mcp, choose Authenticate on each connection, click Allow in the browser." Never ask for a key or token in the chat.

## 1. Find out what is installed

Read `site-apps/manifest.json` in the repo: the core version and each app's id and version. The site's domain is in the repo's notes or in `site.domain` of the public status JSON (`/.well-known/site-apps.json`). Note the current `build` code from that ping.

**Check the site's admin connection.** Look for `site-admin` (`https://<domain><admin path>/mcp`) in the project's `.mcp.json` (or `claude mcp list` in this folder). Missing? Add it yourself, for this project only: `node site-apps/connect-agent.mjs --domain <domain> --store {{ORIGIN}}` (merges `site-admin` and `{{MCP_SERVER}}` into `.mcp.json`, keeps the owner's other servers; commit it), or `claude mcp add --transport http -s project site-admin https://<domain><admin path>/mcp` in this folder. Loading it and signing in are the owner's: "Restart Claude Code in this folder, type /mcp, choose Authenticate on each connection, click Allow in the browser." Work only in this site's project; ask before removing any entry.

## 2. Check what is available

Call `check_updates` with `site_domain`, `installed` (an object of app id to version, e.g. `{"links":"0.9.0","forms":"1.0.0"}`) and `core`. Tell the owner, in plain words:
- which apps and the core have a newer version, and the highlights;
- which apps are not covered any more (updates ended for that license) with the fix the tool gives;
- which owned apps are not installed;
- what the owner must do, only from `actionNeeded` (per app and for core). Empty means nothing: don't list requirement texts that merely read differently.

If nothing is newer, say so and stop. If the owner does not want to update, stop.

## 3. Download and check the license first

Call `get_download` for the domain and run the command it returns (fetch, sha256 check, unpack into a scratch folder, not over `site-apps/` yet). **Read the new `license.json` before replacing anything**: it must cover this site's domain and the apps already installed. If it does not, stop and tell the owner plainly; the current install keeps working as it is. Never edit `license.json`.

## 4. Update

Follow "Updating" in the new `INSTALL.md`. In short:
1. Record the status JSON. Optionally note the current settings, so you can tell the owner afterwards what changed: easiest with the signed-in `site-admin` tools (`site_status`, `site_activity`, an app's `<app>_settings`); or, if the owner agrees, `SELECT app, key, value FROM site_settings` on the database. If a permission check blocks the database, skip it: this step is optional.
2. Replace `site-apps/` with the new folder in the same place, and update the copies of the app skills (`site-apps/skills/*` in `.claude/skills/` or `.agents/skills/`).
3. Read the new `manifest.json`. Tell the owner about new requirements or changed defaults only for versions with `action` (there usually are none), and relay the one-line "After an update" note in each updated app's skill (`site-apps/skills/site-<id>/SKILL.md`), if it has one.
4. Do not change the middleware or Worker entry file or the Wrangler config unless the release notes or `INSTALL.md` say so.
5. Deploy a preview and check `/.well-known/site-apps.json`: `"ok": true` and a different `build` code than before. The preview upgrades the shared database; that is safe (changes are additive).
6. Deploy production and check again on the site's own domain.

Finish with a short report: old and new versions, what changed for the owner, the ping result, and anything that went differently from the guide.
