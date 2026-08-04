# Cloudflare Workers and D1

This is a household-scale app - a few kilobytes per Household and single-digit
writes per week - that has to stay free and keep working untouched for years. We
deploy the static frontend and a small Hono API as a single Cloudflare Worker,
with D1 (SQLite) as the store, because Cloudflare's free tier has no idle
suspension and no card on file to lapse.

## Considered Options

- **Static host plus a backend-as-a-service** (e.g. Netlify or similar for the
  frontend, Supabase for data). Rejected on two counts. Free-tier projects
  typically pause after a period of inactivity, and a Household spins roughly
  once a week - idle is our normal state, so we would meet the cold path almost
  every time. More importantly, our access rule (possession of the [[Slug]]
  grants access - see ADR-0002) would have to be expressed as row-level security
  policies. That is a security-critical rule living in a policy DSL outside the
  type system, when it is three lines of ordinary TypeScript if we own the API.
- **Serverless functions plus hosted Postgres.** Two vendors to keep alive, and
  the same idle-suspension problem on free Postgres tiers.
- **A long-running server on a VPS.** Means owning OS patching indefinitely for a
  dinner app.

## Consequences

D1 is Cloudflare-specific, so this is real lock-in. It is unusually cheap lock-in
because D1 is SQLite: the data is portable and the query surface is standard.

Owning the API is what lets one set of TypeScript types describe the database
row, the HTTP response, and the React props.
