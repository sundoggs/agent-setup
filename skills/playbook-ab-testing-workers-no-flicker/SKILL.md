---
name: "playbook-ab-testing-workers-no-flicker"
description: "Split visitors between two versions of a page at the edge, with a sticky assignment, no flash of the original, a consent switch, and conversions counted in D1. Works on Workers with static assets and on Pages Functions. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "ab-testing-workers-no-flicker"
  verified_on: "Cloudflare Workers + Pages + Wrangler 4, October 2026"
---

> From the Sundogs playbook `ab-testing-workers-no-flicker` (verified on Cloudflare Workers + Pages + Wrangler 4, October 2026). Follow it for the user's stack.
> A ready-made app also covers this (app id: `popups`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# A/B test a page on Cloudflare Workers with no flicker

Client-side A/B tools load a script, then change the page, so visitors briefly see the original ("flicker"). On Cloudflare you can make the change before the HTML leaves the edge: a Worker picks the version, rewrites the HTML with `HTMLRewriter`, and the browser only ever receives the chosen version.

You build: a stable visitor ID, a deterministic split, the rewrite, an exposure log, a conversion beacon and a results query.

## How it works

1. A first-party cookie `ab_vid` holds a random visitor ID.
2. The version is computed from `hash(experiment id + visitor ID)`, so the same visitor always gets the same version, with no per-experiment cookie and no database lookup.
3. `HTMLRewriter` applies the version's changes (text, HTML, attributes) while the page streams through.
4. The `<html>` element gets `data-ab-<experiment>="b"`, so you can also write version-specific CSS.
5. The first view and each conversion are recorded in D1, once per visitor.

## 1. The table

```sql
CREATE TABLE IF NOT EXISTS ab_events (
  exp     TEXT NOT NULL,
  vid     TEXT NOT NULL,
  variant TEXT NOT NULL,
  kind    TEXT NOT NULL,                      -- 'view' or a goal name such as 'signup'
  ts      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (exp, vid, kind)
);
```

```sh
npx wrangler d1 execute my-site-data --remote --file schema.sql
```

## 2. The code

Save as `src/ab.ts`.

```ts
export interface AbEnv {
  DB: D1Database;
  /** Set to "1" to run tests only for visitors whose consent cookie allows it. */
  AB_REQUIRE_CONSENT?: string;
}

/** One edit to the page. `selector` is a CSS selector. Use `html` only with markup you wrote yourself. */
export interface Change {
  selector: string;
  text?: string;
  html?: string;
  attr?: Record<string, string>;
}

export interface Experiment {
  id: string; // letters, digits and dashes
  paths: string[]; // exact paths the test runs on, e.g. ["/", "/pricing/"]
  variants: Record<string, Change[]>; // the first entry is the control; it should make no changes
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: "hero",
    paths: ["/"],
    variants: {
      a: [],
      b: [
        { selector: "h1", text: "Ship your site in an afternoon" },
        { selector: "a.cta", text: "Start free", attr: { href: "/signup/?v=b" } },
      ],
    },
  },
];

const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|headless/i;
const COOKIE = "ab_vid";

/** Edit this to match your consent tool. Return true when the visitor allowed analytics/testing. */
function mayTest(cookies: Record<string, string>, env: AbEnv): boolean {
  if (env.AB_REQUIRE_CONSENT !== "1") return true;
  return /(^|[^a-z])analytics([^a-z]|$)/.test(cookies["cookie_consent"] ?? "");
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Same visitor + same experiment always gives the same index. */
async function bucket(expId: string, vid: string, count: number): Promise<number> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${expId}:${vid}`));
  return new DataView(digest).getUint32(0) % count;
}

class Apply implements HTMLRewriterElementContentHandlers {
  constructor(private readonly change: Change) {}
  element(el: Element): void {
    const c = this.change;
    if (c.html !== undefined) el.setInnerContent(c.html, { html: true });
    else if (c.text !== undefined) el.setInnerContent(c.text);
    for (const [name, value] of Object.entries(c.attr ?? {})) el.setAttribute(name, value);
  }
}

interface Waiter {
  waitUntil(promise: Promise<unknown>): void;
}

