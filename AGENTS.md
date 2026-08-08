# Perfect Prairie Agent Guide

These instructions apply to the entire repository.

Read [SOUL.md](SOUL.md) before changing the website, campaign assets, public copy, or product direction. It is the durable source for Emma’s mission and the character of Perfect Prairie.

## Source-of-truth order

1. The user’s latest explicit direction
2. `SOUL.md` and this file
3. Approved copy already present in `app/page.tsx`
4. Existing implementation patterns

When sources conflict, follow the newest explicit direction and update the durable context files if the user asks for that change to persist.

## Brand rules

- The business name is always **Perfect Prairie**, singular.
- Never publish **Perfect Prairies**.
- Public-facing copy speaks as **we**. Do not write “Emma will,” “Emma selects,” or similar third-person operational copy.
- Emma may be named in internal documentation and planning. Do not make her personal name the public voice unless she explicitly requests it.
- The core market is Central Illinois.
- The mission is bigger than ornamental gardening: rewild ordinary land and restore connected native habitat.

## Service architecture

Preserve these three services unless Emma explicitly changes them:

1. **On-site consultations** for conservation practices, prairie plots, ditch conversions, new construction zones, and other land-use opportunities.
2. **Native landscape design and installation** using exclusively native plants, with site-specific design, vegetation removal, installation, and a watering and maintenance plan as appropriate.
3. **Prairie and wildflower plots**, including annual displays for schools, libraries, and boulevards plus high-performance native perennial plots for yards and properties, shaped around site conditions and desired height.

Do not collapse the offering back into pollinator, wildflower, and prairie “plot tiers.” Pollinator support is an outcome across the work, not a separate legacy tier.

## Copy guardrails

Protect these approved lines:

- “Less lawn. More habitat.”
- “Turn a piece of your property into something that thrives.”
- “Not just flowers—a thriving ecosystem.”
- “Wild by nature. Intentional by design.”
- “The best low-maintenance landscapes are not empty. They are busy doing the work.”
- “Wherever grass grows, prairie can grow better.”

Be precise about time and maintenance:

- Never imply a new prairie needs no watering or care.
- “No routine fertilizer or irrigation” applies only after an established prairie finds its rhythm.
- Do not invent pricing, certifications, guarantees, survival rates, plant inventories, or geographic coverage.
- Distinguish annual wildflower displays from native perennial prairie plantings.
- Use “exclusively native plants” specifically for the native landscape design service, as Emma described it.

## Imagery and attribution

Authentic Perfect Prairie and vision imagery lives in `public/images/work/`.

- Images gathered from Emma’s public Perfect Prairie Facebook page can represent her work, observations, or vision.
- Do not label a photographed site as a completed Perfect Prairie client installation unless Emma confirms that fact.
- It is safe to frame these images as inspiration, ongoing work, a living landscape, or an example of what ordinary ground can become.
- `public/images/work/founder-in-the-field.jpg` may be used to humanize the founder story, but do not imply its location is an Illinois prairie.
- Keep the Galena photo and all derivatives out of the repository and public outputs.
- Preserve the on-page attribution for `public/images/illinois-wildflowers.jpg`.
- Preserve the archive credit for `public/images/prairie-spirit-1915.jpg`.
- When adding outside images, record the original URL, creator, license, and required credit near the asset or in project documentation.

## Design system

Maintain the established editorial-prairie direction in `app/globals.css`:

- forest green: `#183a2a`
- deep green: `#0d2b1e`
- warm cream: `#f4f0df`
- paper: `#fbf8ee`
- sunflower yellow: `#e4d534`
- moss: `#727a2b`

Use large serif headlines, compact uppercase labels, strong photographic scale, and generous spacing. The result should feel rooted, optimistic, tactile, and ecological—not like a generic landscaper template.

Keep responsive behavior intact. Test meaningful changes at desktop and mobile widths, and preserve reduced-motion handling and semantic labels.

## Technical shape

- Framework: Next-compatible vinext application with React and TypeScript
- Hosting: Cloudflare Worker named `perfect-prairie`
- Production routes: `perfectprairie.com/*` and `www.perfectprairie.com/*`
- Contact endpoint: `app/api/inquiry/route.ts`
- Contact delivery: `CONTACT_WEBHOOK_URL` Cloudflare secret
- Intended delivery flow: site webhook → n8n → Gmail → `emmahowerter@gmail.com`

Do not commit the production webhook URL, tokens, OAuth credentials, or other secrets. The personal destination address is operational context; keep the public-facing contact address as `contact@perfectprairie.com` unless the user asks to change it.

No VPS is needed for the current scope. Prefer Cloudflare plus a small email automation over introducing a server to maintain.

## Working commands

```bash
npm run dev
npm run build
npm run lint
node --test tests/rendered-html.test.mjs
npm run deploy
```

Use Node.js 22.13 or newer. The current local environment may require the Homebrew Node path.

Before deploying:

1. Run the production build.
2. Run lint.
3. Run the rendered HTML test.
4. Search for forbidden drift: `Perfect Prairies`, third-person “Emma will” language, and Galena references.
5. Verify the contact-form delivery secret separately; a successful site deploy does not prove email delivery.

After deploying, verify both the Worker deployment and the public domain. Cloudflare Worker routes and DNS/Squarespace cutover are separate concerns, so inspect the current domain state rather than assuming it changed.

## Social campaign

The seven square launch posts live in `social/`. `scripts/generate-social-posts.py` regenerates deterministic typography, the campaign contact sheet, the Open Graph card, and the favicon.

When brand copy changes, update both the site metadata and relevant campaign assets. Do not regenerate or overwrite approved photography casually.

## Git and release hygiene

- Work from the existing repository and inspect `git status` before editing.
- Preserve unrelated user changes.
- Keep commits narrowly named and scoped.
- The owner prefers fast iteration on `main` for this launch, but never push unless the request authorizes publishing.
- A Cloudflare deploy and a GitHub push are distinct actions; report each accurately.

## Definition of done

A Perfect Prairie change is complete when it is ecologically honest, sounds like **we**, preserves the three-service model, respects image provenance, works responsively, passes the relevant checks, and makes the possibility of more habitat feel real.
