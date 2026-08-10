# The Slug is the only credential, and there is no recovery

A [[Household]] is identified by a four-word, randomly generated, food-themed
[[Slug]]. Anyone holding the Slug can read and edit that Household; there are no
accounts, no passwords, and no email addresses. Losing the Slug means losing the
Household permanently, and we tell the user so at creation time.

This is deliberate, not an oversight. The users are a family sharing a link, and
every alternative costs more than it returns:

- **Accounts** would mean the people we most want to share with - a spouse, a
  parent - must sign up before they can see tonight's dinner.
- **A recovery email** would drag an email provider, deliverability, and a
  privacy surface into an app that otherwise holds no personal data at all.

The threat model is proportionate to the stakes. The four words are drawn from a
curated food wordlist of 124 words, and they are distinct: `takeOne` splices each
word out of a working copy, so no word can be drawn twice. The keyspace is
therefore a permutation of 124 rather than `124^4`:

    124 x 123 x 122 x 121 = 225,150,024

That is about 2.25 x 10^8, or 27.7 bits. Two hundred and twenty-five million
guesses against a handful of Households, for a list of dinner names, is not worth
anyone's time. Slugs are checked for collisions on generation.

The wordlist size is load-bearing for that figure, so growing or shrinking
`foodWords` moves the keyspace with it. Its length is also a hard floor: fewer
than four words and `takeOne` throws "The food wordlist ran dry".

## Consequences

There is no read-only sharing: showing someone the Household gives them edit
rights. A separate read-only Slug pointing at the same Household can be added
later without migration if that ever matters.

Household pages must never be indexed by search engines, since the URL is the
secret.

For the same reason, nothing may carry a Household's path off the origin. The
Slug travels in every URL, so a `Referer` header on a cross-origin request -
a link to a recipe site, an image, a script, an analytics beacon - hands that
site a working, permanent, unrevocable credential, and it lands in a request log
we cannot see or clear. The control is a `Referrer-Policy` of `same-origin`,
declared by the Worker on every response it serves: the app's own document, the
API, and error responses alike. Same-origin requests still send the full path, so
nothing about how the app navigates or calls its own API changes. Browsers do
default to `strict-origin-when-cross-origin`, which would very probably strip the
path, but a default is not a control - it is not ours to set, it is not stated
anywhere here, and it is not what a reader checks. A `rel="noreferrer"` on each
outbound link is not a control either: it is per-element, it covers only links a
developer remembered to mark, and it says nothing about images, scripts, or
anything else a page may fetch. The header is one declaration that covers the
whole surface and fails closed for code nobody has written yet.

Because loss is unrecoverable, the copy/export affordance doubles as the backup
story. A Household is a list of meal names - cheap to lose, cheap to retype.
