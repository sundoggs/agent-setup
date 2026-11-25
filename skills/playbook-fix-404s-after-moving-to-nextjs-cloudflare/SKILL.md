---
name: "playbook-fix-404s-after-moving-to-nextjs-cloudflare"
description: "Rebuilt or moved a site to Next.js on Cloudflare Workers with OpenNext and old URLs now 404? Where redirects belong in Next.js (next.config redirects, proxy, or a Worker wrapper), how status codes and patterns behave, the soft-404 trap with notFound(), and a small wrapper that shows you which missing URLs people hit, using Workers Logs. Use when the user wants this done by hand on a site hosted on Cloudflare (workers)."
metadata:
  source: "playbook"
  slug: "fix-404s-after-moving-to-nextjs-cloudflare"
  verified_on: "Next.js 16 redirects, proxy and not-found docs, OpenNext Cloudflare custom worker docs, Cloudflare Next.js guide and Workers Logs docs checked 2026-11-03"
---

> From the Sundogs playbook `fix-404s-after-moving-to-nextjs-cloudflare` (verified on Next.js 16 redirects, proxy and not-found docs, OpenNext Cloudflare custom worker docs, Cloudflare Next.js guide and Workers Logs docs checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `links`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Fix 404s after moving a site to Next.js on Cloudflare (OpenNext)

You moved to Next.js (from WordPress, Gatsby, another host, or an older Next.js layout) and deployed to Cloudflare Workers with the `@opennextjs/cloudflare` adapter. Some old URLs now 404. This playbook covers where redirects belong in a Next.js app on Workers, the traps specific to Next.js, and how to see the misses you didn't plan for.

Exporting Next.js as a static site (`output: "export"`)? `redirects()` doesn't work in a static export; use the `fix-404s-after-migrating-static-site` playbook instead. Starting a brand-new Next.js app on Cloudflare? The Cloudflare guide now scaffolds new apps with **vinext** (beta) and keeps OpenNext for existing OpenNext apps. The wrapper below is an OpenNext feature.

> **Short version:** put permanent, known moves in `redirects()` in `next.config`; make sure missing pages really return 404; don't query anything per request in `proxy.ts`; and watch which missing URLs real visitors hit for a few months after the move.

## 1. Collect the old URLs and map them

The same groundwork as any migration: the old sitemap, Search Console's Pages and Performance reports, top landing pages from analytics, and pages other sites link to. Map each one to its closest new page, not the home page; let it 404 if nothing fits. The static-site playbook has the full checklist and a curl loop to test the list.

## 2. Known, permanent moves: `redirects()` in `next.config`

```ts
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/:year(\\d{4})/:month(\\d{2})/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/category/:path*", destination: "/blog", permanent: true },
    ];
  },
};

export default config;
```

How Next.js treats them (Next.js docs): `permanent: true` answers **308** and `false` answers **307**; both keep the request method, which is fine for page URLs. Redirects are checked before the filesystem, so a redirect wins over a page with the same path. Query strings pass through. Patterns are anchored to the start of the path, `:path*` matches nested paths, and regex groups go in parentheses. OpenNext's routing layer applies `redirects`, `headers` and `rewrites` from `next.config`.

The catch: every change is a rebuild and a deploy. Fine for the launch list; tedious for the misses that trickle in afterwards.

## 3. Make sure missing pages really 404

A Next.js app can easily answer **200** for a page that doesn't exist: a catch-all route (`app/[...slug]/page.tsx`) that renders "Not found" text, or a dynamic route that renders an empty template when the record is missing. Search engines call that a soft 404, and it hides the problem from you.

In dynamic routes, call `notFound()` when there's nothing to show:

```tsx
import { notFound } from "next/navigation";

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound(); // renders not-found.tsx with a 404 status
  return <article>{/* … */}</article>;
}
```

Then check:

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://your-site.com/blog/this-does-not-exist
# 404
```

## 4. `proxy.ts` (formerly middleware) is the wrong place for a redirect lookup

Next.js 16 renamed `middleware` to `proxy` (file `proxy.ts`). On OpenNext for Cloudflare, Node.js-runtime proxy support arrived in `@opennextjs/cloudflare` 1.20.3 and is marked **experimental**; the edge runtime isn't supported by the adapter. More importantly, a proxy runs on every matching request, so a redirect lookup there costs something on every page view. Keep fixed redirects in `next.config`, and handle "is this a missing page?" only when Next.js has already said 404.

| Need | Use |
| --- | --- |
| Fixed, permanent moves known at build time | `redirects()` in `next.config` |
| Logic on cookies or headers before routing | `proxy.ts` (experimental on OpenNext) |
| Seeing and fixing misses after launch | A Worker wrapper that acts only on 404s (below), or an app |

## 5. See which missing URLs people hit (a small wrapper)

OpenNext documents wrapping its generated Worker in your own file. This wrapper does one thing: when Next.js answers 404, it logs the path and referrer. With Workers Logs turned on, you can read them in the Cloudflare dashboard. No database, nothing on normal pages.

`custom-worker.ts` in the project root:

```ts
// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    const res: Response = await handler.fetch(request, env, ctx);
    if (res.status === 404 && request.method === "GET") {
      console.log(JSON.stringify({ notFound: new URL(request.url).pathname, referrer: request.headers.get("referer") }));
    }
    return res;
  },
} satisfies ExportedHandler<CloudflareEnv>;
```

In `wrangler.jsonc`, point `main` at it and turn on logs:

```jsonc
{
  "main": "custom-worker.ts",
  "observability": { "enabled": true }
}
```

Deploy as usual (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`), then open the Worker's **Logs** in the dashboard and filter on `notFound`. On the free plan, Workers Logs keeps 3 days and up to 200,000 log events a day.

