---
name: "playbook-broken-link-uptime-check-cron"
description: "A small separate Worker that pings your pages every 5 minutes, crawls your sitemap hourly in small batches, records broken links in D1 and sends an alert to a webhook. Fits the free plan limits, and works for Pages sites because it checks over HTTP. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "broken-link-uptime-check-cron"
  verified_on: "Cloudflare Workers + Wrangler 4, October 2026"
---

> From the Sundogs playbook `broken-link-uptime-check-cron` (verified on Cloudflare Workers + Wrangler 4, October 2026). Follow it for the user's stack.
> A ready-made app also covers this (app id: `health`, `seo`, `links`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Check your site for downtime and broken links on a schedule

Two jobs: know within minutes when the site is down, and find links (yours and outbound) that have died. Both are a scheduled Worker that makes HTTP requests and writes what it finds to D1.

> Only need downtime alerts? The free Site Health app sets up uptime checks, alerts and a status page for you (see the end). This playbook is for building your own, including a broken-link crawler.

## Why a separate Worker

Cron Triggers belong to Workers. In the Cloudflare Pages-to-Workers comparison, Cron Triggers are supported on Workers and not on Pages. So a Pages site gets its monitor as a small standalone Worker, and that Worker checks your site over HTTP. The same Worker works for any host, Pages, Workers, or neither. Don't deploy it inside your site's project.

## What fits the free plan

Verified limits (Workers Free): 5 Cron Triggers per account (this uses 2), 10 ms of CPU time per cron run (time waiting on the network doesn't count), 50 subrequests per run, 50 D1 queries per run, 6 simultaneous outgoing connections; D1 allows 100,000 rows written and 5 million rows read per day. On Workers Paid a cron run gets 30 seconds of CPU when the interval is under an hour and 15 minutes at an hour or more.

So the design is deliberately small: each run touches a handful of pages and links and picks up where the last stopped.

- **Every 5 minutes:** request up to 10 URLs you list, with a timeout. Alert only after two failures in a row, and again when it recovers. State is written only when it changes.
- **Every hour:** read the sitemap once a day, crawl 4 pages from it (the least recently crawled), collect their links, then check 15 links (new ones first, then the oldest checked). Each link costs one or two requests (HEAD, then GET if the server dislikes HEAD), so a run makes about 40 requests at most. A site with 400 pages and 3,000 links is fully covered in a few days. Failing links are rechecked daily and alerted once after a second failure.

If you hit "exceeded CPU time limit" (a very large sitemap is the usual cause), lower the numbers at the top of the file or move the Worker to Workers Paid.

## 1. Database

```sql
CREATE TABLE IF NOT EXISTS monitor_state (
  url TEXT PRIMARY KEY, ok INTEGER NOT NULL DEFAULT 1, fail_streak INTEGER NOT NULL DEFAULT 0,
  last_status INTEGER, last_error TEXT, changed_at TEXT, checked_at TEXT
);
CREATE TABLE IF NOT EXISTS monitor_meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS pages (url TEXT PRIMARY KEY, crawled_at TEXT);
CREATE TABLE IF NOT EXISTS link_targets (
  url TEXT PRIMARY KEY, found_on TEXT NOT NULL, internal INTEGER NOT NULL DEFAULT 0,
  status INTEGER, verdict TEXT, error TEXT, checked_at TEXT,
  fail_streak INTEGER NOT NULL DEFAULT 0, alerted INTEGER NOT NULL DEFAULT 0
);
```

```sh
npx wrangler d1 create site-monitor-data
npx wrangler d1 execute site-monitor-data --remote --file schema.sql
```

## 2. Config

`wrangler.jsonc`:

```jsonc
{
  "name": "site-monitor",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-30",
  "workers_dev": false,
  "triggers": { "crons": ["*/5 * * * *", "0 * * * *"] },
  "vars": {
    "SITE_URL": "https://your-site.com",
    "UPTIME_URLS": "https://your-site.com/,https://your-site.com/pricing/"
  },
  "d1_databases": [{ "binding": "DB", "database_name": "site-monitor-data", "database_id": "<id>" }],
  "observability": { "enabled": true }
}
```

Cron Triggers run on UTC time. Changes to them can take up to 15 minutes to take effect. Wrangler replaces the deployed schedule with whatever `crons` lists. Set an alert webhook (Slack, Discord or anything that accepts a JSON post):

```sh
npx wrangler secret put ALERT_WEBHOOK_URL
```

## 3. The Worker

Save as `src/index.ts`.

```ts
export interface Env {
  DB: D1Database;
  SITE_URL: string;
  UPTIME_URLS: string;
  ALERT_WEBHOOK_URL?: string;
}

// Must match "triggers.crons" in wrangler.jsonc, character for character.
const CRON_UPTIME = "*/5 * * * *";
const CRON_LINKS = "0 * * * *";

// Sized for the free plan (50 subrequests, 10 ms CPU per run). Raise them on Workers Paid.
const PAGES_PER_RUN = 4;
const LINKS_PER_RUN = 15;
const MAX_LINKS_PER_PAGE = 150;
const MAX_SITEMAP_URLS = 2000;

const UA = "SiteMonitor/1.0 (link and uptime checker)";

function get(url: string, method: "GET" | "HEAD", redirect: "follow" | "manual"): Promise<Response> {
  return fetch(url, {
    method,
    redirect,
    headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
    signal: AbortSignal.timeout(10_000),
  });
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

async function alert(env: Env, lines: string[]): Promise<void> {
  if (lines.length === 0) return;
  const text = lines.join("\n").slice(0, 1800);
  console.log(text);
  if (!env.ALERT_WEBHOOK_URL) return;
  // Discord webhooks want "content"; Slack and most others want "text".
  const discord = /(^|\.)discord(app)?\.com$/.test(new URL(env.ALERT_WEBHOOK_URL).hostname);
  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discord ? { content: text } : { text }),
    });
  } catch (err) {
    console.error("alert webhook failed", err);
  }
}

// ---------------------------------------------------------------- uptime

async function uptime(env: Env): Promise<void> {
  const urls = env.UPTIME_URLS.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const rows = await env.DB.prepare("SELECT url, ok, fail_streak FROM monitor_state").all<{ url: string; ok: number; fail_streak: number }>();
  const prev = new Map(rows.results.map((r) => [r.url, r]));

  const checks = await pool(urls, 6, async (url) => {
    try {
      const res = await get(url, "GET", "follow");
      await res.body?.cancel();
      return { url, status: res.status, error: null as string | null, up: res.status < 400 };
    } catch (err) {
      return { url, status: 0, error: err instanceof Error ? err.message.slice(0, 200) : "request failed", up: false };
    }
  });

  const writes: D1PreparedStatement[] = [];
  const messages: string[] = [];
  for (const c of checks) {
    const before = prev.get(c.url);
    const streak = c.up ? 0 : (before?.fail_streak ?? 0) + 1;
    const down = streak >= 2; // two failed checks in a row = down
    const wasDown = before ? before.ok === 0 : false;
    if (down && !wasDown) messages.push(`DOWN: ${c.url} (${c.error ?? "HTTP " + c.status})`);
    if (!down && wasDown) messages.push(`UP again: ${c.url}`);
    if (!before || before.fail_streak !== streak || wasDown !== down) {
      writes.push(
        env.DB.prepare(
          `INSERT INTO monitor_state (url, ok, fail_streak, last_status, last_error, changed_at, checked_at)
           VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))
           ON CONFLICT(url) DO UPDATE SET ok = excluded.ok, fail_streak = excluded.fail_streak,
             last_status = excluded.last_status, last_error = excluded.last_error, checked_at = excluded.checked_at,
             changed_at = CASE WHEN monitor_state.ok != excluded.ok THEN excluded.changed_at ELSE monitor_state.changed_at END`,
        ).bind(c.url, down ? 0 : 1, streak, c.status, c.error),
      );
    }
  }
  if (writes.length) await env.DB.batch(writes);
  await alert(env, messages);
}

// ---------------------------------------------------------------- links

async function sitemapUrls(root: string, depth = 0): Promise<string[]> {
  const res = await get(root, "GET", "follow");
  if (!res.ok) return [];
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]!.replaceAll("&amp;", "&"));
  if (/<sitemapindex/i.test(xml) && depth < 1) {
    const out: string[] = [];
    for (const child of locs.slice(0, 3)) out.push(...(await sitemapUrls(child, depth + 1)));
    return out;
  }
  return locs;
}

async function refreshPages(env: Env): Promise<void> {
  const last = await env.DB.prepare("SELECT value FROM monitor_meta WHERE key = 'sitemap_at'").first<{ value: string }>();
  const age = last ? Date.now() - Date.parse(last.value + "Z") : Infinity;
  const have = await env.DB.prepare("SELECT COUNT(*) AS n FROM pages").first<{ n: number }>();
  if (age < 24 * 3600_000 && (have?.n ?? 0) > 0) return;

  const host = new URL(env.SITE_URL).host;
  const urls = (await sitemapUrls(new URL("/sitemap.xml", env.SITE_URL).toString()))
    .filter((u) => {
      try { return new URL(u).host === host; } catch { return false; }
    })
    .slice(0, MAX_SITEMAP_URLS);
  const writes = urls.map((u) => env.DB.prepare("INSERT OR IGNORE INTO pages (url) VALUES (?1)").bind(u));
  writes.push(env.DB.prepare("INSERT INTO monitor_meta (key, value) VALUES ('sitemap_at', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value"));
  await env.DB.batch(writes);
}

async function pageLinks(pageUrl: string): Promise<{ status: number; links: string[] }> {
  const res = await get(pageUrl, "GET", "follow");
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) {
    await res.body?.cancel();
    return { status: res.status, links: [] };
  }
  const links = new Set<string>();
  const rewriter = new HTMLRewriter().on("a[href]", {
    element(el) {
      if (links.size >= MAX_LINKS_PER_PAGE) return;
      const href = el.getAttribute("href");
      if (!href) return;
      try {
        const u = new URL(href, res.url);
        if (u.protocol === "http:" || u.protocol === "https:") {
          u.hash = "";
          links.add(u.toString());
        }
      } catch {
        /* not a URL */
      }
    },
  });
  await rewriter.transform(res).arrayBuffer(); // reading the body runs the handlers
  return { status: res.status, links: [...links] };
}

function verdict(status: number, error: string | null): "ok" | "broken" | "blocked" | "error" {
  if (error || status >= 500) return "error"; // timeouts and server errors: recheck, don't call it broken yet
  if ([401, 403, 429, 999].includes(status)) return "blocked"; // many sites refuse automated checks
  if (status >= 400) return "broken";
  return "ok";
}

async function checkTarget(url: string): Promise<{ url: string; status: number; error: string | null }> {
  try {
    let res = await get(url, "HEAD", "manual");
    if ([403, 404, 405, 501].includes(res.status)) {
      await res.body?.cancel();
      res = await get(url, "GET", "manual"); // some servers answer HEAD wrongly
    }
    await res.body?.cancel();
    return { url, status: res.status, error: null };
  } catch (err) {
    return { url, status: 0, error: err instanceof Error ? err.message.slice(0, 200) : "request failed" };
  }
}

async function links(env: Env): Promise<void> {
  await refreshPages(env);
  const host = new URL(env.SITE_URL).host;

  // 1. Crawl the least recently crawled pages and remember their links.
  const due = await env.DB.prepare("SELECT url FROM pages ORDER BY crawled_at IS NOT NULL, crawled_at LIMIT ?1")
    .bind(PAGES_PER_RUN)
    .all<{ url: string }>();
  const crawled = await pool(due.results, 4, async (p) => {
    try {
      return { url: p.url, ...(await pageLinks(p.url)) };
    } catch {
      return { url: p.url, status: 0, links: [] as string[] };
    }
  });
  const writes: D1PreparedStatement[] = [];
  for (const page of crawled) {
    writes.push(env.DB.prepare("UPDATE pages SET crawled_at = datetime('now') WHERE url = ?1").bind(page.url));
    if (page.status === 0 || page.status >= 400) {
      // A page in your own sitemap that doesn't load is itself a broken link.
      writes.push(
        env.DB.prepare(
          `INSERT INTO link_targets (url, found_on, internal, status, verdict, checked_at, fail_streak) VALUES (?1, 'sitemap', 1, ?2, ?3, datetime('now'), 1)
           ON CONFLICT(url) DO UPDATE SET status = excluded.status, verdict = excluded.verdict, checked_at = excluded.checked_at, fail_streak = link_targets.fail_streak + 1`,
        ).bind(page.url, page.status, verdict(page.status, page.status === 0 ? "no response" : null)),
      );
    }
    for (const link of page.links) {
      const internal = new URL(link).host === host ? 1 : 0;
      writes.push(env.DB.prepare("INSERT OR IGNORE INTO link_targets (url, found_on, internal) VALUES (?1, ?2, ?3)").bind(link, page.url, internal));
    }
  }
  if (writes.length) await env.DB.batch(writes);

  // 2. Check the links: never-checked first, then the oldest. Failing ones are rechecked daily, healthy ones weekly.
  const todo = await env.DB.prepare(
    `SELECT url, fail_streak FROM link_targets
     WHERE checked_at IS NULL OR checked_at < datetime('now', CASE WHEN fail_streak > 0 THEN '-1 day' ELSE '-7 day' END)
     ORDER BY checked_at IS NOT NULL, checked_at LIMIT ?1`,
  )
    .bind(LINKS_PER_RUN)
    .all<{ url: string; fail_streak: number }>();
  const streaks = new Map(todo.results.map((r) => [r.url, r.fail_streak]));
  const results = await pool(todo.results, 5, (r) => checkTarget(r.url));

  const updates = results.map((r) => {
    const v = verdict(r.status, r.error);
    const streak = v === "broken" || v === "error" ? (streaks.get(r.url) ?? 0) + 1 : 0;
    return env.DB.prepare(
      "UPDATE link_targets SET status = ?2, verdict = ?3, error = ?4, checked_at = datetime('now'), fail_streak = ?5, alerted = CASE WHEN ?3 = 'ok' THEN 0 ELSE alerted END WHERE url = ?1",
    ).bind(r.url, r.status, v, r.error, streak);
  });
  if (updates.length) await env.DB.batch(updates);

  // 3. Tell the owner once about links that stayed broken on a second check.
  const fresh = await env.DB.prepare(
    "SELECT url, status, found_on FROM link_targets WHERE verdict = 'broken' AND fail_streak >= 2 AND alerted = 0 LIMIT 20",
  ).all<{ url: string; status: number; found_on: string }>();
  if (fresh.results.length) {
    await alert(env, ["Broken links:", ...fresh.results.map((r) => `${r.status} ${r.url} (linked from ${r.found_on})`)]);
    await env.DB.batch(fresh.results.map((r) => env.DB.prepare("UPDATE link_targets SET alerted = 1 WHERE url = ?1").bind(r.url)));
  }
}

export default {
  async scheduled(controller, env, ctx): Promise<void> {
    if (controller.cron === CRON_UPTIME) ctx.waitUntil(uptime(env));
    else if (controller.cron === CRON_LINKS) ctx.waitUntil(links(env));
    else console.error(`Unknown schedule "${controller.cron}". Update CRON_UPTIME / CRON_LINKS to match wrangler.jsonc.`);
  },
} satisfies ExportedHandler<Env>;
```

