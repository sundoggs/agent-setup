---
name: "playbook-restyle-popups-with-site-css"
description: "How an AI coder restyles the Popups app to match your site, or to try a fresh design, using the app's styling hooks and your own stylesheet, never editing the app's files so updates keep working. Includes how to vet open-source designs by license, with verified examples. Use when the site runs the Popups app and the owner wants the popups to match the site or try a new design, without editing site-apps/."
metadata:
  source: "playbook"
  slug: "restyle-popups-with-site-css"
  verified_on: "Popups app styling hooks as shipped in site-apps 0.11, GitHub license pages checked 2026-10-31"
---

> From the Sundogs playbook `restyle-popups-with-site-css` (verified on Popups app styling hooks as shipped in site-apps 0.11, GitHub license pages checked 2026-10-31). Follow it for the user's stack.
> A ready-made app also covers this (app id: `popups`). If the user would rather not build it, the `site-apps` skill shows how to get it.

# Give your popups a new look with your site's own CSS

This guide is for an AI coding agent (and the person directing it) who wants Popups to look like the site, or to adopt a fresh visual design, without touching the app's code. The app's folder, `site-apps/`, is replaced on every update, so anything you edit there is lost. Everything below lives in your own files: your stylesheet, your component classes, or the popup's settings.

You need the **Popups** app installed. The result also applies to the signup form inside a popup, which is drawn by the site's forms engine.

## 1. Know the hooks

Popups draws plain HTML with stable class names and CSS variables. Preview any popup, even a draft, with the **Preview on your site** link in its editor (`/<page>?sp_preview=<name>.<code>`).

The structure:

```html
<div class="sp sp-modal sp-light [sp-sitebtn]">      <!-- root: type class sp-modal | sp-slidein | sp-bar | sp-fullscreen | sp-inline; theme sp-light | sp-dark -->
  <div class="sp-backdrop"></div>                    <!-- modal and fullscreen only -->
  <div class="sp-box">                               <!-- the card -->
    <button class="sp-close" aria-label="Close">×</button>
    <img class="sp-img">                             <!-- if the popup has an image -->
    <div class="sp-body">
      <h2 class="sp-h">Headline</h2>
      <p class="sp-text">Text</p>
      <a class="sp-btn">Button</a>                   <!-- default button; see buttonClass below -->
      <form class="sf-form">…<input class="sf-input"> <button class="sf-submit"></form>
    </div>
  </div>
</div>
```

Other classes: `.sp-no` (the "No thanks" button of a yes/no question), `.sp-code` (coupon), `.sp-mini` (small copy button), `.sp-bar-in` (bar content), `.sp-tabbtn` (side tab), `.sp-cd` (countdown). The root also carries `sp-pos-*` for position.

Variables set on `.sp`: `--sp-bg` (background), `--sp-fg` (text), `--sp-muted` (secondary text), `--sp-line` (borders). Buttons and bars use `--sf-accent` (accent) and `--sf-ink` (text on the accent). The accent comes from the brand color in the app's admin, else the page's `<meta name="theme-color">`; it is set inline on the card (on the bar's root for bars), so a stylesheet can't override it with a variable. To change it, set the brand color in the admin, or set colors directly on the elements as below.

**`buttonClass`:** a popup's `content.buttonClass` is your site's own button classes (for example `"btn btn-primary"`). When set, the popup's buttons and its form's submit button get those classes plus a marker `sp-btn-site` (and the root gets `sp-sitebtn`) instead of `sp-btn`. This is the best way to make popups look native when the site already has a button style. Set it in the popup's editor or with the admin JSON endpoint (`{"id":3,"content":{"buttonClass":"btn btn-primary"}}`).

## 2. Where the CSS goes, and why it needs a prefix

The popup's own `<style>` is added just before `</body>`, after your stylesheets, so with equal specificity it wins. Beat it by raising specificity, not with `!important`: start every rule with `html .sp`, and compare against the app's selector when a rule doesn't take (some, like the form's submit button, are more specific than a single class; the preview shows it at once).

- `.sp-box` is (0,1,0); `.sp-modal .sp-box` is (0,2,0). `html .sp .sp-box` is (0,2,1) and wins both.
- Variables: `html .sp { --sp-bg: … }` beats `.sp-dark { --sp-bg: … }`.