## 6. Where this stops

The wrapper tells you misses exist. Turning that into fixed links is the tedious part:

- **Bots swamp the log:** scanners probing `/wp-admin/`, `/.env` and `/xmlrpc.php` outnumber real visitors on most sites. You need to filter them to see what matters.
- **Three days of logs** means checking often, or exporting somewhere.
- **No counts or trends:** which miss is hit 200 times a week and which once?
- **Every fix is a deploy,** because the redirect still goes into `next.config`.
- **No record of which redirects are still used,** so the list only grows.

## 7. Or let an app do it

**Links & Redirects** handles the after-launch part on your Next.js site, in your own Cloudflare account on the free plan. It wraps the Worker OpenNext builds (tested with Next.js on OpenNext):

- A 404 list that separates people from bots, with hit counts, referrers and last-seen dates, kept as long as you want.
- One-click "redirect this" on a missing URL, live on the next request with no rebuild. Like the wrapper, these apply once the old path no longer exists as a page.
- Hit counts per redirect, so you can see which are still used.
- Your `next.config` redirects keep working for patterns and permanent moves.
- Tools your AI agent can use to read the 404 list and propose redirects for you to approve.

Your agent can install it into the site you already have.

## Sources

Checked 2026-11-03.

- [Next.js: redirects](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) (307/308, order, patterns)
- [Next.js: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) and [notFound](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Next.js: static exports](https://nextjs.org/docs/app/guides/static-exports) (redirects unsupported with `output: "export"`)
- [OpenNext Cloudflare: custom worker](https://opennext.js.org/cloudflare/howtos/custom-worker) and [get started](https://opennext.js.org/cloudflare/get-started)
- [OpenNext Cloudflare 1.20.3 release notes](https://github.com/opennextjs/opennextjs-cloudflare/releases/tag/@opennextjs%2Fcloudflare@1.20.3) (experimental Node.js proxy)
- [Cloudflare: Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) (vinext for new apps, OpenNext for existing ones)
- [Cloudflare: Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) (enabling, free plan limits)