Choices worth knowing:

- Outside sites often refuse automated requests (HTTP 401, 403, 429, or a non-standard code such as 999). Those are recorded as `blocked`, not `broken`, so you don't chase false alarms.
- A timeout or a 5xx is `error`: rechecked, never reported as broken.
- Redirects aren't followed when checking a link (a 301 counts as healthy). If you care about redirect chains, extend `checkTarget`.
- Requests identify themselves with a `SiteMonitor/1.0` user agent. If you filter bots in your own analytics, filter that string too.

## 4. Deploy and test

```sh
npx wrangler deploy
```

Test locally before waiting for a schedule. Start the dev server and call the scheduled endpoint (Wrangler 4 serves it at `/cdn-cgi/local/scheduled`; the `cron` value must match one in your config, URL-encoded):

```sh
npx wrangler dev
curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=0+*+*+*+*"
curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=*%2F5+*+*+*+*"
```

Local runs use a local copy of the database unless you configure remote bindings. After deploying, open the Worker in the dashboard, **Settings**, **Trigger Events**, **View events** to see the last 100 cron runs; Workers Logs keeps a longer history.

To simulate downtime: add a URL that returns 404 or doesn't exist to `UPTIME_URLS`; after two runs (10 minutes) you should get the alert.

## 5. Read the results

