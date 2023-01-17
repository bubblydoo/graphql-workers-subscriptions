import { GraphQLSchema } from "graphql";
import { publish } from "./pubsub/publish";

export function handleSubscriptions<
  Env extends {} = {},
  T extends ExportedHandlerFetchHandler<Env> = any
>(
  fetch: T,
  schema: GraphQLSchema,
  getWSConnectionDO: (env: Env) => DurableObjectNamespace,
  getSubscriptionsDB: (env: Env) => D1Database
): T {
  const wrappedFetch = (async (request, env, context) => {
    const WS_CONNECTION = getWSConnectionDO(env);
    const SUBSCRIPTIONS_DB = getSubscriptionsDB(env);

    const upgradeHeader = request.headers.get("Upgrade");
    const path = new URL(request.url).pathname;

    // non ws requests
    if (upgradeHeader !== "websocket") {
      if (path === "/api") {
        const query = SUBSCRIPTIONS_DB.prepare(`SELECT * FROM Subscriptions`);
        const result = await query.all();
        return new Response(JSON.stringify(result.results));
      } else if (path === "/publish") {
        const p = publish(WS_CONNECTION, SUBSCRIPTIONS_DB, schema);
        context.waitUntil(p(await request.json()));
        return new Response("ok");
      }

      return fetch(request, env, context);
    }
    // ws request forwarded to a durable object
    const subId = WS_CONNECTION.newUniqueId();
    const stub = WS_CONNECTION.get(subId);
    return stub.fetch("https://websocket.io/connect", request.clone());
  }) as T;
  return wrappedFetch;
}