function record(env: AbEnv, ctx: Waiter, exp: string, vid: string, variant: string, kind: string): void {
  ctx.waitUntil(
    env.DB.prepare("INSERT INTO ab_events (exp, vid, variant, kind) VALUES (?1, ?2, ?3, ?4) ON CONFLICT DO NOTHING")
      .bind(exp, vid, variant, kind)
      .run(),
  );
}

/** Wrap the response of a page. Returns it untouched when no test applies. */
export async function applyExperiments(request: Request, response: Response, env: AbEnv, ctx: Waiter): Promise<Response> {
  const url = new URL(request.url);
  const exp = EXPERIMENTS.find((e) => e.paths.includes(url.pathname));
  if (!exp || request.method !== "GET" || response.status !== 200) return response;
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

  const ua = request.headers.get("user-agent") ?? "";
  if (ua === "" || BOT.test(ua)) return response; // crawlers always see the original page

  const names = Object.keys(exp.variants);
  const cookies = parseCookies(request.headers.get("cookie"));

  // QA: /?ab_force=hero:b shows version b without a cookie or a log entry.
  const forced = url.searchParams.get("ab_force")?.split(":");
  const forcedName = forced && forced[0] === exp.id && forced[1] && names.includes(forced[1]) ? forced[1] : null;

  if (!forcedName && !mayTest(cookies, env)) return response; // no consent: original page, no cookie, no log

  let vid = cookies[COOKIE];
  const isNew = !vid || !/^[0-9a-f]{32}$/.test(vid);
  if (isNew) vid = randomHex(16);
  const variant = forcedName ?? names[await bucket(exp.id, vid!, names.length)]!;

  const rewriter = new HTMLRewriter().on("html", {
    element(el) {
      el.setAttribute(`data-ab-${exp.id}`, variant);
    },
  });
  for (const change of exp.variants[variant] ?? []) rewriter.on(change.selector, new Apply(change));

  const out = new Response(rewriter.transform(response).body, response);
  // Different visitors get different HTML for one URL: keep shared caches out of it.
  out.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  out.headers.append("Vary", "Cookie");
  if (!forcedName) {
    if (isNew) {
      out.headers.append("Set-Cookie", `${COOKIE}=${vid}; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`);
    }
    record(env, ctx, exp.id, vid!, variant, "view");
  }
  return out;
}

/** POST /ab/convert?exp=hero&goal=signup  (call it with navigator.sendBeacon). */
export async function handleConvert(request: Request, env: AbEnv, ctx: Waiter): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return new Response("Forbidden", { status: 403 });

  const exp = EXPERIMENTS.find((e) => e.id === url.searchParams.get("exp"));
  const goal = url.searchParams.get("goal") ?? "";
  const vid = parseCookies(request.headers.get("cookie"))[COOKIE];
  if (!exp || !/^[a-z0-9_-]{1,40}$/.test(goal) || goal === "view" || !vid || !/^[0-9a-f]{32}$/.test(vid)) {
    return new Response(null, { status: 204 });
  }
  const names = Object.keys(exp.variants);
  record(env, ctx, exp.id, vid, names[await bucket(exp.id, vid, names.length)]!, goal);
  return new Response(null, { status: 204 });
}
```

Things worth knowing:

- Crawlers and empty user agents get the original page. Google says not to show different URLs to Googlebot than to people; here the URL is the same and the original page is simply what a crawler (which sends no cookie) sees. Keep your versions close in meaning, and run tests for a limited time.
- `Vary: Cookie` and a private `Cache-Control` stop shared caches from serving one visitor's version to another. Do not put a "cache everything" rule on tested paths.
- Selectors that match nothing do nothing, silently. Check each one with `?ab_force=hero:b`.

## 3. Wire it up

### Workers with static assets

```jsonc
{
  "name": "my-site",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-30",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    // Only these paths go through the Worker; everything else stays a plain static file.
    "run_worker_first": ["/", "/ab/*"]
  },
  "d1_databases": [{ "binding": "DB", "database_name": "my-site-data", "database_id": "<id>" }],
  "vars": { "AB_REQUIRE_CONSENT": "0" }
}
```

```ts
import { applyExperiments, handleConvert, type AbEnv } from "./ab";

