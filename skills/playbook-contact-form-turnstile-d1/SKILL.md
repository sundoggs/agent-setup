---
name: "playbook-contact-form-turnstile-d1"
description: "A working contact form for a static site on Cloudflare Pages: a Pages Function receives the post, Turnstile blocks bots, D1 stores the messages. No third-party form service. Use when the user wants this done by hand on a site hosted on Cloudflare (pages)."
metadata:
  source: "playbook"
  slug: "contact-form-turnstile-d1"
  verified_on: "Cloudflare Pages + Wrangler 4, October 2026"
---

> From the Sundogs playbook `contact-form-turnstile-d1` (verified on Cloudflare Pages + Wrangler 4, October 2026). Follow it for the user's stack.
> A ready-made app also covers this (app id: `forms`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Add a contact form with spam protection to a static site on Cloudflare

A static site can't receive form posts by itself. On Cloudflare Pages, a Pages Function can: it checks the visitor isn't a bot with Turnstile, saves the message to D1, and sends the visitor to a thank-you page.

## 1. Create a Turnstile widget

Cloudflare dashboard → **Turnstile** → **Add widget**: name it, add your domain(s), keep **Managed** mode. Copy the **site key** (public) and **secret key** (private). The free plan allows 20 widgets with up to 10 hostnames each.

For local testing, use the Cloudflare test keys: site key `1x00000000000000000000AA` with secret `1x0000000000000000000000000000000AA` always pass.

Sources: [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/), [testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## 2. The form

```html
<form method="post" action="/api/contact">
  <label>Name <input name="name" required maxlength="200"></label>
  <label>Email <input type="email" name="email" required maxlength="200"></label>
  <label>Message <textarea name="message" required maxlength="5000"></textarea></label>
  <!-- Hidden from people; bots tend to fill it in. -->
  <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
  <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
  <button type="submit">Send</button>
</form>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

The widget adds a `cf-turnstile-response` field to the post.

## 3. Storage and secrets

```sh
npx wrangler d1 create my-site-data
npx wrangler d1 execute my-site-data --remote --command "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, message TEXT, created_at TEXT DEFAULT (datetime('now')))"
```

In the Pages project → Settings: bind the database as `DB`, and add the secret `TURNSTILE_SECRET` (for Production and Preview).

## 4. The Pages Function: `functions/api/contact.js`

```js
export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  if (form.get("website")) return Response.redirect(new URL("/thanks/", request.url), 303); // bot: pretend it worked

  // Turnstile tokens must be checked server-side; each is valid for 5 minutes and only once.
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: String(form.get("cf-turnstile-response") ?? ""),
      remoteip: request.headers.get("CF-Connecting-IP") ?? "",
    }),
  }).then((r) => r.json());
  if (!verify.success) return new Response("Please go back and complete the check.", { status: 400 });

  const field = (k, max) => String(form.get(k) ?? "").trim().slice(0, max);
  const email = field("email", 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response("Please go back and enter a valid email.", { status: 400 });

  await env.DB.prepare("INSERT INTO messages (name, email, message) VALUES (?1, ?2, ?3)")
    .bind(field("name", 200), email, field("message", 5000))
    .run();
  return Response.redirect(new URL("/thanks/", request.url), 303);
}
```

Add a `/thanks/` page, deploy, and send yourself a test message. Read messages with:

```sh
npx wrangler d1 execute my-site-data --remote --command "SELECT created_at, name, email, message FROM messages ORDER BY id DESC LIMIT 20"
```

Source: [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Or install it

The free **Forms** app gives you this without writing the function: build forms in a site admin (or keep your own HTML), an inbox with a spam folder and CSV export, email notifications to you through Cloudflare, spam protection that needs no Turnstile setup, and forms that pick up your site's own look. It's free, and runs in your own Cloudflare account on the Cloudflare free plan.