```sh
# broken links, with the page they were found on
npx wrangler d1 execute site-monitor-data --remote --command "SELECT status, url, found_on, checked_at FROM link_targets WHERE verdict = 'broken' ORDER BY internal DESC, checked_at DESC"
# how much has been checked so far
npx wrangler d1 execute site-monitor-data --remote --command "SELECT verdict, COUNT(*) AS n FROM link_targets GROUP BY verdict"
# current uptime state
npx wrangler d1 execute site-monitor-data --remote --command "SELECT url, ok, fail_streak, last_status, changed_at FROM monitor_state"
```

Fix internal broken links at the source, or add a redirect from the old URL to the new one (see the `fix-404s-after-migrating-static-site` playbook).

## Limits and honest caveats

- Checks run from the Cloudflare network, one location per run. A regional problem or an outage that only affects some visitors may not show up.
- Free-plan CPU is tight (10 ms per run). I/O waiting is free, but parsing HTML and a large sitemap use CPU. If a run is killed, lower `PAGES_PER_RUN` or `MAX_SITEMAP_URLS`, or use Workers Paid.
- JavaScript-rendered links (added in the browser) aren't seen, because pages are read as served.
- This doesn't replace a status page service for a business site; it's a lightweight early warning.

## Or let the app do it

**Site Health** (free with every install) does the uptime half without this code: optional uptime checks on a Cron Trigger (on Pages, through a small helper Worker it ships ready to deploy, for the reason above), email or webhook alerts when the site goes down and when it recovers, and a public status page. It also runs every installed app's self-test and shows your usage against the Cloudflare free limits.

For links: **SEO Pack** lists broken internal links next to its internal-link report (pages that link to a missing page) and orphan pages. **Links & Redirects** checks each affiliate link's destination (not the `/go/` link, so clicks aren't counted), flags dead, expired or changed offers, and can send visitors to a fallback URL while a destination is dead. The crawler above remains the way to check every outbound link on the site.

## Sources

Checked 2026-10-31.

- [Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) (config, UTC, propagation, local testing)
- [Workers scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) (Cron Triggers per account, CPU time per cron, subrequests, connections)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) (queries per invocation, batch) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) (free daily rows)
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) (feature matrix: Cron Triggers on Workers, not Pages)
- [Workers HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
