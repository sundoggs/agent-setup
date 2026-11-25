---
name: "playbook-get-new-pages-indexed-faster-cloudflare"
description: "Published a page and it isn't in search yet? What actually controls how fast Google and Bing find new and changed pages, what doesn't work any more (Google's sitemap ping), what IndexNow does and doesn't do (Google doesn't use it), the Cloudflare one-switch Crawler Hints, and a one-command IndexNow submission. Then what it takes to do this right on every deploy. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "get-new-pages-indexed-faster-cloudflare"
  verified_on: "Google recrawl and sitemaps docs, IndexNow documentation and FAQ, Cloudflare Crawler Hints and Workers Builds docs checked 2026-11-03"
---

> From the Sundogs playbook `get-new-pages-indexed-faster-cloudflare` (verified on Google recrawl and sitemaps docs, IndexNow documentation and FAQ, Cloudflare Crawler Hints and Workers Builds docs checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `seo`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Get new pages indexed faster on a Cloudflare site

You published a new page, or fixed an old one, and search engines still show nothing (or the old version). Some of the delay is out of your hands, but a few signals make a real difference, and some popular tricks do nothing.

> **Short version:** for Google, keep an accurate sitemap with real `<lastmod>` dates, link new pages from pages that already rank, and use Search Console for the few pages that matter most. For Bing and the other IndexNow engines, tell them exactly which URLs changed right after each deploy. On Cloudflare, Crawler Hints is a one-switch start.

## 1. What actually moves the needle

**For Google:**

- **An accurate sitemap,** submitted once in Search Console and referenced from `robots.txt` (`Sitemap: https://your-site.com/sitemap.xml`). Google uses `<lastmod>` only when it's consistently accurate; a sitemap that marks every page as changed on every build teaches Google to ignore it.
- **Internal links.** A new page linked from your home page or a popular article gets found far faster than an orphan only listed in the sitemap.
- **Request indexing in Search Console** (URL Inspection) for a handful of important URLs. There's a quota, and asking again for the same URL doesn't speed anything up.
- **Patience.** Google says crawling can take from a few days to a few weeks, and a crawl never guarantees indexing.

**What doesn't work:** Google's sitemap "ping" endpoint was deprecated in June 2023 and stopped working about six months later. The Google Indexing API is only for job postings and livestream video pages; using it for ordinary pages isn't supported. Google doesn't use IndexNow.

**For Bing, Yandex, Seznam, Naver, Yep and others:** IndexNow. You tell one participating engine which URLs were added, changed or deleted, and it shares the notice with the others. It's a nudge to crawl sooner, not an indexing guarantee.

## 2. The one-switch option: Cloudflare Crawler Hints

If your domain is proxied through Cloudflare: dashboard, your domain, **Caching**, **Configuration**, turn on **Crawler Hints**. It's on every plan and sends IndexNow signals for you. Cloudflare guesses what changed from cache misses, so it's approximate: it can't tell a real update from a cache expiry, and it doesn't report error responses, so deleted pages aren't sent. A good default for a small site.

## 3. A one-command IndexNow submission

When you want to say exactly what changed (a new post, a rewrite, a deleted page), submit the list yourself.

**1. Publish a key file.** A key is 8 to 128 letters, digits or dashes. The file is `<key>.txt` at your site root and contains only the key. It's meant to be public.

```sh
KEY=$(node -e "console.log(crypto.randomUUID().replaceAll('-',''))")
printf '%s' "$KEY" > "public/$KEY.txt"   # Astro, Vite, Next.js: public/   Hugo: static/
```

Deploy, and check `https://your-site.com/<key>.txt` shows the key.

**2. After the deploy is live, submit the changed URLs:**

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"host\":\"your-site.com\",\"key\":\"$KEY\",\"urlList\":[\"https://your-site.com/blog/new-post/\",\"https://your-site.com/pricing/\"]}"
```

`200` means received; `202` means received with the key still being checked; `403` means the key file is missing or wrong. Neither says anything about indexing.

**The IndexNow rules that matter:**

- Submit to **one** endpoint; the engines share notices.
- Submit only URLs that really changed. Resubmitting unchanged pages is explicitly discouraged, and the FAQ asks you to wait at least 5 minutes between updates to the same URL.
- Deleted pages can be submitted too (they now answer 404 or 410), so engines drop them.
- Up to 10,000 URLs per request.
- Submit **after** the deploy is live, or crawlers fetch the old page.

## 4. Where doing it by hand stops

One curl after a big post is easy. Doing it right on every deploy is where people slip:

- **Knowing what changed:** a diff of content files misses template changes; a sitemap rebuilt with today's date on every page lies about `<lastmod>`.
- **Not resubmitting:** a deploy that runs twice, or a script that sends the whole site each time, breaks the rules engines ask you to follow.
- **Running after the deploy:** Cloudflare Pages' Git integration runs only a build step *before* the new version is live, so there's no built-in "after deploy" hook; you need CI or another trigger.
- **A sitemap you trust:** many sites have none, a stale one, or one missing pages added outside the framework.
- **Deletions and redirects** need submitting too.
- **Knowing it's working:** when did the last submission go out, what did it send, and what did the engine answer?

## 5. Or let an app do it

**SEO Pack** does this on your own site, in your own Cloudflare account on the free plan, with no script and no CI step:

- IndexNow built in: it creates and serves the key, then sends only new and changed pages, batched at most every N minutes (default 60), with a dry run and a "ping now" button.
- A `/sitemap.xml` if your site has none.
- An internal linker that links chosen keywords to your own pages, so new pages get links from pages that already rank, with a review step before anything goes live.
- A link report with orphan pages (no internal links pointing at them) and broken internal links.
- AI crawler stats and an `/llms.txt`.
- It says plainly that Google doesn't use IndexNow, so you keep using Search Console for Google.

Your agent can install it into the site you already have.

## Sources

Checked 2026-11-03.

- [Google: ask Google to recrawl your URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) (URL Inspection quota, sitemaps, crawl timing)
- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) (`lastmod` used when consistently accurate)
- [Google Search Central blog: sitemaps ping endpoint is going away (2023)](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
- [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart) (job postings and livestream video only)
- [IndexNow documentation](https://www.indexnow.org/documentation) and [FAQ](https://www.indexnow.org/faq) (key file, batch POST, response codes, one endpoint, no resubmitting, 5-minute rule, deleted URLs)
- [IndexNow participating engines](https://www.indexnow.org/searchengines.json)
- [Cloudflare Crawler Hints](https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/)
