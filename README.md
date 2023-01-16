# Cloudflare graphql subscription worker

It uses `DurableObjects` to establish ws-connection, and saves each subscription and their relevant fields in a `D1Database` row. Implements the `graphql-ws` protocol.

### Prequisities:

- existing `DurableObject` and `D1Database` namespace.
- `D1` migrations need to be run in advance

### Quickstart:

```shell
npm i
# wrangler auth is required

# create DB in your account, DB_NAME is SUBSCRIPTIONS_DEV in this case
npx wrangler d1 create <DB_NAME>
# id needs to be updated in wrangler.toml (wrangler dev uses the db with id of the preview_id)
npx wrangler migrations apply <DB_NAME>

# to run
npx wrangler dev
```
