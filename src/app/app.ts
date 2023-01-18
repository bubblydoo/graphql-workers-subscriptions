import { makeExecutableSchema } from "@graphql-tools/schema";
import { createYoga } from "graphql-yoga";
import {
  handleSubscriptions,
  createWsConnectionClass,
  subscribe,
  DefaultPublishableContext,
  createDefaultPublishableContext,
} from "..";

export interface ENV {
  WS_CONNECTION: DurableObjectNamespace;
  SUBSCRIPTIONS_DEV: D1Database;
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
      greet(greeting: String): String
    }
  `,
  resolvers: {
    Query: {
      ping: () => "pong"
    },
    Mutation: {
      greet: async (root, args, context) => {
        console.log("publishing");

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
  subscriptionsDb: (env: ENV) => env.SUBSCRIPTIONS_DEV,
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