interface Env extends AbEnv {
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/ab/convert") return handleConvert(request, env, ctx);
    return applyExperiments(request, await env.ASSETS.fetch(request), env, ctx);
  },
} satisfies ExportedHandler<Env>;
```

List every tested path in `run_worker_first`, with and without a trailing slash if your host redirects between them.

### Cloudflare Pages

Bind the D1 database as `DB`. Create `functions/_middleware.ts`:

```ts
import { applyExperiments, type AbEnv } from "../src/ab";

export const onRequestGet: PagesFunction<AbEnv> = async (context) =>
  applyExperiments(context.request, await context.next(), context.env, context);
```

and `functions/ab/convert.ts`:

```ts
import { handleConvert, type AbEnv } from "../../src/ab";

export const onRequestPost: PagesFunction<AbEnv> = (context) => handleConvert(context.request, context.env, context);
```

Add `_routes.json` to the build output folder, so only tested pages invoke Functions (each invocation is billed like a Worker request):

```json
{ "version": 1, "include": ["/", "/ab/*"], "exclude": [] }
```

### Next.js or Astro SSR

Call `applyExperiments` on the page response in your Worker wrapper (the `fix-404s-after-moving-to-nextjs-cloudflare` playbook shows the wrapper). Streamed responses work, because `HTMLRewriter` streams too.

## 4. Count conversions

On the page where the goal happens (a thank-you page, or after a successful form post):

```html
<script>
  navigator.sendBeacon("/ab/convert?exp=hero&goal=signup");
</script>
```

The Worker reads the visitor's cookie, works out their version again, and stores one `signup` row per visitor.

## 5. Read the results

```sql
SELECT v.variant,
       COUNT(DISTINCT v.vid) AS visitors,
       COUNT(DISTINCT c.vid) AS conversions,
       ROUND(100.0 * COUNT(DISTINCT c.vid) / COUNT(DISTINCT v.vid), 2) AS rate_pct
FROM ab_events v
LEFT JOIN ab_events c ON c.exp = v.exp AND c.vid = v.vid AND c.kind = 'signup'
WHERE v.exp = 'hero' AND v.kind = 'view'
GROUP BY v.variant;
```

A rough check that a difference isn't noise (two-proportion z-test; above about 1.96 or below -1.96 is roughly 95% confidence under the usual assumptions):

```ts
export function zScore(visitorsA: number, conversionsA: number, visitorsB: number, conversionsB: number): number {
  const pA = conversionsA / visitorsA;
  const pB = conversionsB / visitorsB;
  const pooled = (conversionsA + conversionsB) / (visitorsA + visitorsB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / visitorsA + 1 / visitorsB));
  return (pB - pA) / se;
}
```

Decide how many visitors you need before you start, and don't stop the moment one side looks ahead; early peeks mislead. Small sites often can't reach a clear answer on small changes. Test big differences (the offer, the headline), not button colors.

## 6. Privacy and consent

- The visitor cookie is a first-party cookie used to measure a test. Many regions treat that as needing consent. With `AB_REQUIRE_CONSENT` set to `"1"`, visitors without consent get the original page, no cookie and no logging. Edit `mayTest` to read your consent tool's cookie. This is not legal advice.
- Nothing leaves your Cloudflare account. No IP address is stored.

## 7. Limits

- Free plan: Workers requests are capped at 100,000 per day for the whole account, and tested pages now go through the Worker on every view. D1 allows 100,000 rows written per day; each visitor writes one row per experiment plus one per goal. Repeat views hit the primary key and insert nothing, but confirm your D1 write numbers after a day.
- Per request the Worker makes one D1 write, well under the 50 queries per invocation on the free plan.
- Keep each test short. Google warns that running an experiment for an unnecessarily long time may be treated as deception, and to remove test code promptly afterwards. If you use separate test URLs, use `rel="canonical"` to the original and 302 (not 301) redirects.

## Or let the app do it

There is no general page A/B tool. **Popups** has built-in A/B testing for popups: give a popup a second version (`variantB` with its own headline, text and button) and half of visitors see each, always the same one, with conversions per version in its analytics. For page tests, the code above is the whole solution.

## Sources

Checked 2026-10-31.

- [Workers HTMLRewriter API](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
- [Workers Static Assets: binding, run_worker_first](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Pages Functions routing and _routes.json](https://developers.cloudflare.com/pages/functions/routing/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Google Search Central: website testing and Google Search](https://developers.google.com/search/docs/crawling-indexing/website-testing)
