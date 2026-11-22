# Email inbox worker

This worker is separate from the site and from the other directories. It writes only to `inbox_messages` in the church-directory D1 database.

Do not deploy it, and do not add an `addresses` field to `wrangler.jsonc`, until Brian approves email routing. Adding `addresses` and running `wrangler deploy` would create or take over a live routing rule.

When that is approved:

1. Apply the D1 migration to the remote database first, so `inbox_messages` exists.
2. Set `BACKUP_FORWARD_TO` with `wrangler secret put` only if a copy should be forwarded. Leave it unset to store mail without forwarding.
3. Turn on the Email Routing rule in the dashboard for the address Brian chooses. The staged note is `email-routing.rule.json`.
4. Deploy this worker from `workers/email-inbox` with `npx wrangler deploy`.

The worker does not send mail and does not edit church listings.
