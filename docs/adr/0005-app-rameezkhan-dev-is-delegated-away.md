# The `app.` subdomain is delegated away from Cloudflare

`app.rameezkhan.dev` carries four `NS` records pointing at NS1, the DNS provider
behind the operator's Netlify sites. That is a zone cut, not a misconfiguration:
Cloudflare answers for `rameezkhan.dev` but is not authoritative for any name
beneath `app.`, so nothing configured in Cloudflare - a custom domain, a proxied
record, a certificate validation - can ever make a hostname under `app.` work.
This is invisible from the code and from the Workers dashboard, which will accept
such a custom domain and simply never serve it.

ADR-0004 originally named `wheel-of-meals.app.rameezkhan.dev`, which is why that
hostname never resolved. It has been corrected there to
`wheel-of-meals.rameezkhan.dev`, directly on the zone Cloudflare answers for.

The alternative was to reclaim `app.` for Cloudflare: drop the `NS` delegation
and recreate each Netlify site as a `CNAME` inside the Cloudflare zone, which is
a documented Netlify setup and would be the tidier end state, leaving ADR-0004
untouched. It was rejected because of what it puts at risk. Moving this app is a
zero-risk change to an app with no users; reclaiming the delegation is a
non-zero-risk DNS change across many live Netlify sites that carry real traffic.
The fix belongs on the broken side of the fence. That reasoning is about the
Netlify sites, not about `app.` itself - if they ever move off it, reclaiming the
delegation is open again.

## Consequences

While the delegation stands, nothing may be served from beneath
`app.rameezkhan.dev` by this project. Any hostname it uses must sit directly on
`rameezkhan.dev`.

ADR-0004's obligation to keep a retired hostname serving redirects indefinitely
was waived for `wheel-of-meals.app.rameezkhan.dev`. That obligation exists to
protect users holding links, and there were none: the hostname returned
`NXDOMAIN` from the moment it was configured, so no [[Household]] was ever
created through it and no link to it can exist. The obligation was also
unsatisfiable - serving a redirect from beneath the delegation is precisely what
Cloudflare cannot do.

This was the correction of a hostname that was never live, not a hostname change.
It is explicitly not a precedent. A hostname that real [[Household]]s hold still
falls under ADR-0004 in full, and retiring one without redirects destroys their
access to their data.
