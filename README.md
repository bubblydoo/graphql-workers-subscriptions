# Cloudflare Workers Topic-based GraphQL Subscriptions

This library uses Cloudflare Workers, Durable Objects and D1 to provide powerful topic-based GraphQL subscriptions.

Features:
- 👀 Easy to integrate with your existing GraphQL stack
- 🙌 Almost no setup
- 🔍 In-database JSON filtering
- 🗺 Publish from anywhere
- 🎹 Great typings

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
      ping: () => "pong"
    },
    Mutation: {
      greet: async (root, args, context, info) => {
        await context.publish("GREETINGS", {
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

const yoga = createYoga<ENV & ExecutionContext>({
  schema,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
  },
  context: ({ waitUntil, passThroughOnException, ...env }) =>
    createDefaultPublishableContext({
      env,
      executionCtx: { waitUntil, passThroughOnException },
      ...settings,
    }),
});

const fetch = handleSubscriptions({ fetch: yoga.fetch, ...settings });

export default { fetch };

export const WsConnection = createWsConnectionClass(settings);
```

```toml
# wrangler.toml
[[migrations]]
new_classes = ["WsConnection"]
tag = "v1"

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

### Contributing

Check out this repo, then run:

```shell
yarn
yarn build-app --watch
# in another terminal
wrangler dev
```

Finally, run:

```
yarn build
```

### Bundling issue

Due to the dual package hazard in GraphQL (see [this issue](https://github.com/graphql/graphql-js/pull/3617)) you might get `duplicate "graphql" modules cannot be used at the same time` errors.

This is because both the CJS and ESM version of `graphql` are loaded.

In that case, you might have to bundle yourself. When using `esbuild`, the option `--resolve-extensions=.mts,.mjs,.ts,.js,.json` works. See the build-app script in package.json for an example.