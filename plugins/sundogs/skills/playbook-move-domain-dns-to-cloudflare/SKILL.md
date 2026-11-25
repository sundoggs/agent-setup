---
name: "playbook-move-domain-dns-to-cloudflare"
description: "Point your domain's nameservers at Cloudflare without breaking your email or your current site. Add the domain to Cloudflare, check the copied DNS records, turn off DNSSEC, change the nameservers at your registrar with exact clicks for GoDaddy, Namecheap, Squarespace (including former Google Domains) and Porkbun, then watch for it to go live with dig. Allow up to 24 hours. Use when the site owner has a domain whose DNS is not on Cloudflare and wants to use it for a site on Cloudflare (Workers custom domain or Pages custom domain)."
metadata:
  source: "playbook"
  slug: "move-domain-dns-to-cloudflare"
  verified_on: "Cloudflare full setup docs; GoDaddy, Namecheap, Squarespace and Porkbun help pages checked 2026-11-02"
---

> From the Sundogs playbook `move-domain-dns-to-cloudflare` (verified on Cloudflare full setup docs; GoDaddy, Namecheap, Squarespace and Porkbun help pages checked 2026-11-02). Follow it for the user's stack.

# Move your domain's DNS to Cloudflare

You keep your domain where you bought it (your **registrar**). Only the **nameservers** change: the setting that says which company answers questions about your domain. After the change, Cloudflare answers them, and you can put the domain on a Cloudflare site.

