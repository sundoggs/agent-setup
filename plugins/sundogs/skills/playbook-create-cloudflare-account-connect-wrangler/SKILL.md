---
name: "playbook-create-cloudflare-account-connect-wrangler"
description: "Sign up for a free Cloudflare account, verify the email, and let your AI coding agent deploy for you with wrangler login, including the device-code login for agents with no browser and the API-token fallback. With the exact clicks, how to check each step worked, and what to do when it doesn't. Use when the site owner has no Cloudflare account yet, or when Wrangler says it isn't logged in, including in cloud agents that can't open a browser."
metadata:
  source: "playbook"
  slug: "create-cloudflare-account-connect-wrangler"
  verified_on: "Cloudflare account, email verification, Wrangler login and API token docs checked 2026-11-02"
---

> From the Sundogs playbook `create-cloudflare-account-connect-wrangler` (verified on Cloudflare account, email verification, Wrangler login and API token docs checked 2026-11-02). Follow it for the user's stack.
> A ready-made app also covers this (app id: `health`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Create a Cloudflare account and connect Wrangler

The apps run in **your** Cloudflare account. The Cloudflare free plan is enough for the free apps, and it asks for no card. This takes about **3–5 minutes** of your time (our estimate). The agent does everything else.

**For the agent:** a person must create the account; you can't. Check first, then give the owner the exact steps below, one at a time, and confirm each step before the next.

## 0. Check first (agent)

```sh
npx wrangler whoami
```

- `You are logged in with an OAuth Token, associated with the email …` (or an API token): skip to step 4.
- `You are not authenticated`: ask the owner "Do you already have a Cloudflare account?" If yes, go to step 3. If no, step 1.
- `npx: command not found`: Node.js isn't installed. On the owner's own computer, ask them to install the LTS version from [nodejs.org](https://nodejs.org/), then retry. In a cloud agent, Node is usually there already.

## 1. Sign up (the owner, about 2 minutes)

Tell the owner:

1. Open **https://dash.cloudflare.com/sign-up**.
2. Type your email address and a password, then select **Create Account**. Signing in with Google, Apple or GitHub also works if the page offers it ([login options](https://developers.cloudflare.com/fundamentals/user-profiles/login/)).
3. If Cloudflare asks what you want to do first or suggests a plan, you can skip it or pick the **Free** plan. You don't need to add a domain now.

The free plan has no card step ([Cloudflare Free plan](https://www.cloudflare.com/plans/free/)).

Source: [Create a Cloudflare account](https://developers.cloudflare.com/fundamentals/account/create-account/).

## 2. Verify the email (the owner, about 1 minute)

1. Cloudflare sends a verification email straight away. Open it and select the link. **Check the spam folder** if it isn't there after a minute or two.
2. Lost or expired? In the dashboard: **My Profile** → **Email Address** → **Send verification email**. If that button isn't there, the email is already verified, and My Profile shows "(verified)" next to the address.
3. If the link doesn't work, open it in a private window or another browser, or send a new one.

Some account tasks are blocked until the email is verified (adding members, changing the email address). Deploying a site isn't on that list, but verify now anyway so nothing stops later.

Source: [Verify your email address](https://developers.cloudflare.com/fundamentals/user-profiles/verify-email-address/).

## 3. Connect Wrangler (agent runs it, the owner clicks Allow)

Wrangler is the Cloudflare command-line tool. Logging it in lets the agent deploy to the owner's account. Pick the method that fits where you are running:

### On the owner's own computer (browser available)

```sh
npx wrangler login
```

A browser tab opens on Cloudflare. Tell the owner: "Sign in if asked, check it says Wrangler, then select **Allow**." The terminal then says it's logged in.

### In a cloud agent, over SSH or in a container (no browser here)

Use the device-code login. It needs no callback to this machine:

```sh
npx wrangler login --device --browser=false
```

Wrangler prints a web address and a short code. Give both to the owner: "Open this link on your phone or computer, sign in to Cloudflare, enter this code, and select Allow." The code expires after about 5 minutes; run the command again if it does. Keep the command running until it reports success.

If `--device` is an unknown option, Wrangler is too old: run `npx wrangler@latest login --device --browser=false`. If the cloud agent can't reach Cloudflare at all (network errors), use the API token below.

Other options from the Cloudflare docs: on SSH, keep `wrangler login` running and `curl` the `localhost:8976` callback address from a second terminal on the same machine; in Docker, map port 8976 and use `--callback-host=0.0.0.0`.

Source: [Wrangler `login`, remote and headless machines](https://developers.cloudflare.com/workers/wrangler/commands/general/).

### Fallback: an API token in the environment

Use this when login can't work (some CI and cloud setups). The owner creates the token; it never goes into the chat.

1. Owner: Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token**.
2. Use the **Edit Cloudflare Workers** template, then **add** the permission **Account → D1 → Edit** (the template doesn't include D1, and the apps' database needs it). Site on Pages? Also add **Account → Cloudflare Pages → Edit**. Or use the pre-filled token link in the install guide's step 1.
3. Pick the account under **Account Resources**, set an expiry date under **TTL** if offered, then **Continue to summary** → **Create Token**. Copy it once; it isn't shown again.
4. Put it in the agent's environment settings as `CLOUDFLARE_API_TOKEN`, plus `CLOUDFLARE_ACCOUNT_ID` (shown on the account's home page and on each Worker's page). In cloud agents this is the environment's variables or secrets screen; some only see new variables in a new session.

If the owner pastes a token into the chat anyway, don't use it from there: ask them to put it in the environment and roll (replace) that token, because chat logs keep it.

Sources: [Create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/), [token templates](https://developers.cloudflare.com/fundamentals/api/reference/template/).

## 4. Check it worked (agent)

```sh
npx wrangler whoami
```

You should see the owner's email and their account. If there are several accounts, note the right account ID and put it in the Wrangler config as `account_id` (or `CLOUDFLARE_ACCOUNT_ID`) so deploys go to the right place. `npx wrangler whoami --json` exits with an error if you're not authenticated, which makes a clean script check.

With a token: `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify` should say `"status": "active"`.

## A note on the admin sign-in: no card needed

After install, the site's admin needs a sign-in. There are two ways:

- **Cloudflare Access** (recommended for people comfortable with Cloudflare). Setting up Zero Trust the first time asks you to pick a plan **and enter payment details, even for the free plan**: Cloudflare says "this step is still needed but you will not be charged" ([Create a Zero Trust organization](https://developers.cloudflare.com/learning-paths/zero-trust-web-access/initial-setup/create-zero-trust-org/)).
- **The admin's own passkey sign-in** (Face ID, Touch ID, Windows Hello or a security key). No Zero Trust setup and no card. The agent runs `node site-apps/admin-setup.mjs` and gives you a one-time setup link (install guide, step 7a).

If you'd rather not enter card details, tell your agent to use the passkey sign-in.

## When it fails

| What you see | What it means | Fix |
|---|---|---|
| No verification email | Spam filter or typo | Check spam; resend from My Profile; check the address is right |
| `wrangler login` opens a page that never finishes | The callback can't reach this machine (remote or cloud) | Use `--device`, or the SSH / Docker options above |
| `Failed to automatically retrieve account IDs` | The token can only see a zone, not the account | Create a token with account permissions (step 3), set `CLOUDFLARE_ACCOUNT_ID` |
| `--temporary` deploy errors with "credentials present" | Temporary accounts only work when logged out | Not needed now you're logged in: deploy normally |
| Wrong account | Several accounts on one login | Set `account_id` in the Wrangler config |

## Next

Back to [Start here](/playbooks/start-here) to pick the next step: [start a site](/playbooks/start-a-site-on-cloudflare), [move a site](/playbooks/move-static-site-to-cloudflare), or straight to the install guide if the site is already on Cloudflare.
