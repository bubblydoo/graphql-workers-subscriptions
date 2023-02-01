# Cloudflare Workers Topic-based GraphQL Subscriptions

This library uses Cloudflare Workers, Durable Objects and D1 to provide powerful topic-based GraphQL subscriptions.

Features:

- 👀 Easy to integrate with your existing GraphQL stack
- 🙌 Almost no setup
- 🔍 In-database JSON filtering
- 🗺 Publish from anywhere
- 🎹 Great typings
- 🔐 Authentication

```ts
// app.ts
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createYoga } from "graphql-yoga";
import {
  handleSubscriptions,
  createWsConnectionClass,
  subscribe,
  DefaultPublishableContext,
  createDefaultPublishableContext,
} from "graphql-worker-subscriptions";

export interface ENV {
  WS_CONNECTION: DurableObjectNamespace;
  SUBSCRIPTIONS: D1Database;
}

export const schema = makeExecutableSchema<DefaultPublishableContext<ENV>>({
  typeDefs: /* GraphQL */ `
    type Greeting {
      greeting: String
    }
    type Query {
      ping: String
    }
    type Subscription {
      greetings(greeting: String): Greeting
    }
    type Mutation {
      greet(greeting: String!): String
    }
  `,
  resolvers: {
    Query: {
      ping: () => "pong",
    },
    Mutation: {
      greet: async (root, args, context, info) => {
        context.publish("GREETINGS", {
          greetings: { greeting: args.greeting },
        });
        return "ok";
      },
    },
    Subscription: {
      greetings: {
        subscribe: subscribe("GREETINGS", {
          filter: (root, args, context, info) => {
            return args.greeting
              ? { greetings: { greeting: args.greeting } }
              : {};
          },
        }),
      },
    },
  },
});

const settings = {
  schema,
  wsConnection: (env: ENV) => env.WS_CONNECTION,
  subscriptionsDb: (env: ENV) => env.SUBSCRIPTIONS,
};

const yoga = createYoga<DefaultPublishableContext<ENV>>({
  schema,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
  },
});

const baseFetch: ExportedHandlerFetchHandler<ENV> = (
  request,
  env,
  executionCtx
) =>
  yoga.handleRequest(
    request,
    createDefaultPublishableContext({
      env,
      executionCtx,
      ...settings,
    })
  );

const fetch = handleSubscriptions({
  fetch: baseFetch,
  ...settings,
  isAuthorized(req, env, exectutionCtx) {
    // authentication runs before everything else
    //  websocket authentication is handled elsewhere since custom headers are not allowed
    const isWebsocket = req.headers.get("Upgrade") === "websocket";
    return isWebsocket || true // false will return 404 response 
  },
});

export default { fetch };

export const WsConnection = createWsConnectionClass({
  ...settings,
  onConnect(ctx) {
    // your custom ws authentication
    // {req, env, socket} are available on ctx.extra
    // connect init payload available at ctx.connectionParams
    return true; // or undefined to allow connection
  },
});
```

```toml
# wrangler.toml
[[migrations]]
new_classes = ["WsConnection"]
tag = "v1"

[build]
# your build script
command = 'npm run build'

[[d1_databases]]
binding = "SUBSCRIPTIONS"
database_id = "877f1123-088e-43ed-8d4d-37e71c77157c"
database_name = "SUBSCRIPTIONS"
migrations_dir = "node_modules/graphql-worker-subscriptions/migrations"
preview_database_id = "877f1123-088e-43ed-8d4d-37e71c77157c"

[durable_objects]
bindings = [{name = "WS_CONNECTION", class_name = "WsConnection"}]
```

### Deployment

```shell
# create db
wrangler d1 create SUBSCRIPTIONS
# apply migrations
wrangler d1 migrations apply SUBSCRIPTIONS
# publish
wrangler publish
```

### Local development

```shell
# create db
wrangler d1 create SUBSCRIPTIONS --local
# apply migrations
wrangler d1 migrations apply SUBSCRIPTIONS --local
# publish
wrangler dev
```

### Publishing from outside Cloudflare

You can use `POST /publish` on your Worker to publish events.

```shell
curl -X POST https://graphql-worker-subscriptions.bubblydoo.workers.dev/publish -H 'Content-Type: application/json' -d '{"topic": "GREETINGS", "payload":{"greetings": {"greeting": "hi!"}}}'
```

To disable this, pass `isAuthorized: () => false` to `handleSubscriptions`, or add custom authorization logic there.

### Internal details

Subscriptions are stored inside D1.

The D1 database has 5 columns:

- id (websocket message id that will be matched with the client-side subscription, a string)
- connectionId (a Durable Object id, a string)
- subscription (the query the subscriber has requested, a JSON string)
- topic (a string)
- filter (the filter against which payloads are checked, a JSON string or null)

The Durable Object has a reference to the WebSocket, which can then be used to publish data to.

Filters are compared in-database using:

```sql
SELECT * FROM Subscriptions WHERE topic = ?1 AND (filter is null OR json_patch(?2, filter) = ?2);
```

with `?1: topic and ?2: payload`.

### Contributing

Check out this repo, then run:

```shell
yarn

yarn build
```

Then link the package to your project (you can take the example as start).

### Bundling issue

Due to the dual package hazard in GraphQL (see [this issue](https://github.com/graphql/graphql-js/pull/3617)) you might get `duplicate "graphql" modules cannot be used at the same time` errors.

This is because both the CJS and ESM version of `graphql` are loaded.

In that case, you might have to bundle yourself. When using `esbuild`, the option `--resolve-extensions=.mts,.mjs,.ts,.js,.json` works. See the build-app script in package.json for an example.

### Credits 🙏

This project was inspired by [cloudflare-worker-graphql-ws-template](https://github.com/enisdenjo/cloudflare-worker-graphql-ws-template) and [subscriptionless](https://github.com/andyrichardson/subscriptionless).
