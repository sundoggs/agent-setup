---
name: "playbook-meta-conversions-api-worker"
description: "Relay conversions from your site to Meta server-side with a Worker. Covers the event_id handshake with the browser pixel, SHA-256 hashing rules, the fields Meta wants, test events, and consent. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "meta-conversions-api-worker"
  verified_on: "Cloudflare Workers + Pages + Wrangler 4, Meta Graph API v26.0, October 2026"
---

> From the Sundogs playbook `meta-conversions-api-worker` (verified on Cloudflare Workers + Pages + Wrangler 4, Meta Graph API v26.0, October 2026). Follow it for the user's stack.
> A ready-made app also covers this (app id: `tags`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Send Meta Conversions API events from a Cloudflare Worker

The browser pixel misses conversions (ad blockers, browsers that limit cookies, closed tabs). The Conversions API (CAPI) lets your server send the same events directly to Meta. Run both: Meta matches the two copies and counts each action once, which needs one shared `event_id`.

You build: a Worker route that accepts an event from your page, hashes the personal fields, adds server-side details and posts to Meta.

## 0. Prerequisites

- A Meta pixel ID (Events Manager, Data Sources).
- A Conversions API access token for that pixel, generated in Events Manager (Meta's setup guide shows where). Treat it like a password.
- Marketing consent from the visitor, if your rules require it. Sending from your server is not a way around consent: only call the endpoint for visitors who agreed.

## 1. The rules that matter

From Meta's documentation:

- **Endpoint:** `POST https://graph.facebook.com/{API_VERSION}/{PIXEL_ID}/events` with your access token. The current version in Meta's examples is `v26.0`; each version is supported for at least two years. Keep the version in one constant.
- **Body:** a `data` array of events (up to 1,000 per request). Each has `event_name`, `event_time` (Unix seconds; up to 7 days old, and if any event is older the whole request fails), `event_id`, `event_source_url`, `action_source` (`"website"`), `user_data` and, for purchases, `custom_data` (`value`, `currency`).
- **Deduplication:** Meta matches the browser pixel's `eventID` with the server's `event_id`, and the pixel's event name with `event_name`, within 48 hours. Matching events are counted once and Meta generally keeps the one it received first. Pass the ID as the fourth argument: `fbq('track', 'Lead', {}, {eventID: 'abc'})`.
- **Hashing:** hash personal fields with SHA-256 (the algorithm in Meta's examples; we send lowercase hex) after normalizing: `em` (email): trim, lowercase. `ph` (phone): digits only, no symbols, letters or leading zeros, with the country code. `fn` and `ln`: lowercase, no punctuation. `external_id` hashing is recommended. **Do not hash** `client_ip_address`, `client_user_agent`, `fbc` or `fbp`.
- **`fbp` and `fbc`:** `fbp` is the `_fbp` cookie the pixel sets. `fbc` is the `_fbc` cookie; if it's missing but the landing URL had `?fbclid=...`, build `fb.1.<time in milliseconds>.<fbclid>` and don't change the case of the fbclid.
- **Test events:** add a top-level `test_event_code` next to `data`. Meta processes test-coded events as normal events, so remove the code in production.

## 2. The Worker

Save as `src/meta-capi.ts`.

```ts
export interface MetaEnv {
  META_PIXEL_ID: string;
  META_ACCESS_TOKEN: string; // secret
  META_TEST_EVENT_CODE?: string; // only while testing
  SITE_ORIGIN: string; // e.g. "https://your-site.com"
}

const GRAPH_VERSION = "v26.0";
const ALLOWED_EVENTS = new Set([
  "PageView", "ViewContent", "Lead", "Contact", "CompleteRegistration", "Subscribe",
  "AddToCart", "InitiateCheckout", "Purchase",
]);

interface IncomingEvent {
  event_name?: string;
  event_id?: string;
  event_source_url?: string;
  user?: { email?: string; phone?: string; first_name?: string; last_name?: string; external_id?: string };
  custom?: { value?: number; currency?: string; content_name?: string };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalize first, then hash. Empty after normalizing means "don't send it".
const normEmail = (v: string) => v.trim().toLowerCase();
const normPhone = (v: string) => v.replace(/\D/g, "").replace(/^0+/, ""); // caller supplies the country code
const normName = (v: string) => v.trim().toLowerCase().replace(/[\p{P}\p{S}]/gu, "");
const normId = (v: string) => v.trim();

async function hashed(value: string | undefined, norm: (v: string) => string): Promise<string | undefined> {
  if (!value) return undefined;
  const n = norm(value);
  return n ? sha256Hex(n) : undefined;
}

function cookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleMetaEvent(request: Request, env: MetaEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Not allowed from this origin." }, 403);

  let input: IncomingEvent;
  try {
    input = (await request.json()) as IncomingEvent;
  } catch {
    return json({ error: "Send a JSON body." }, 400);
  }
  if (!input.event_name || !ALLOWED_EVENTS.has(input.event_name)) return json({ error: "Unknown event_name." }, 400);
  if (!input.event_id || !/^[\w.-]{8,100}$/.test(input.event_id)) {
    return json({ error: "event_id must be the same ID you gave the pixel (8 to 100 letters, digits, - _ .)." }, 400);
  }

  const sourceUrl = input.event_source_url ?? request.headers.get("referer") ?? "";
  let pageUrl: URL | null = null;
  try {
    pageUrl = new URL(sourceUrl);
  } catch {
    /* no usable URL */
  }
  if (!pageUrl || pageUrl.origin !== env.SITE_ORIGIN) return json({ error: "event_source_url must be a page on this site." }, 400);

  const cookieHeader = request.headers.get("cookie");
  const fbp = cookie(cookieHeader, "_fbp");
  let fbc = cookie(cookieHeader, "_fbc");
  const fbclid = pageUrl.searchParams.get("fbclid");
  if (!fbc && fbclid && /^[\w-]{1,300}$/.test(fbclid)) fbc = `fb.1.${Date.now()}.${fbclid}`; // case preserved

  const user = input.user ?? {};
  const userData: Record<string, unknown> = {
    client_ip_address: request.headers.get("cf-connecting-ip") ?? undefined, // not hashed
    client_user_agent: request.headers.get("user-agent") ?? undefined, // not hashed
    fbp,
    fbc,
  };
  const em = await hashed(user.email, normEmail);
  const ph = await hashed(user.phone, normPhone);
  const fn = await hashed(user.first_name, normName);
  const ln = await hashed(user.last_name, normName);
  const ext = await hashed(user.external_id, normId);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = fn;
  if (ln) userData.ln = ln;
  if (ext) userData.external_id = [ext];

  const custom: Record<string, unknown> = {};
  const c = input.custom ?? {};
  if (typeof c.value === "number" && Number.isFinite(c.value) && c.value >= 0 && c.value < 1e7) custom.value = c.value;
  if (typeof c.currency === "string" && /^[A-Za-z]{3}$/.test(c.currency)) custom.currency = c.currency.toUpperCase();
  if (typeof c.content_name === "string") custom.content_name = c.content_name.slice(0, 100);

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        event_source_url: pageUrl.toString(),
        action_source: "website",
        user_data: userData,
        custom_data: custom,
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    },
  );
  const result = (await res.json().catch(() => ({}))) as { events_received?: number; fbtrace_id?: string; error?: { message?: string } };
  if (!res.ok) {
    console.error("Meta CAPI error", res.status, result.error?.message, result.fbtrace_id);
    return json({ error: "Meta rejected the event.", detail: result.error?.message }, 502);
  }
  return json({ ok: true, events_received: result.events_received, fbtrace_id: result.fbtrace_id });
}
```

Notes:

- The access token is sent as the `access_token` parameter, as Meta's documentation describes. Outgoing requests from a Worker aren't logged unless you log them; don't log the URL.
- `cf-connecting-ip` is the visitor's address when the request comes straight through Cloudflare. If you proxy through another service first, pass the real IP along yourself.
- The endpoint only accepts your own origin and a fixed list of event names. It cannot stop someone from posting fake events in a script, which would pollute your ad data. For forms, send the event from your form handler after Turnstile has passed (see the `contact-form-turnstile-d1` playbook). For purchases, send from your payment webhook, which is the most trustworthy source.

## 3. Secrets and config

```sh
npx wrangler secret put META_ACCESS_TOKEN         # Workers
npx wrangler pages secret put META_ACCESS_TOKEN   # Pages
```

`wrangler.jsonc` (Workers):

```jsonc
{
  "vars": { "META_PIXEL_ID": "1234567890", "SITE_ORIGIN": "https://your-site.com" },
  "assets": { "directory": "./dist", "binding": "ASSETS", "run_worker_first": ["/api/*"] }
}
```

Route it in your Worker's `fetch`: `if (pathname === "/api/meta-event") return handleMetaEvent(request, env);` and `return env.ASSETS.fetch(request)` for everything else. On Pages, put it in `functions/api/meta-event.ts`:

```ts
import { handleMetaEvent, type MetaEnv } from "../../src/meta-capi";

export const onRequestPost: PagesFunction<MetaEnv> = (context) => handleMetaEvent(context.request, context.env);
```

## 4. The page side: one ID for both copies

```html
<script>
  // Call this when the action happens (after your consent check).
  function trackMeta(name, user, custom) {
    var id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2);
    if (window.fbq) fbq("track", name, custom || {}, { eventID: id }); // browser copy
    fetch("/api/meta-event", {                                        // server copy
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ event_name: name, event_id: id, event_source_url: location.href, user: user || {}, custom: custom || {} }),
    }).catch(function () {});
  }
  // trackMeta("Lead", { email: form.email.value }, { value: 50, currency: "USD" });
</script>
```

Both copies carry the same `event_name` and `event_id`. For `PageView`, send the pixel call yourself with the same ID, since the pixel's automatic one has none. When the server is the only source (for example a purchase confirmed by a webhook), use a stable ID such as the order number and put the same ID in the thank-you page's pixel call.

## 5. Test it

1. In Events Manager, open your pixel, then **Test events**, and copy the test code. Put it in `META_TEST_EVENT_CODE` (`npx wrangler secret put META_TEST_EVENT_CODE`, or a var in dev).
2. Trigger an event on your site. The Test events tab should list the server event; with the pixel firing too you should see the browser and server copies with the same event ID. Meta's "Payload Helper" tool can also build test payloads.
3. Open the event's details and check that the customer information you sent (hashed email or phone, IP address, user agent) is listed.
4. Delete `META_TEST_EVENT_CODE` before going live (`npx wrangler secret delete META_TEST_EVENT_CODE`).
5. Call the endpoint by hand to see errors in plain words: `curl -X POST https://your-site.com/api/meta-event -H "Origin: https://your-site.com" -H "Content-Type: application/json" -d '{"event_name":"Lead","event_id":"test-0001-abcd","event_source_url":"https://your-site.com/"}'`.

Meta says events should appear in Events Manager within about 20 minutes.

## Common mistakes

- Different `event_name` or `event_id` between pixel and server: you get double counting. They must match exactly, and the pair must arrive within 48 hours.
- Hashing before normalizing, or hashing the IP address or user agent (those must stay plain).
- Phone numbers without a country code.
- Sending events for visitors who declined marketing cookies.
- Sending an `event_time` older than 7 days in a replay: the whole batch fails.

## Or let the app do it

**Tag Manager** installs the Meta Pixel on your pages today: the pixel ID in the admin, consent-aware loading, and conversions mapped from your forms, waitlist, popups and affiliate links to Meta events (a form is a `Lead`). Each action gets one stable `eventID` that goes into the pixel call, ready for a server copy to deduplicate against. It **doesn't send server-side events**: this playbook is the way to send the server copy, and the app's pixel events can share its IDs.

## Sources

Checked 2026-10-31.

- [Meta: Conversions API, using the API](https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api) (endpoint, body, `test_event_code`, limits)
- [Meta: customer information parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters) (hashing and normalization)
- [Meta: fbp and fbc parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc)
- [Meta: deduplicate pixel and server events](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Cloudflare: HTTP request headers (CF-Connecting-IP)](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
- [Cloudflare: Workers Static Assets, run_worker_first](https://developers.cloudflare.com/workers/static-assets/binding/)
