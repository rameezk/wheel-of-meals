# wheel-of-meals

> Randomise your meals for the week

Live at [wheel-of-meals.rameezkhan.dev](https://wheel-of-meals.rameezkhan.dev).

A Vite + React SPA and a Hono API, served by a single Cloudflare Worker. See
[`docs/design.md`](docs/design.md) for the design, [`CONTEXT.md`](CONTEXT.md) for
the domain language, and [`docs/adr/`](docs/adr/) for the decisions.

## Running it

Requires Node 24 (see `.nvmrc`) and [ShellCheck](https://www.shellcheck.net/),
which `npm run lint` uses on the scripts under `scripts/`.

```sh
npm install
npm run dev          # Vite dev server, proxying /api to wrangler
npm run dev:worker   # the Worker, in another terminal
npm run preview      # production build, served by the Worker as it ships
```

## Checks

```sh
npm run lint         # eslint + prettier + shellcheck
npm run typecheck    # wrangler types + tsc
npm test             # vitest: client (jsdom) and worker (workers runtime)
npm run test:e2e     # playwright against a local production build
```

`npm run test:e2e` builds and boots the Worker itself. Set `BASE_URL` to point it
at a deployed environment instead.

## The database

D1, bound as `DB`. Schema changes are migrations under `migrations/`, applied to
production by `npm run deploy` and never by hand. Locally they are applied by
`npm run db:migrate:local`, which `npm run dev:worker` and `npm run test:e2e`
both do for you; the worker test suite applies them into an in-memory database
itself.

The database is created once, outside the repo:

```sh
wrangler d1 create wheel-of-meals
```

and the `database_id` it prints goes into `wrangler.jsonc`. It is an identifier,
not a secret.

## Deploying

GitHub Actions deploys `main` to production once every check passes, then reruns
the end-to-end suite against the live hostname. It needs two repository secrets:

- `CLOUDFLARE_API_TOKEN` - scoped to edit Workers and D1 on the `rameezkhan.dev`
  account
- `CLOUDFLARE_ACCOUNT_ID`

The hostname is permanent (ADR-0004) and every page is `noindex` because the URL
is the only credential (ADR-0002).
