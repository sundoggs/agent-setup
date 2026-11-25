---
name: "playbook-collect-show-reviews-google-ftc-rules"
description: "A review system for your own site that visitors believe: who to ask and when, what you may and may not do under the FTC's review rule and Google's policies (no fake, bought or cherry-picked reviews), how to moderate without suppressing criticism, where to show reviews, and when Google will and won't show stars. Includes the Product review markup Google accepts. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "collect-show-reviews-google-ftc-rules"
  verified_on: "Google review snippet docs, Google Maps user-contributed content policy, FTC Consumer Reviews and Testimonials Rule Q&A checked 2026-11-03"
---

> From the Sundogs playbook `collect-show-reviews-google-ftc-rules` (verified on Google review snippet docs, Google Maps user-contributed content policy, FTC Consumer Reviews and Testimonials Rule Q&A checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `reviews`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Collect and show customer reviews that build trust

Reviews on your own site sell: a visitor who's unsure reads what other customers said and decides. But reviews only work if people believe them, and the rules have teeth. Since October 2024 the FTC can seek civil penalties for fake reviews, and Google removes manipulated ones and ignores markup that breaks its rules.

This playbook is the system: how to collect reviews honestly, moderate them, show them where they help, and mark them up so Google can show stars where it's allowed. It ends with the parts that are hard to run by hand.

> **Short version:** ask every real customer at the right moment, never pay or reward for positive reviews, publish the critical ones too, show reviews next to the decision they support, and add star markup only for products, only with reviews visible on the page.

## 1. The rules, in plain words

**FTC Consumer Reviews and Testimonials Rule (US, in force since 21 October 2024).** Per the FTC's own Q&A, it prohibits:

- Writing, buying or selling fake reviews, including reviews by people who never used the product.
- Giving incentives for reviews **on the condition that they're positive** (or negative about a competitor). An incentive for an honest review isn't banned by the rule, but disclose it.
- Reviews by employees, owners or their relatives without a clear disclosure of the relationship.
- Suppressing reviews with threats, intimidation or false accusations, and presenting the reviews you show as all or most of them when you've hidden negative ones.
- Presenting a site you control as an independent review site.

The rule has no specific ban on asking only happy customers ("review gating"), but the FTC says it can still break the FTC Act.

**Google.** Its contribution policy for Maps and Business Profiles forbids discouraging negative reviews, selectively asking for positive ones, and offering anything (payment, discounts, free goods) in exchange for a review. Reviews that break it are removed.

**Other countries** have similar consumer-protection rules. This isn't legal advice.

## 2. Collecting reviews that are real

- **Ask everyone, not just the happy ones.** The same request to every customer, at the same point.
- **Ask at the right moment:** after delivery or after the result (a week after the job is done, once the product has been used), not at checkout.
- **Make it personal and short:** a link that already knows which product or job it's for, one rating, one text box, a name.
- **Ask for a name and a comment with every rating.** Google recommends accepting only ratings that include both.
- **Mark verified buyers** when you can match a review to an order.
- **Never write reviews for customers,** never "improve" what they wrote, and never copy reviews from Amazon, Trustpilot or Google Maps onto your site as if they were yours.

## 3. Moderating without suppressing

Hold new reviews for approval so spam and abuse don't go live, but reject only what breaks a published policy (spam, abuse, personal data, off-topic), never criticism. Answer critical reviews publicly and politely: a fair reply to a 2-star review builds more trust than a wall of 5s. A page with only perfect ratings looks fake to visitors.

## 4. Where reviews earn their place

- **Next to the decision:** on the product page near the price, on the pricing page, beside the signup form.
- **Specific beats generic:** a review that names the problem it solved ("the booking took two minutes and they arrived on time") does more than "Great service!".
- **One strong quote** near a call to action, and the full list further down for people who want to read more.
- **On the page, not in an image or an iframe:** visible text is what visitors read and what Google can see.

## 5. Stars in Google: when they can appear

Star ratings in search come from structured data on the page. Google's review snippet rules (checked 2026-11-03):

- **Self-serving reviews aren't eligible.** If a business controls the reviews about itself, its LocalBusiness or Organization pages don't get stars, even through a third-party widget. So "reviews of our company" on your home page won't get stars. **Product pages can.**
- **The reviews must be visible** on the marked-up page, and the aggregate rating too.
- **Ratings must come from users** directly, not aggregated from other sites.
- **One item per page.** Mark up the product the page is about, not a category or a list.
- Markup never guarantees stars; Google decides.

The minimal markup for a product page with reviews shown on it:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Trail Running Pack 12L",
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.6, "reviewCount": 38 },
  "review": [{
    "@type": "Review",
    "author": { "@type": "Person", "name": "Dana K." },
    "datePublished": "2026-10-12",
    "reviewRating": { "@type": "Rating", "ratingValue": 5 },
    "reviewBody": "Carried water and a jacket for a 30 km race without bouncing."
  }]
}
</script>
```

Use a dot for decimals (4.6, not 4,6), keep the numbers in step with the reviews on the page, and check the page with Google's Rich Results Test. Make sure only one thing on the page outputs a rating for the product: a theme or SEO plugin doing it too creates conflicting markup.

## 6. What's hard to run by hand

The rules are simple; running them every week isn't:

- **Sending requests to every customer** with a personal link per product or job, at the right time, without becoming a spam source.
- **A form that stops bots** but not real customers.
- **A moderation inbox** with approve, reject and reply, and a record of why something was rejected.
- **Showing reviews in several formats** (a badge with the average, a list, a wall of love, a carousel, a single quote) that look like your site, without a slow third-party widget.
- **Markup that stays correct:** counts and averages updated as reviews are approved, only on product pages, never on company testimonials, never duplicated.
- **Bringing in reviews you already collected** elsewhere, from that platform's own export, without breaking the "first-hand" rule.

## 7. Or let an app do it

**Reviews** runs this system on your own site, in your own Cloudflare account on the free plan:

- A review form with spam protection, and personal review-request links for real customers.
- A moderation inbox: new reviews wait for approval, and the app never edits what a reviewer wrote.
- A badge, list, wall of love, carousel or single quote wherever you place it, drawn into the page with no third-party script, in your site's fonts and colors.
- CSV import from another platform's own export.
- Google Product markup only when it's allowed: a product, reviews visible on the page, one product per page. Company-wide testimonials never get markup.
- With **Social Proof** installed, new reviews can appear as small notices on your site.

Your agent can install it into the site you already have and set up your first review request.

## Sources

Checked 2026-11-03.

- [FTC: Consumer Reviews and Testimonials Rule, questions and answers](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers) (effective date, what's prohibited, review gating)
- [Google Maps: prohibited and restricted content (rating manipulation, fake engagement)](https://support.google.com/contributionpolicy/answer/7400114)
- [Google: review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) (eligible types, self-serving reviews, visibility, required properties)
- [Google: product snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [Google: Rich Results Test](https://search.google.com/test/rich-results)
