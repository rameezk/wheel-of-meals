# The hostname is permanent

The app is served from `wheel-of-meals.rameezkhan.dev`, a Cloudflare Workers
custom domain on the existing `rameezkhan.dev` zone. This is recorded because it
is far harder to reverse than a hostname normally is.

The hostname sits directly on the `rameezkhan.dev` zone rather than under
`app.rameezkhan.dev`, which is NS-delegated away from Cloudflare and where a
custom domain can never be served. This ADR originally recorded
`wheel-of-meals.app.rameezkhan.dev`. That hostname never resolved and never
served a request, so no link to it ever existed and the redirect obligation
below was never incurred - correcting it here is safe in a way that changing a
live hostname would not be.

ADR-0002 makes the URL the only credential and provides no recovery path. A
[[Household]] therefore exists only as long as someone holds a working link.
Changing the hostname invalidates every bookmarked link at once, which does not
merely inconvenience users - it destroys their access to their data. The hostname
is effectively part of the persistence layer.

The alternative was the free `*.workers.dev` subdomain, which costs nothing and
needs no DNS. It was rejected precisely because it would have been a temporary
choice: moving off it later is trivial for the operator and catastrophic for
anyone holding a link.

## Consequences

The zone must stay on Cloudflare for the custom domain to keep working, and the
hostname must sit on a part of that zone Cloudflare is actually authoritative
for. A zone hosted at Cloudflare is not enough on its own. ADR-0005 records the
delegation this constraint came from.

If the hostname ever must change, the old one has to keep serving redirects
indefinitely rather than being retired.