Put the file in your own source (Astro `src/styles/popups.css`, imported in the layout; Next.js a CSS import in the root layout; Hugo/Eleventy your main stylesheet). Not in a CSS cascade `@layer`: unlayered styles beat layered ones, so layered site styles lose to the popup's own CSS.

## 3. Path A: match the site with its design tokens (start here)

Map the popup to the variables the site already has. An agent should read the site's CSS (custom properties, a Tailwind theme, component styles) and use its real names; the names below are examples.

```css
/* src/styles/popups.css */
html .sp {
  --sp-bg: var(--surface, #ffffff);
  --sp-fg: var(--text, #1b1b1f);
  --sp-muted: var(--text-muted, #5d5d66);
  --sp-line: var(--border, rgba(0, 0, 0, 0.12));
  font-family: var(--font-body, inherit);
}
html .sp .sp-box {
  border: 1px solid var(--sp-line);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-lg, 0 20px 60px rgba(0, 0, 0, 0.28));
}
html .sp .sp-h {
  font-family: var(--font-heading, inherit);
  font-size: 1.4rem;
  letter-spacing: -0.01em;
}
/* Buttons. Bars use inverted colors, so they are left out here. The submit rule needs the longer selector
   because the app's own submit rule is more specific than a plain class. */
html .sp:not(.sp-bar) .sp-btn,
html .sp:not(.sp-sitebtn) .sf-form .sf-submit {
  background: var(--brand, #2563eb);
  border-color: var(--brand, #2563eb);
  color: var(--on-brand, #ffffff);
  border-radius: var(--radius-md, 8px);
}
html .sp:not(.sp-bar) .sp-btn:hover,
html .sp:not(.sp-sitebtn) .sf-form .sf-submit:hover { filter: brightness(0.95); }
html .sp .sf-input { border-radius: var(--radius-md, 8px); }

/* Follow the site's dark mode */
@media (prefers-color-scheme: dark) {
  html .sp {
    --sp-bg: var(--surface-dark, #1c1c21);
    --sp-fg: var(--text-dark, #f3f3f5);
    --sp-muted: var(--text-muted-dark, #b0b0ba);
    --sp-line: var(--border-dark, rgba(255, 255, 255, 0.16));
  }
}
```

If the site toggles dark mode with a class or attribute instead, use its selector (for example `html[data-theme="dark"] .sp { … }`).

## 4. Path B: reuse the site's own components

If the site has a button style, set `buttonClass` and add only spacing hooks:

```css
html .sp .sp-btn-site { margin-top: 0.5rem; }
```

For the form inside, the forms engine's classes are `.sf-form`, `.sf-field`, `.sf-label`, `.sf-input`, `.sf-choice` and `.sf-submit`; restyle them the same way, or give the form's submit the site's button class through `buttonClass`.

**Tailwind sites:** Tailwind generates only the classes it finds as complete strings in your source files. A `buttonClass` value that lives only in the app's database is invisible to it, so its utilities won't exist in the built CSS. In Tailwind v4, add the classes to your main CSS file:

```css
@import "tailwindcss";
@source inline("btn btn-primary");   /* the exact classes you gave buttonClass */
```

(`@source inline()` forces classes to be generated, and accepts brace expansion like `{hover:,}bg-blue-{500,600}`.) Older Tailwind versions have a safelist option in the config file; check that version's docs. The same applies to any utility-class design you try.

## 5. Path C: adopt a published design, carefully

Copying a look from an open-source UI collection is fine when its license allows it and it passes the checks below. Take the smallest thing you need (a button style, a card, a form field), not a whole framework, and write it in the section-3 form using your stylesheet.

### License rule: MIT, Apache-2.0 or BSD only

