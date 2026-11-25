---
name: "playbook-no-github-no-terminal"
description: "If you only use a chat app such as Claude, ChatGPT or Gemini, here's the honest picture. Installing the apps needs an AI agent that can run commands, such as Claude Code. How to get one in a few minutes, the simplest setup with no terminal of your own, and what isn't available. Use when the site owner talks to an AI that cannot run commands (a chat-only app), or has no terminal and no GitHub, and wants the apps installed."
metadata:
  source: "playbook"
  slug: "no-github-no-terminal"
  verified_on: "Claude Code setup, Claude Code desktop and cloud sessions docs, Cloudflare temporary accounts and Drop changelog checked 2026-11-02"
---

> From the Sundogs playbook `no-github-no-terminal` (verified on Claude Code setup, Claude Code desktop and cloud sessions docs, Cloudflare temporary accounts and Drop changelog checked 2026-11-02). Follow it for the user's stack.

# Install the apps without GitHub or a terminal

**The honest answer:** a chat-only AI (one that answers in text but can't run programs) can explain everything here, but **can't install the apps**. Installing means running the Cloudflare tool (Wrangler) and changing files, so you need an AI agent that can run commands, such as **Claude Code**. You don't need to know how to use a terminal yourself: the agent does that part.

**For the agent:** if you're in a chat without a shell, say this plainly, then help the owner get set up with one of the options below. Don't try to have them paste commands one by one into a terminal they don't know.

## Option 1: Claude Code desktop app (no terminal needed)

The Claude desktop app includes Claude Code with a normal window, no terminal. Download it from [claude.com/download](https://claude.com/download) (macOS, Windows; Linux has its own instructions).

- **Plan:** Claude Code needs a paid Claude plan (Pro or higher) or a Console account. The free Claude plan doesn't include it.
- **Setup, about 5–10 minutes:** install, sign in, open a new folder for the site (or the site's folder if it has one), then ask: "Follow https://sundo.gs/playbooks/start-here.md and set up my site." The agent can install Node.js and Wrangler for you, with your OK.
- **What you'll still do yourself:** create a Cloudflare account and click Allow when the agent connects to it (it tells you exactly what to click).

Source: [Claude Code setup](https://code.claude.com/docs/en/setup) (the desktop app tip and the plan requirement).

## Option 2: Claude Code in the browser (cloud sessions)

[claude.ai/code](https://claude.ai/code) runs Claude Code on a cloud computer, from your browser or the Claude mobile app. Nothing to install.

- **Plan:** Pro, Max, Ultra, Team, or Enterprise with the right seat.
- **Needs GitHub:** cloud sessions work on a GitHub repository, so you'd create a free GitHub account ([github.com/signup](https://github.com/signup)) and let the agent create a repository for the site.
- **Connecting Cloudflare from the cloud:** the cloud computer can't open a browser for the usual Cloudflare login. The agent uses Wrangler's device-code login (you open a link on your phone or computer and type a short code), or you add a Cloudflare API token in the environment's settings. Both are in [Create a Cloudflare account and connect Wrangler](/playbooks/create-cloudflare-account-connect-wrangler). *Not verified:* whether the default network settings of a cloud environment let Wrangler reach Cloudflare without changes; if it fails with network errors, allow the Cloudflare domains in the environment's network settings or use Option 1.

Source: [Claude Code cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web).

## Option 3: Claude Code in a terminal

If you're happy to paste one line into a terminal: `curl -fsSL https://claude.ai/install.sh | bash` on macOS or Linux, `irm https://claude.ai/install.ps1 | iex` in Windows PowerShell. Then open a terminal in the site's folder and type `claude`. Same plan requirement as Option 1. Other agents that run commands (Codex, Cursor's agent) also work with the store.

## No GitHub? That's fine

GitHub is optional for Options 1 and 3. The agent can create the site in a folder on your computer and publish it straight to Cloudflare with Wrangler. GitHub only adds automatic deploys and a history online, and you can add it later. See [Start a site on Cloudflare](/playbooks/start-a-site-on-cloudflare) (Route B).

## What happens once you have an agent

1. It runs [Start here](/playbooks/start-here) to see what you have.
2. If there's no Cloudflare account yet, it can even publish the site first with a **temporary account** and give you a link: open it within 60 minutes and sign up (free) to keep the site ([Cloudflare: deploy without an account](https://developers.cloudflare.com/workers/platform/claim-deployments/)).
3. It installs the app you asked for (say, Forms) with Site Health, which comes with every install, and shows you the first form submission arriving in your site's admin. Then it asks once whether you'd like the other free apps too.

## Not available

- **A hosted installer** (you click a button on our store, sign in to Cloudflare, and the apps install without any agent) isn't available: it would need your permission to act in your Cloudflare account for that session, which our current rules don't allow.
- **Cloudflare Drop** (drag a folder into the browser) publishes static files only. The apps need a small Worker, so they don't run on a Drop site ([Cloudflare Drop changelog](https://developers.cloudflare.com/changelog/post/2026-07-08-cloudflare-drag-and-drop/)).
- **Chat apps with connectors:** connecting the store to a chat app lets it browse apps and playbooks, but it still can't run the installer.
