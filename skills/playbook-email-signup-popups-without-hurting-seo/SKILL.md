---
name: "playbook-email-signup-popups-without-hurting-seo"
description: "What makes an email popup earn signups instead of annoying people: the offer, timing, how often it shows, how it behaves on phones, what Google says about intrusive interstitials, keyboard and screen-reader access, and consent. Includes a minimal accessible popup with the native dialog element, and the list of what's hard to get right on a real site. Use when the user wants this done by hand on a site hosted on Cloudflare (pages and workers)."
metadata:
  source: "playbook"
  slug: "email-signup-popups-without-hurting-seo"
  verified_on: "Google intrusive interstitials guidance, MDN dialog docs, Cloudflare Workers + Pages docs checked 2026-11-03"
---

> From the Sundogs playbook `email-signup-popups-without-hurting-seo` (verified on Google intrusive interstitials guidance, MDN dialog docs, Cloudflare Workers + Pages docs checked 2026-11-03). Follow it for the user's stack.
> A ready-made app also covers this (app id: `popups`, `forms`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Email signup popups that grow your list without hurting SEO or accessibility

Popups work: a well-timed signup box usually collects far more emails than a form in the footer. They also annoy people, break keyboard navigation, and can drag your pages down in Google when they cover the content. The difference is almost entirely in the decisions, not the code.

This playbook covers those decisions, gives you a minimal accessible popup you can drop in, and then lists what's hard to run well on a real site.

> **Short version:** offer something specific, wait until the visitor has read part of the page, use a small card (a bottom card on phones), never show it again right after someone closes it, make it work with the keyboard, and keep email consent separate from cookie consent.

## 1. The offer matters more than the design

"Subscribe to our newsletter" converts poorly. A concrete reason converts well: a checklist for the page they're on, a discount, early access, the next part of a guide. Match the offer to the page: a visitor reading a pricing comparison wants a different thing from one reading a beginner's guide.

## 2. Timing and frequency

- **Wait for engagement:** after part of the page is read (for example 40% scrolled) or 15 to 30 seconds, not on arrival. Someone who just landed from search hasn't seen why they'd want your emails.
- **Exit intent** on desktop (the pointer heads for the tab bar) catches people who were leaving anyway. It doesn't exist on phones.
- **Respect a "no":** after a close, don't show it again on the next page. Wait days, or stop after two closes.
- **Never show it to people who already signed up.**
- **Leave some pages alone:** checkout, contact, login, and pages people reach to do a task.

## 3. What Google says (intrusive interstitials)

Google's guidance asks you to avoid overlays that obscure the content and full-page takeovers, and not to send visitors to a separate page for input. It recommends **banners that take up only a small fraction of the screen**. Legally required interstitials (its example is an age gate) are exempt.

So: a small card, not a full-screen wall; on phones, a compact card docked at the bottom that leaves the page readable and scrollable; and a delay so the content is seen first.

## 4. Accessibility

A popup that traps mouse users but lets keyboard users tab into the page behind it, or can't be closed with Escape, is a real barrier. The native `<dialog>` element does the hard parts: opened with `showModal()`, the browser moves focus into it, makes the rest of the page inert and closes it on Escape (MDN). It has been available in all major browsers since March 2022.

Also: a visible label on the email field, a real close button with an accessible name, visible focus outlines, no animation for people who ask for reduced motion, and focus returned to where the visitor was when the popup closes.

## 5. Consent: two separate questions

- **Email marketing consent** is the visitor agreeing to get your emails. Make it an explicit action (an unticked box or a clear button), store when it was given, and say how to unsubscribe. Many email providers expect double opt-in (a confirmation email); in some countries it's the safe default.
- **Cookie consent** is about remembering that someone closed the popup. Rules differ by country and may treat even that memory as needing consent. Without consent, remember the close for the visit only (session storage) rather than setting a cookie. This isn't legal advice.

## 6. A minimal accessible popup

Enough to try the idea on one page. It shows after 40% scroll and 15 seconds, once per visit, and posts to whatever form endpoint you already have.

```html
<dialog id="signup" aria-labelledby="signup-title">
  <form method="post" action="/your-form-endpoint">
    <h2 id="signup-title">Get the hosting checklist</h2>
    <label>Email <input type="email" name="email" required autocomplete="email"></label>
    <label><input type="checkbox" name="consent" required> Send me the checklist and occasional emails. Unsubscribe any time.</label>
    <button type="submit">Send it</button>
    <button type="button" value="close" formmethod="dialog" formnovalidate aria-label="Close">Close</button>
  </form>
</dialog>
<script>
  (() => {
    const d = document.getElementById("signup");
    if (!d || sessionStorage.getItem("signup-closed")) return;
    let scrolled = false, waited = false, opener = null;
    const tryOpen = () => { if (scrolled && waited && !d.open) { opener = document.activeElement; d.showModal(); } };
    addEventListener("scroll", () => { if (scrollY / (document.body.scrollHeight - innerHeight) > 0.4) { scrolled = true; tryOpen(); } }, { passive: true });
    setTimeout(() => { waited = true; tryOpen(); }, 15000);
    d.addEventListener("close", () => { sessionStorage.setItem("signup-closed", "1"); opener?.focus?.(); });
  })();
</script>
```

Style it as a small card with your site's own CSS, and on narrow screens dock it at the bottom (`position: fixed; inset: auto 0.75rem 0.75rem; margin: 0`). Need somewhere for the signups to land? The `contact-form-turnstile-d1` playbook shows a spam-protected endpoint on Cloudflare, or the free Forms app gives you one with an inbox.

## 7. What's hard to get right on a real site

The snippet is one popup on one page. Running popups for a business is a different job:

- **Targeting:** different offers per section, device, country, new versus returning visitors, campaign links and referrers.
- **Frequency rules across visits:** every N days, stop after N closes, stop for good after a signup, without a cookie until the visitor consents.
- **Triggers beyond scroll and time:** exit intent, inactivity, pages viewed, clicking a "Subscribe" link anywhere.
- **Measuring it:** views, closes and signups per popup, and which one actually wins. That needs an A/B test with a sticky split, not a gut feeling.
- **Spam and duplicates:** bots fill every form they find; the same person signs up twice.
- **Getting the emails somewhere useful:** an inbox, notifications, a CSV, a webhook to your email tool, the same contact list as your other forms.
- **Looking like your site** in every format (modal, slide-in, bar, inline box) without a designer.
- **Staying fast:** most popup services load a third-party script on every page.

## 8. Or let an app do it

**Popups** does all of the above on your own site, in your own Cloudflare account on the free plan, with no third-party script:

- Modals, slide-ins, top and bottom bars, welcome mats, inline boxes and side tabs that pick up your site's look.
- Triggers on delay, scroll, exit intent, inactivity or pages viewed, with "wait for engagement" rules.
- Targeting by page, device, country, new or returning visitor, referrer and URL parameters.
- Frequency limits (once per visit, every N days, stop after N closes, stop after signup) that respect your cookie consent tool.
- An A/B test of two versions with a sticky split, and views, closes and signups per popup.
- Warnings for setups Google advises against.
- Signups go through the free **Forms** app: the same inbox, spam protection, notifications and contacts as every other form on your site.

Your agent can install both into the site you already have, and set up the first popup from the offer you choose.

## Sources

Checked 2026-11-03.

- [Google Search Central: avoid intrusive interstitials and dialogs](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)
- [MDN: the `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) (`showModal()`, inert page, Escape, browser support)
- [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
