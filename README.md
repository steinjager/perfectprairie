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

The Cloudflare routes are configured for `perfectprairie.com` and `www.perfectprairie.com`. Contact-form delivery uses the `CONTACT_WEBHOOK_URL` Worker secret.
