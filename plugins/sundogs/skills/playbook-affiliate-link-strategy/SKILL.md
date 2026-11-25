---
name: "playbook-affiliate-link-strategy"
description: "How to set up affiliate links so a program shutting down, a changed offer or a new tracking ID never means hunting through old posts. Branded /go/ links on your own domain, one link per placement with sub-IDs, disclosure that meets the FTC's rules, rel=\"sponsored\", watching for dead offers, and measuring which pages earn. Starts with a no-code version using the Cloudflare _redirects file. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "affiliate-link-strategy"
  verified_on: "Google outbound-link and spam policies, FTC Endorsement Guides FAQ, Cloudflare Pages and Workers static assets redirects docs checked 2026-11-03"
---

> From the Sundogs playbook `affiliate-link-strategy` (verified on Google outbound-link and spam policies, FTC Endorsement Guides FAQ, Cloudflare Pages and Workers static assets redirects docs checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `links`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# An affiliate link strategy that survives program changes

Affiliate programs change all the time. Networks merge, merchants switch from one network to another, offers expire, tracking IDs get reissued, products go out of stock. If your posts link straight to partner URLs, every change means finding and editing every post that mentions that partner, and the links you miss quietly earn nothing.

This playbook is the system that makes those changes a one-line job, keeps you inside Google's and the FTC's rules, and tells you which pages actually earn. It ends with what an app adds once you outgrow the simple version.

> **Short version:** link to `/go/<partner>` on your own domain, never to the partner directly. Keep the real URLs in one place. Mark the links `rel="sponsored"`, disclose next to the link, and give each important placement its own link or sub-ID so you can see which page earned.

## 1. Why branded links on your own domain

A branded link is a stable address on your site (`/go/acmehost`) that redirects to the long partner URL. Nothing is hidden: the destination is one ordinary redirect away, and the link is marked as paid.

What it buys you:

- **One place to change.** The partner moves from ShareASale to Impact? Change one destination and every post is fixed.
- **Readable, trustworthy links.** `yoursite.com/go/acmehost` reads better than a tracking URL with six parameters, in posts, emails and videos.
- **Your own numbers.** You see clicks per page even when the network's dashboard is slow, wrong or gone.
- **A fallback when an offer dies.** You can point a dead link at an alternative or a comparison page instead of a 404 at the merchant.

What it doesn't do: it doesn't hide that you're an affiliate, and it shouldn't. Some programs restrict how their links may be shortened, redirected or shown (Amazon Associates is the common example). Read each program's terms before you put its links behind a redirect.

## 2. Naming rules that keep working for years

- **Name links after the partner or product, not the offer:** `/go/acmehost`, not `/go/acmehost-black-friday-50`. The offer changes; the slug shouldn't.
- **Lowercase, dashes, no dates.** Slugs live in old posts forever.
- **Use 302, not 301.** A 301 tells browsers and crawlers the move is permanent, and browsers may cache it. Affiliate destinations change, so use a temporary redirect.
- **One prefix for everything paid** (`/go/`), so you can block it in `robots.txt`, mark it with one rule, and spot paid links in your own content at a glance.

## 3. Track placements, not just links

"AcmeHost got 400 clicks" doesn't tell you what to write next. "The hosting comparison table got 300 of them, the sidebar got 4" does.

Two ways to see placements:

- **Separate links per important placement:** `/go/acmehost` in body copy, `/go/acmehost-table` in the comparison table, `/go/acmehost-email` in your newsletter.
- **Sub-IDs passed to the network**, so the network's own conversion report shows which page or placement led to the sale. Each network names the parameter differently: Impact uses `subId1`, CJ uses `sid`, ShareASale uses `afftrack`, Awin uses `clickref`, Rakuten uses `u1`. Check your network's docs for the exact name and allowed characters.

Clicks are only half the story: the network knows which clicks turned into commission. Sub-IDs are what join the two.

## 4. Disclosure and link attributes (the rules)

**FTC (United States).** The FTC's Endorsement Guides FAQ says the disclosure should be clear and close to the recommendation: a disclosure at the bottom of the page, on a separate page, behind a "Disclosure" link or only on the home page is not enough. Its example wording: *"I get commissions for purchases made through links in this post."* It says "paid link" next to a link is adequate, and that "affiliate link" on its own may not be clear to everyone. Other countries have their own rules; this isn't legal advice.

**Google.** Google asks you to mark paid and affiliate links with `rel="sponsored"` (it still accepts `nofollow` for them). Its spam policies also call out "thin affiliate" pages: pages that copy merchant descriptions with no original value. Your own testing, photos, comparisons and opinions are what make an affiliate page worth ranking.

```html
<p class="disclosure">I get commissions for purchases made through links in this post.</p>
<a href="/go/acmehost" rel="sponsored nofollow">AcmeHost</a>
```

Keep crawlers off the redirect addresses:

```txt
# robots.txt
User-agent: *
Disallow: /go/
```

## 5. The minimal version: a `_redirects` file (no code)

On Cloudflare Pages and Workers with static assets, a plain `_redirects` file in your build output gives you branded links with zero code. Put it in the folder your framework copies as-is (Astro and Vite: `public/`, Hugo: `static/`, Next.js static export: `public/`).

```txt
# _redirects: one branded link per line. 302 because offers change.
/go/acmehost        https://partner.example.com/?ref=YOURID 302
/go/acmehost-table  https://partner.example.com/?ref=YOURID&subId1=hosting-table 302
/go/otherhost     https://other.example.net/aff?id=YOURID 302
```

Then link to `/go/acmehost` everywhere, deploy, and check:

```sh
curl -sI https://your-site.com/go/acmehost | grep -iE "^(HTTP|location)"
```

Limits (Cloudflare docs): 2,000 static and 100 dynamic rules per file, 1,000 characters per rule. The file doesn't apply to responses your own Worker code generates.

This already gets you the most important part: one place to change every link. It's honestly enough for a small site with a handful of partners.

## 6. Where the simple version stops

Running this on a real site for a year, you hit the parts that are tedious or easy to get wrong:

- **Every change is a deploy.** Swapping a tracking ID means editing a file, committing and waiting for a build.
- **No click counts.** A redirect file doesn't count anything. Counting means a Worker, a database and, above all, **separating people from bots**: link-preview fetchers, crawlers, uptime checkers and browser prefetches can outnumber real clicks.
- **Dead offers go unnoticed.** Merchants end programs, products go out of stock, landing pages start returning 404 or redirect to the home page. You find out when earnings drop, weeks later.
- **Placement tracking by hand.** Twenty partners times five placements is a hundred lines to keep in sync, plus sub-IDs per network.
- **`rel="sponsored"` depends on remembering it**, in every post, every component, every guest author's draft.
- **Old posts still link straight to partners.** Moving them to `/go/` links means a search-and-replace across your content.
- **Which page earns** needs clicks joined to the page they came from, by day, with bots removed.

## 7. Or let an app do it

**Links & Redirects** runs this whole system on your own site, in your own Cloudflare account on the free plan:

- `/go/` links you add and change in a site admin, effective on the next click, with no redeploy.
- `rel="sponsored nofollow"` added to every `/go/` link as pages are served, so nothing depends on remembering it.
- Placement labels (`/go/acmehost/table`) and partner sub-IDs (`subId1`, `sid`, `afftrack`, `clickref`, `u1`) filled in per placement.
- Click analytics that separate people from bots and prefetches, per link, per page and per day.
- Link health: it checks each destination, flags dead, expired or changed offers and can send visitors to a fallback URL until you fix it.
- An optional switch that swaps raw partner URLs in old posts for their `/go/` link as pages are served, with no content edits.
- Redirects and a 404 monitor in the same app, plus tools your AI agent can use to add, change and report on links.

Your agent can install it into the site you already have. Keep using `_redirects` for anything you like; the two work side by side.

## Sources

Checked 2026-11-03.

- [FTC: Endorsement Guides, what people are asking](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) (affiliate disclosure placement, example wording, "paid link")
- [Google: qualify outbound links (rel="sponsored", rel="nofollow")](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
- [Google: spam policies, thin affiliate pages](https://developers.google.com/search/docs/essentials/spam-policies)
- [Cloudflare Pages: redirects (`_redirects`, limits)](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Cloudflare Workers static assets: redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
