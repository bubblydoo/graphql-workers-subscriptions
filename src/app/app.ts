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
      hello: String
    }
    type Subscription {
      greetings(greeting: String): Greeting
    }
    type Mutation {
      greet(greeting: String): String
    }
  `,
  resolvers: {
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

const yoga = createYoga<ENV & ExecutionContext>({
  schema,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
  },
  context: (env) =>
    createDefaultPublishableContext({
      env,
      executionCtx: env,
      schema,
      getWSConnectionDO: (env) => env.WS_CONNECTION,
      getSubscriptionsDB: (env) => env.SUBSCRIPTIONS_DEV,
    }),
});

const fetch = handleSubscriptions<ENV>({
  fetch: yoga.fetch,
  schema,
  getWSConnectionDO: (env) => env.WS_CONNECTION,
  getSubscriptionsDB: (env) => env.SUBSCRIPTIONS_DEV,
});

export default { fetch };

export const WsConnection = createWsConnectionClass<ENV>(
  schema,
  (env) => env.SUBSCRIPTIONS_DEV
);