**Time:** about 10–15 minutes of clicks (our estimate), then a wait of **up to 24 hours** (the bound Cloudflare states; it's often much faster). **Cost:** none. The Cloudflare Free plan is enough.

**Don't wait on it.** If the site is new, put it live on its free `workers.dev` address first and do this in parallel.

**What can break if you rush:** email (if the MX and related records aren't copied), the current website (if its records aren't copied), and the whole domain if DNSSEC is left on. The steps below prevent all three.

## 0. Check first (agent)

```sh
dig +short NS example.com
dig +short MX example.com
dig +short A example.com; dig +short CNAME www.example.com
dig +short TXT example.com
```

No `dig`? Use `nslookup -type=ns example.com 1.1.1.1`, or `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=NS'`.

- Nameservers already end in `.ns.cloudflare.com`: DNS is already on Cloudflare. Stop; nothing to do.
- **Save this output** in the project notes. It's your record of what the domain looks like today, for checking the copy in step 2 and for undoing.
- Find the registrar: ask the owner "Where did you buy the domain?", or look it up at [ICANN Lookup](https://lookup.icann.org/). The nameservers hint too: `domaincontrol.com` is GoDaddy, `registrar-servers.com` is Namecheap.
- MX records present? The domain receives email: say so, and check them twice in step 2.

**Can the agent do the registrar part?** Not usually. It needs the registrar's API, which most owners don't have set up (Namecheap, for example, only opens its API to accounts that meet spending or domain-count thresholds). It's a two-minute manual step: give the owner the exact clicks below. Never ask for their registrar password or API key in the chat.

## 1. Add the domain to Cloudflare (owner, or agent with an API token)

Tell the owner:

1. Cloudflare dashboard → **Domains** → **Onboard a domain**.
2. Type the bare domain (`example.com`, no `www`), keep the option to scan for existing DNS records, select **Continue**.
3. Choose the **Free** plan.

Cloudflare then shows the DNS records it found and, at the end, **two nameservers** assigned to this domain (like `ada.ns.cloudflare.com` and `bob.ns.cloudflare.com`). They're also on the domain's **Overview** page later. You can't choose them.

Source: [Full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

## 2. Check the copied records (agent and owner, 5 minutes)

The scan **isn't guaranteed to find every record**. Compare the domain's **DNS** → **Records** page with what you saved in step 0:

- **The website:** the root (`example.com`) and `www` records. If the site stays where it is for now, these must match today's values.
- **Email:** every **MX** record, and the **TXT** records for SPF (`v=spf1 …`), DKIM (`<something>._domainkey`) and DMARC (`_dmarc`). Ask the owner who handles their email (Google Workspace, Microsoft 365, Zoho, the registrar's own mail…) and compare with that provider's setup page if unsure. The values depend on the provider.
- **Proxy status:** keep **MX**, mail-related and verification records as **DNS only** (gray cloud). Records a host told the owner to keep DNS-only (Wix, Ghost, some others) stay gray. Leave the site's own records as they are until the site moves to Cloudflare.
- **Missing anything?** Add it with **Add record**. Registrar "parking" or "forwarding" records you don't need can go.

Only move on when every record from step 0 is there.

## 3. Turn off DNSSEC at the registrar (owner, if it's on)

Cloudflare: "Changing nameservers while DNSSEC is active can cause your domain to become unreachable." If the registrar shows DNSSEC as on, turn it off there first. You turn it back on in Cloudflare once the domain is active (step 6). Check from the terminal: `dig +short DS example.com` prints nothing when there's no DNSSEC record at the registry.

## 4. Change the nameservers at the registrar (owner, 2 minutes)

Replace **all** the current nameservers with the two from Cloudflare, **copied exactly**.

### GoDaddy

1. Sign in, open the **Domain Portfolio**, select the domain.
2. **DNS** → **Nameservers** → **Change Nameservers** if shown → **I'll use my own nameservers**.
3. Enter the two Cloudflare nameservers, **Save**, then **Continue**.
4. Domains with Domain Protection ask for a verification code (text, authenticator or email).

GoDaddy warns this may break website or email connections, because its own DNS records stop applying: that's why step 2 matters. Source: [GoDaddy: change nameservers](https://www.godaddy.com/help/change-nameservers-for-my-domains-664).

### Namecheap

1. Sign in → **Domain List** → **Manage** next to the domain.
2. **Nameservers** → choose **Custom DNS**.
3. Enter the two Cloudflare nameservers and select the **green checkmark**.

Source: [Namecheap: how to change DNS for a domain](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/).

### Squarespace Domains (including domains that came from Google Domains)

Google Domains registrations moved to Squarespace in 2023–2024, so former Google Domains customers do this at Squarespace ([Google Domains notice](https://domains.google/)).

1. Go to `account.squarespace.com/domains` and select the domain.
2. **DNS** → **Domain Nameservers** → **Use Custom Nameservers**.
3. Confirm your password (and two-step code), then **Continue** on the prompt to turn off DNSSEC.
4. Enter the Cloudflare nameservers in **Nameserver 1** and **Nameserver 2**, then **Save**.

Squarespace warns: if the domain is connected to a Squarespace **site**, it disconnects from it; records in Squarespace's DNS settings stop applying (copy MX and DKIM to Cloudflare first); PayPal Payment Links stop working. Source: [Squarespace: review, change or reset nameservers](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers).

### Porkbun

1. Sign in → **ACCOUNT** → **Domain Management**.
2. Select **Details** next to the domain, find **Nameservers**, select the edit icon.
3. Delete all existing entries, type the Cloudflare nameservers one per line, select **Save Nameservers** (and **Submit** if asked again).

Porkbun warns its own hosting and email usually stop working when DNS moves, unless the new DNS has the records (step 2). Source: [Porkbun: how to change nameservers](https://kb.porkbun.com/article/22-how-to-change-nameservers).

### Any other registrar

Look for **Nameservers**, **DNS servers** or **Custom DNS** on the domain's settings page. Remove every existing nameserver, add the two from Cloudflare, save. The Cloudflare full setup page links to step-by-step guides for more registrars (Amazon, OVH, Gandi and others). If the domain was bought through a web host or reseller, the setting may be with them.

## 5. Wait and watch (agent, up to 24 hours)

```sh
dig +short NS example.com @1.1.1.1
dig +short NS example.com @8.8.8.8
```

Done when both print the two Cloudflare nameservers. Also: Cloudflare emails the owner, and the domain shows **Active** on the **Domains** page. With an API token, `GET https://api.cloudflare.com/client/v4/zones?name=example.com` shows `"status": "active"` (it says `"pending"` until then).

- An agent that can schedule a check can poll every 15–30 minutes; otherwise ask the owner to say when the "active" email arrives.
- Meanwhile, check nothing broke: `dig +short MX example.com @1.1.1.1` still shows the same mail servers, and the site still loads.
- Still "pending" after 24 hours? The nameservers at the registrar don't match exactly, or DNSSEC is still on. Compare with `dig ns example.com +trace`.

GoDaddy and Squarespace say up to 48 hours on their side; the Cloudflare guide says up to 24.

## 6. After it's active

- **DNSSEC:** turn it back on from Cloudflare (domain → **DNS** → **Settings** → **Enable DNSSEC**), then add the **DS record** it shows at the registrar. If the registrar asks for the algorithm, it's 13, also called "ECDSA Curve P-256 with SHA-256" ([DNSSEC](https://developers.cloudflare.com/dns/dnssec/)).
- **SSL/TLS:** if the site is still hosted elsewhere and its records are proxied (orange cloud), set **SSL/TLS** mode to **Full (strict)** when the host has a valid certificate. **Flexible** can cause redirect loops on hosts that force HTTPS ([SSL/TLS modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)). Not sure? Keep the site's records **DNS only** until the site moves; nothing changes for visitors that way. The one exception: installing the apps in front of the site's own server (beta) needs the site's record **proxied**. That install checks the record and asks before turning the proxy on ([other hosts](/playbooks/site-apps-on-other-hosts)).
- **Put the domain on the Cloudflare site:** Workers → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**, or a Pages project → **Custom domains**. Cloudflare refuses a Workers custom domain while a CNAME exists on that hostname: replace the old record only when you're ready to switch the site over.
- **Send an email to the domain** and check it arrives.

## Undo

Put the old nameservers back at the registrar (they're in your step 0 output). The old DNS provider usually still has the records. Allow the same wait.

## Sources

- [Cloudflare: full setup (onboarding, record scan, DNSSEC, registrar steps, `dig`, 24 hours)](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Cloudflare: Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare: SSL/TLS encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- Registrars: [GoDaddy](https://www.godaddy.com/help/change-nameservers-for-my-domains-664), [Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/), [Squarespace](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers), [Porkbun](https://kb.porkbun.com/article/22-how-to-change-nameservers)
- [Namecheap API access requirements](https://www.namecheap.com/support/knowledgebase/article.aspx/9739/63/api-faq/)
