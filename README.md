# Perfect Prairie

The website for Perfect Prairie, a Central Illinois native-landscape business offering:

- on-site conservation consultations
- native landscape design and installation
- prairie and wildflower plot installation

The site runs on vinext and deploys to a Cloudflare Worker.

## Project context

- [`SOUL.md`](SOUL.md) captures Emma’s mission, worldview, public voice, and visual character.
- [`AGENTS.md`](AGENTS.md) contains the operating rules for future coding and content agents working in this repository.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run lint
```

## Deployment

```bash
npm run deploy
```

The Cloudflare routes are configured for `perfectprairie.com` and `www.perfectprairie.com`. Contact-form delivery uses the `CONTACT_WEBHOOK_URL` Worker secret. The webhook payload includes both a Gmail-ready `to` string and a `recipients` array addressed to `emmahowerter@gmail.com` and `contact@perfectprairie.com`.

## Field Office

The private operations app runs at `admin.perfectprairie.com`. Cloudflare Access authenticates approved email accounts before the request reaches the Worker, and the Worker independently verifies the Access JWT and email allowlist. The app stores clients, projects, estimates, invoices, and document counters in the `perfect-prairie-operations` D1 database.

Invoices and estimates support multiple itemized lines. Printed invoices include Perfect Prairie artwork and a clean, high-error-correction QR code that points directly to the Google Business Profile “Write a review” URL. The stable public route `https://www.perfectprairie.com/review` uses the same destination through `GOOGLE_REVIEW_URL`.

### Working in the Field Office

- Add a client, then a project. Edit buttons reopen every business field with Save/Cancel. Document numbers remain fixed for continuity.
- Enter internal unit costs on a new estimate. Its adjustable **30% markup on cost** applies to all items; $100 becomes $130. The preview and customer page show only final prices. Existing documents retain their original prices at 0% markup until edited.
- Use **Create invoice** on an estimate to copy its line items and markup into a new draft invoice.
- Choose **Add map** on a project. Allow device location, or use coordinates / Project location. Draw corners and finish an area, then name it, change its color, and drag its corners. Place and drag symbols or text. Save map & close stores the plan and displays its aerial preview.
- **Mapped** shows project pins. Each opens the saved editor. Area readings are estimates, not survey boundaries; imagery is historical, not live.
- **Enable customer link** makes the customer summary, map, and sent/accepted/declined estimates or sent/paid invoices available to anyone holding that link. Drafts, voided documents, internal costs, markup, client contact details, and field notes are excluded. No email is sent by changing a status. Copy the link to send it yourself, or include it through Preview / PDF. **Revoke** immediately disables the old link; enabling again generates a new one.
- Customer links and admin pages are no-store/noindex and omit advertising analytics. Only the public marketing homepage loads the Google tag.

The map uses Leaflet with USGS aerial imagery; it needs no API key or VPS. Plans are stored in D1, while preview images are rendered from the saved geometry and current imagery service. An internet connection is required; offline field work is not supported. Changes use revision checks so two open sessions cannot silently overwrite each other.

See [`docs/field-office-upgrade.md`](docs/field-office-upgrade.md) for the design intentions and release verification. `npm test` requires Node.js 22.13+ (the SQLite integration suite uses its built-in `node:sqlite`). Run `npx tsc --noEmit` for the separate type check. Wrangler reads the real local/production binding configuration from `wrangler.jsonc`; local migrations never change production.

Generate and apply schema changes with:

```bash
npm run db:generate
npx wrangler d1 migrations apply perfect-prairie-operations --local
npx wrangler d1 migrations apply perfect-prairie-operations --remote
```

Access configuration values live in `wrangler.jsonc`; secrets such as the contact webhook stay in Cloudflare and must not be committed. `GOOGLE_REVIEW_URL` is ordinary configuration rather than a secret, but the production value should still be verified independently before deployment.