- Read the `LICENSE` file in the repository itself, not a README badge or a marketing page. Record the license, the copyright line and the repository URL.
- MIT, BSD and Apache-2.0 all require you to keep the copyright and license notice when you copy substantial code (Apache-2.0 also has a `NOTICE` file rule). Put a comment above the copied block: `/* Based on <name> (MIT) © <holder>, <repo URL> */`, and keep the license text in your repo if you copied more than a few lines.
- Skip anything without a clear license: CodePen and Dribbble shots, blog posts, screenshots, "free" template sites, paid "pro" or "blocks" libraries (even if the base library is MIT, the paid parts usually aren't), and copyleft or non-commercial licenses (GPL, AGPL, CC BY-NC).
- Check the assets too: fonts, icons and images shipped with a design can carry a different license from its CSS.

### Vetting checklist

1. **Maintained:** not archived, recent releases or commits.
2. **Accessible:** text contrast of at least 4.5:1 (3:1 for large text, WCAG 2.2 AA), visible keyboard focus, buttons large enough to tap, a close button that stays visible, respects `prefers-reduced-motion`.
3. **No tracking, no outside requests:** search the code you copy for `http`, `@import url(`, `fonts.googleapis`, `cdn.`, `analytics`, `gtag`. Self-host fonts if you must have one.
4. **Small and CSS-only:** you need rules, not a JavaScript runtime. Popups already handles opening, closing and focus.
5. **Fits Google's guidance:** a restyle must not make a popup bigger or turn a small card into a screen-covering overlay on phones. Keep slide-ins and bars compact.

To check a repository from the command line: `gh api repos/<owner>/<repo> --jq '{license: .license.spdx_id, archived: .archived, pushed_at: .pushed_at}'`, then open the `LICENSE` file.

### Examples checked on 2026-10-31

Each repository's page showed the license below and no archive notice, unless noted. Re-check at the time you use one; this table is a starting point, not an endorsement of every file in them.

| Collection | License (on its repo) | Use it for |
| --- | --- | --- |
| [daisyUI](https://github.com/saadeghi/daisyui) | MIT | Class-based buttons, cards, modals and form fields on Tailwind. Sets `buttonClass` to `btn btn-primary`. |
| [Flowbite](https://github.com/themesberg/flowbite) | MIT (the open-source library; its paid Pro blocks are separate) | Tailwind-class designs for buttons, modals, form inputs. Copy a design's classes, not the JS. |
| [Bootstrap](https://github.com/twbs/bootstrap) | MIT for the code (docs are Creative Commons) | If the site already uses Bootstrap, set `buttonClass` to `btn btn-primary` and style `.sf-input` with `form-control`'s look. |
| [Pico CSS](https://github.com/picocss/pico) | MIT, but **archived by its owner on 2026-10-04** | A useful example of failing the maintenance check: don't start a new design from it. |

Whether a given component from these is accessible and free of outside requests is something to check per component with the list above. The license is a property of the repository; the vetting is per design.

## 6. Check your work

1. Open each popup type you use in the editor's **Preview on your site**: modal, slide-in, bar, inline, tab, fullscreen.
2. Check at a phone width (about 375 px) and a desktop width, in light and dark.
3. Tab through a popup: focus is visible on every control, and Escape or the close button closes it.
4. Check contrast of text and buttons against their backgrounds (4.5:1 normal text).
5. Check nothing under `site-apps/` changed: `git status` should show only your own stylesheet, layout and settings changes.
6. After the next app update, preview again. The hooks (`.sp`, `.sp-box`, `.sp-h`, `.sp-text`, `.sp-btn`, `.sp-bar` and the `--sp-*` variables) are the supported surface. Class names deeper in the markup are a courtesy: if one moves, only your restyle changes, never your popups.

## Rules for the agent

- Never edit files under `site-apps/`. If a change seems to need it, use a stylesheet rule, `buttonClass`, the popup's settings, or a core event instead.
- Don't use `!important` unless a rule can't win otherwise.
- Don't add a dependency or a font download to restyle a popup.
- Don't remove the close button, the focus outline or the reduced-motion rule.
- Record in a comment where each copied design came from and under which license.

## Or let the app do it

Popups already looks native by default: it uses the site's fonts, picks its accent from the site's theme color or the brand color in the admin, adapts to light and dark, and takes the site's own button classes. This playbook is for the step beyond that. The app's JSON endpoint and admin handle content, targeting and timing; the CSS stays in your repo, where an update can't overwrite it. A later version of this idea is planned for the other apps' widgets (forms, reviews, funnels).

## Sources

Checked 2026-10-31.

- Popups app styling hooks: the app's `SKILL.md` ("Customizing") and its rendering code, site-apps 0.11
- [GitHub: daisyUI](https://github.com/saadeghi/daisyui), [Flowbite](https://github.com/themesberg/flowbite), [Bootstrap](https://github.com/twbs/bootstrap), [Pico CSS](https://github.com/picocss/pico) (license sidebars and archive status)
- [Tailwind CSS: detecting classes in source files and `@source inline()`](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [W3C WCAG 2.2: Understanding contrast (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Google Search Central: intrusive interstitials](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)
