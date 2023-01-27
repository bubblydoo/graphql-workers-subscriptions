import { makeExecutableSchema } from "@graphql-tools/schema";
import { createYoga } from "graphql-yoga";
import {
  handleSubscriptions,
  createWsConnectionClass,
  subscribe,
  DefaultPublishableContext,
  createDefaultPublishableContext,
} from "graphql-workers-subscriptions";

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
      ping: () => "pong",
    },
    Mutation: {
      greet: async (root, args, context) => {
        context.publish("GREETINGS", {
          greetings: { greeting: args.greeting },
        });
        return "ok";
      },
    },
    Subscription: {
      greetings: {
        subscribe: subscribe("GREETINGS", {
          filter: (root, args) => {
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

const yoga = createYoga<DefaultPublishableContext<ENV>>({
  schema,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
    defaultQuery: /* GraphQL */ `
      mutation Say {
        greet(greeting: "hi!")
      }

      subscription Listen {
        greetings {
          greeting
        }
      }

      subscription ListenToHi {
        greetings(greeting: "hi!") {
          greeting
        }
      }
    `,
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
});

export default { fetch };

export const WsConnection = createWsConnectionClass({
  ...settings,
  onConnect(ctx) {
    // place for ws authenticaton, init payload can be validated
    console.log("init payload:", ctx.connectionParams);

    return true;
  },
});
