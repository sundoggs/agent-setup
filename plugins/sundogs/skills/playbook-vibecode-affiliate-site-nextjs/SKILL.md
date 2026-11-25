---
name: "playbook-vibecode-affiliate-site-nextjs"
description: "Build a whole affiliate site with an AI coding agent, start to finish: pick a niche you can win, plan the pages that earn (best-of lists, comparisons, reviews), set up Next.js as a static export, write content Google rewards, get the SEO basics right, deploy on the Cloudflare free plan, then monetise with affiliate links and an email list, and measure which pages make money. With prompts you can give your agent at each step. Use when the user wants this done by hand on a site hosted on Cloudflare (workers)."
metadata:
  source: "playbook"
  slug: "vibecode-affiliate-site-nextjs"
  verified_on: "Next.js 16 static exports docs, Cloudflare Workers static assets and Next.js guides, Google product review, review snippet and spam policy docs, FTC Endorsement Guides FAQ checked 2026-11-03"
---

> From the Sundogs playbook `vibecode-affiliate-site-nextjs` (verified on Next.js 16 static exports docs, Cloudflare Workers static assets and Next.js guides, Google product review, review snippet and spam policy docs, FTC Endorsement Guides FAQ checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `links`, `seo`, `analytics`, `popups`, `forms`, `consent`, `health`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# How to vibecode an affiliate site on Next.js

"Vibecoding" here means you direct and your AI coding agent (Claude Code, Codex, Cursor or similar) writes the code. You make the decisions that decide whether the site earns: the niche, the pages, the honesty of the reviews. The agent does the typing.

This playbook is the whole project, in the order to do it. Each step has the decisions, the traps, and a prompt you can give your agent. Ready-made apps show up where they save you building something yourself; you can skip every one of them.

> **What you end up with:** a fast Next.js site on your own domain, hosted on the Cloudflare free plan, with best-of lists, comparisons and reviews, branded affiliate links, an email list, and numbers that show which pages earn. Costs: a domain (about the price of a lunch per year) and your time.

## 1. Pick a niche you can actually win

The niche decides more than any line of code. Good signs:

- **You can get first-hand experience.** Google's guidance on product reviews asks for evidence of real use: your own photos, measurements, comparisons. A niche where you can buy, borrow or test the products beats one where you'd only rewrite spec sheets.
- **Buyers search with intent:** "best X for Y", "X vs Y", "X review", "X alternatives". Those searches are close to a purchase.
- **Programs exist and pay enough:** check the merchants' own affiliate pages and the big networks (Impact, CJ, Awin, ShareASale, Rakuten, Amazon Associates). Recurring commissions (software, hosting, subscriptions) compound.
- **The competition is beatable:** if page one is all huge publishers with deep testing, pick a narrower angle ("best standing desks for small apartments", not "best standing desks").
- **Careful with money and health topics.** Google holds "your money or your life" content to a higher standard; without real expertise, pick something else.

**Prompt:** *"I'm considering an affiliate site about [topic]. List 30 buyer-intent searches in this niche grouped by type (best-of, comparison, review, alternatives, how-to), the affiliate programs that cover the products, and what first-hand evidence I'd need to write a credible review of each product. Don't invent commission rates; say where to check them."*

## 2. Plan the pages that earn

Affiliate sites earn from a few page types. Plan them before writing code so the URLs never have to change:

| Page type | Example URL | Job |
| --- | --- | --- |
| Best-of list | `/best/standing-desks-small-spaces/` | Rank options for one use, with a clear winner per need |
| Comparison | `/compare/flexispot-vs-uplift/` | Settle a two-way decision |
| Review | `/reviews/flexispot-e7/` | Deep, first-hand look at one product |
| Alternatives | `/alternatives/uplift-v2/` | Catch people leaving a competitor |
| Guide | `/guides/desk-height-calculator/` | Earn links and trust; link to the money pages |
| About, how we test, disclosure | `/about/`, `/how-we-test/` | Show who's behind the reviews and how you test |

Rules worth keeping from day one: lowercase URLs with trailing slashes (pick one style and keep it), no dates in URLs, and every money page linked from at least one guide or hub.

## 3. Set up the project with your agent

For a content site, a **static export** is the simplest and cheapest way to run Next.js on Cloudflare: Next.js renders every page to HTML at build time, and Cloudflare serves the files. Requests to static assets on Workers are free and unlimited.

**Prompt:** *"Create a Next.js app (App Router, TypeScript) for a static affiliate site with `output: "export"` and `trailingSlash: true` in next.config. Content lives in Markdown/MDX files under `content/` with frontmatter (title, description, type, products, updated). Build components: `ProductCard`, `ComparisonTable`, `ProsCons`, `Verdict`, `AffiliateLink` (always renders `/go/<slug>` with rel="sponsored nofollow") and `Disclosure`. Generate every route with `generateStaticParams`. Add a 404 page. Write these rules into AGENTS.md so you follow them in later sessions."*

The rules file matters: it's how the agent keeps the conventions (link component, disclosure, URL style) across sessions.

```ts
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true }, // the default image loader needs a server; or use a custom loader
};

export default config;
```

Static export limits to know (Next.js docs): no `redirects()`, `rewrites()` or `headers()` in next.config, no `proxy.ts`, no Server Actions, no route handlers that read the request, and dynamic routes need `generateStaticParams`. None of that is needed for a content site, and on Cloudflare you get redirects from a `_redirects` file and the apps below instead.

Need server rendering later (search, logged-in users)? The Cloudflare Next.js guide now scaffolds server-rendered apps with vinext (beta), and OpenNext remains the path for existing OpenNext apps.

## 4. Write content Google rewards (with an agent's help)

Google doesn't penalise content for being written with AI help; it penalises content that isn't helpful, and its spam policies name **scaled content abuse** (many pages made mainly to rank) and **thin affiliate pages** (merchant descriptions with no original value). Its product review guidance asks for:

- Evidence of your own experience: photos, video, test results.
- Measurements: how it performed, in numbers.
- What it compares to, and which option suits which person.
- Benefits and drawbacks from your own testing.
- Optionally, links to more than one seller.
- Ranked lists with enough substance to stand on their own.

A workflow that works: you test and take notes and photos; the agent turns your notes into a structured draft with the components above; you edit for voice and accuracy. Never let the agent invent test results, prices or quotes.

**Prompt:** *"Here are my test notes and photos for [product]. Draft the review using our components: verdict up top, who it's for and not for, test results as a table, pros and cons, how it compares to [2 alternatives], and a disclosure line next to the first affiliate link. Use only facts from my notes; mark anything you'd need me to check with [CHECK]."*

## 5. The SEO basics, Next.js style

- **Titles and descriptions** per page with `generateMetadata`, written for the search ("Best standing desks for small spaces (2026, tested)").
- **A sitemap** with `app/sitemap.ts` (add `export const dynamic = "force-static"` so it's generated at build time in a static export) and `app/robots.ts`, with `Disallow: /go/` so crawlers skip affiliate redirects.
- **Structured data:** `Review` markup on your own product reviews (a review of a product by your site is eligible; reviews of your own business aren't). Only mark up what's visible on the page.
- **Internal links** from guides to money pages, and between related comparisons.
- **Canonical URLs** in metadata, matching your trailing-slash choice.

## 6. Deploy on Cloudflare (free plan)

An assets-only Worker serves the `out/` folder. `wrangler.jsonc` in the project root:

```jsonc
{
  "name": "my-affiliate-site",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./out",
    "not_found_handling": "404-page"
  }
}
```

```sh
npx next build && npx wrangler deploy
```

No Cloudflare account or not logged in yet? See the `create-cloudflare-account-connect-wrangler` playbook. Connect the GitHub repo in the Cloudflare dashboard (Workers Builds) for a deploy on every push, then add your domain (the `move-domain-dns-to-cloudflare` playbook covers the DNS move).

**Prompt:** *"Add wrangler.jsonc for an assets-only Worker serving ./out with not_found_handling 404-page, a deploy script `next build && wrangler deploy`, and check that a made-up URL returns 404, not 200."*

## 7. Monetise: affiliate links and an email list

**Affiliate links.** Link to `/go/<partner>` on your own domain, never straight to the partner, so a changed program is a one-line fix. Disclose next to the link (the FTC says a footer or separate page isn't enough; "I get commissions for purchases made through links in this post" is its example), and mark links `rel="sponsored"`. The `affiliate-link-strategy` playbook covers naming, sub-IDs per placement and dead-offer monitoring; a `_redirects` file in `public/` is the no-code start.

**An email list.** Search visitors leave and rarely come back; an email list is the audience you own. Offer something specific to the page (a buying checklist, a price-drop alert) in a signup box that waits until the visitor has read part of the page. The `email-signup-popups-without-hurting-seo` playbook covers timing, Google's rules and accessibility.

## 8. Measure which pages earn

You want to know, per page: visits from search, clicks on affiliate links (by people, not bots), signups, and, from the networks, commissions per sub-ID. That join is what tells you which page to write next and which to improve.

## 9. Consent and keeping it healthy

- **Cookie consent:** if you add analytics or ad tags and have visitors in the EU or UK, you need a banner that blocks those tags until people agree, with Accept and Reject equally easy.
- **Dead offers:** programs close, products go out of stock, landing pages break. Check affiliate destinations regularly.
- **404s and uptime:** after URL changes, catch old links people still hit; know when the site is down before your earnings tell you.

## 10. Where the apps fit (optional)

Everything above works without them. Each one replaces something you'd otherwise build and maintain. They install into this same site with your agent, run in your own Cloudflare account, and work on the free plan. Installing them adds a small Worker in front of your static files.

| Step | App | What it saves you |
| --- | --- | --- |
| 7. Affiliate links | **Links & Redirects** | `/go/` links you change in an admin with no redeploy, `rel="sponsored nofollow"` added automatically, placement labels and sub-IDs, click counts without bots, dead-offer checks with a fallback URL, redirects and a 404 monitor |
| 5. SEO | **SEO Pack** | Automatic internal links from chosen keywords to your money pages and `/go/` links, a report of orphan pages and broken links, IndexNow on new pages, `llms.txt`, AI crawler stats |
| 8. Measure | **Analytics** | Visits and conversions by source (search, social, email, AI assistants), and what each page, link, popup and form converted |
| 7. Email list | **Popups** + **Forms** (free) | Signup popups with engagement triggers, targeting, frequency limits and A/B tests; signups land in a forms inbox with spam protection, notifications and webhooks |
| 9. Consent | **Cookie Consent** (free) | A banner with equal Accept and Reject that every app and tag obeys, regions, records |
| 9. Health | **Site Health** (free) | Every app's self-test with the fix, uptime checks with alerts, usage against the free limits |

**Prompt:** *"Look at the app catalog at sundo.gs and tell me which apps fit this affiliate site, what each needs, and what's free. Don't install anything until I say which."*

## Sources

Checked 2026-11-03.

- [Next.js: static exports](https://nextjs.org/docs/app/guides/static-exports) (`output: "export"`, unsupported features, image loader, route handlers with `force-static`)
- [Cloudflare: Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) (static export supported, vinext beta, OpenNext)
- [Cloudflare Workers static assets: billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) (static asset requests free and unlimited)
- [Cloudflare Workers static assets: static site generation and custom 404 pages](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/) (`not_found_handling: "404-page"`)
- [Google: write high quality reviews](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews)
- [Google: spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (scaled content abuse, thin affiliate pages)
- [Google: guidance about AI-generated content](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content)
- [Google: review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [Google: qualify outbound links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
- [FTC: Endorsement Guides, what people are asking](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)
