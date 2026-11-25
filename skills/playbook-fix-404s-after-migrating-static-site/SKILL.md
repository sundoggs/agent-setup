---
name: "playbook-fix-404s-after-migrating-static-site"
description: "Moved or rebuilt a site in Astro, Hugo, Eleventy or Vite on Cloudflare and old links now break? How to find every old URL, map it to the right new page, write the rules in a _redirects file, avoid the traps (soft 404s, trailing slashes, chains, everything sent to the home page) and check the result. Then how to catch the misses you didn't know about. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "fix-404s-after-migrating-static-site"
  verified_on: "Cloudflare Pages redirects and serving docs, Workers static assets redirects and routing docs, Google redirects and site moves docs checked 2026-11-03"
---

> From the Sundogs playbook `fix-404s-after-migrating-static-site` (verified on Cloudflare Pages redirects and serving docs, Workers static assets redirects and routing docs, Google redirects and site moves docs checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `links`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Fix 404s after migrating a static site to Cloudflare

A migration (WordPress to Astro, Jekyll to Hugo, a new URL structure, a new host) almost always breaks some links. Old URLs live on in Google's index, in other sites' links, in newsletters and bookmarks. Every one that now 404s loses a visitor and, over time, the ranking that page had earned.

This playbook gets the redirects right on launch day, and shows why the job doesn't end there.

> **Short version:** list every old URL before you switch, map each one to its closest new page (not the home page), write the rules as 301s in `_redirects`, make sure missing pages really return 404, test the whole list with curl, then keep watching for misses for a few months.

## 1. List every old URL (before you switch, if you can)

Collect from as many sources as you have, then de-duplicate:

- **The old sitemap** (`/sitemap.xml`, `/sitemap_index.xml`, `/post-sitemap.xml` on WordPress). Save a copy before the old site goes away.
- **Google Search Console:** the Pages report and the Performance report list URLs that get impressions. Export them.
- **Your analytics:** top landing pages for the last 12 months.
- **Backlinks:** the URLs other sites link to (Search Console's Links report, or your SEO tool).
- **The old site's own patterns:** `/category/…`, `/tag/…`, `/page/2/`, `?p=123`, `/feed/`, date-based paths like `/2023/05/my-post/`.

## 2. Map each old URL to its best new home

- **Closest equivalent page,** same topic. Google may treat a redirect to an unrelated page or the home page like a missing page (a "soft 404"), and it frustrates the visitor.
- **No equivalent?** Let it 404 (or 410) rather than send it somewhere irrelevant. A good 404 page with search and top links is better than a misleading redirect.
- **Use patterns where the change is systematic:** `/blog/2023/05/my-post/` to `/blog/my-post/` is one rule, not hundreds.
- **Use 301 (or 308) for permanent moves.** 302 is for temporary ones.

## 3. Write the rules in `_redirects`

Cloudflare Pages and Workers with static assets both read a `_redirects` file from your build output. Put it where your framework copies files as-is (Astro and Vite: `public/`, Hugo: `static/`, Eleventy: a passthrough copy).

```txt
# Exact moves first, then patterns. The first matching rule wins.
/about-us                    /about/                 301
/services/web-design.html    /services/web-design/   301
/2023/:month/:slug           /blog/:slug/            301
/category/*                  /blog/                  301
/feed                        /rss.xml                301
```

Rules from the Cloudflare docs: one rule per line (`source destination [status]`); the default status is 302, so write `301`; static rules should come before dynamic ones (`*`, `:placeholders`); limits are 2,000 static and 100 dynamic rules per file, 1,000 characters each. The file doesn't apply to responses your own Worker code generates. Beyond those limits, the Cloudflare Bulk Redirects take over.

## 4. Avoid the classic traps

- **Soft 404s.** On Pages, a site with **no top-level `404.html` is treated as a single-page app**: every unknown URL returns the home page with status 200. Nothing ever looks missing, to you or to Google. Add a 404 page (Astro: `src/pages/404.astro`). On Workers with static assets, set `"not_found_handling": "404-page"` under `assets` so the nearest `404.html` is served with a 404 status.
- **Trailing slashes.** the Cloudflare default HTML handling serves `about.html` at `/about` and `about/index.html` at `/about/`, redirecting the other form. Write redirect targets in the form your new site actually uses, or every redirect becomes two hops.
- **Chains.** Old URL to an older redirect to the new page. Point every rule straight at the final URL.
- **Everything to the home page.** Tempting, and nearly useless (see step 2).
- **Case and encoding.** Old WordPress URLs often have uppercase letters or encoded characters; test them as they appear in your list.

## 5. Test the whole list

Save your old URLs one per line in `old-urls.txt` and run:

```sh
while read -r url; do
  printf '%s  ' "$url"
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$url"
done < old-urls.txt
```

Every line should show `301` with the right destination, or `200` for pages that kept their address. Fix any `404`, any `302` you didn't mean, and any destination that itself redirects. Also check a made-up URL returns `404`:

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://your-site.com/this-does-not-exist
```

## 6. The part a redirect file can't do

However careful your list, some old URLs only show up after launch: links in old emails, a forum post from 2019, a typo in a popular backlink, a page you forgot existed. A `_redirects` file can't tell you about them. You need to see **which missing URLs real people actually hit**, and that's where it gets fiddly:

- Logging 404s means running code on every miss, with a database to store them.
- **Bots dominate 404 traffic:** vulnerability scanners probing `/wp-login.php` and `/.env`, crawlers following stale links. Without filtering, the list is noise.
- Each fix is an edit, a commit and a deploy.
- You want to know where a broken link came from (the referrer), how often it's hit, and when it stops.
- After a few months, you need to know which redirects are still used and which can go.

## 7. Or let an app do it

**Links & Redirects** handles the after-launch part on your own site, in your own Cloudflare account on the free plan:

- A 404 monitor that separates people from bots and scanners, with hit counts, referrers and last-seen dates.
- One-click "redirect this" on any missing URL, live on the next request with no redeploy.
- Redirects you add and change in a site admin, with hit counts per redirect so you can see which are still used.
- Your `_redirects` file keeps working and runs first, so nothing you did above is wasted.
- Tools your AI agent can use to read the 404 list and propose redirects for you to approve.

Your agent can install it into the site you already have, right after the migration.

## Sources

Checked 2026-11-03.

- [Cloudflare Pages: redirects](https://developers.cloudflare.com/pages/configuration/redirects/) (format, default 302, order, limits)
- [Cloudflare Pages: serving pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) (no 404.html means single-page-app behavior)
- [Cloudflare Workers static assets: redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
- [Cloudflare Workers static assets: static site generation and custom 404 pages](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/) (`not_found_handling`, `html_handling` default)
- [Google: redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Google: site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
