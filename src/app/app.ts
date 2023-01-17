import { createYoga } from "graphql-yoga";
import { handleSubscriptions } from "..";
import { createWsConnectionClass } from "..";
import { schema } from "./graphql/schema";

export interface ENV {
  WS_CONNECTION: DurableObjectNamespace;
  SUBSCRIPTIONS_DEV: D1Database;
}

const yoga = createYoga({
  schema,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
  },
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
