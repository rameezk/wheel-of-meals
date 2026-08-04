# wheel-of-meals

> Randomise your meals for the week

Live at [wheel-of-meals.app.rameezkhan.dev](https://wheel-of-meals.app.rameezkhan.dev).

A Vite + React SPA and a Hono API, served by a single Cloudflare Worker. See
[`docs/design.md`](docs/design.md) for the design, [`CONTEXT.md`](CONTEXT.md) for
the domain language, and [`docs/adr/`](docs/adr/) for the decisions.

## Running it

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev          # Vite dev server, proxying /api to wrangler
npm run dev:worker   # the Worker, in another terminal
npm run preview      # production build, served by the Worker as it ships
```

## Checks

```sh
npm run lint         # eslint + prettier
npm run typecheck    # wrangler types + tsc
npm test             # vitest: client (jsdom) and worker (workers runtime)
npm run test:e2e     # playwright against a local production build
```

`npm run test:e2e` builds and boots the Worker itself. Set `BASE_URL` to point it
at a deployed environment instead.

## Deploying

GitHub Actions deploys `main` to production once every check passes. It needs two
repository secrets:

- `CLOUDFLARE_API_TOKEN` - scoped to edit Workers on the `rameezkhan.dev` account
- `CLOUDFLARE_ACCOUNT_ID`

The hostname is permanent (ADR-0004) and every page is `noindex` because the URL
is the only credential (ADR-0002).
