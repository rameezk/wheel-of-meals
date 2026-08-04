# The hostname is permanent

The app is served from `wheel-of-meals.app.rameezkhan.dev`, a Cloudflare Workers
custom domain on the existing `rameezkhan.dev` zone. This is recorded because it
is far harder to reverse than a hostname normally is.

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

The zone must stay on Cloudflare for the custom domain to keep working.

If the hostname ever must change, the old one has to keep serving redirects
indefinitely rather than being retired.
