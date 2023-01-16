import { createYoga } from "graphql-yoga";
import { handleSubscriptions } from "./handler";
import { createWsConnection } from "./wsConnection";
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

const fetch = handleSubscriptions(
  yoga.fetch,
  schema,
  undefined,
  (env) => env.SUBSCRIPTIONS_DEV
);

export default { fetch };

export const WsConnection = createWsConnection(
  schema,
  (env) => env.SUBSCRIPTIONS_DEV
);
