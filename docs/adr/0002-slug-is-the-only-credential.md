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

The threat model is proportionate to the stakes. Four words drawn from a curated
food wordlist give billions of combinations, which is far beyond what is worth
brute-forcing when the prize is a list of dinner names. Slugs are checked for
collisions on generation.

## Consequences

There is no read-only sharing: showing someone the Household gives them edit
rights. A separate read-only Slug pointing at the same Household can be added
later without migration if that ever matters.

Household pages must never be indexed by search engines, since the URL is the
secret.

Because loss is unrecoverable, the copy/export affordance doubles as the backup
story. A Household is a list of meal names - cheap to lose, cheap to retype.
