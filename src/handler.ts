import { GraphQLSchema } from "graphql";
import { publish } from "./pubsub/publish";

interface Options<Env, T> {
  fetch: T;
  schema: GraphQLSchema;
  getWSConnectionDO: (env: Env) => DurableObjectNamespace;
  getSubscriptionsDB: (env: Env) => D1Database;
  publishPathName: string;
  wsConnectPathName: string;
}
export function handleSubscriptions<
  Env extends {} = {},
  T extends ExportedHandlerFetchHandler<Env> = any
>({
  fetch,
  schema,
  getWSConnectionDO,
  getSubscriptionsDB,
  isAuthorized,
  createContext = (request, env, executionCtx, requestBody) => ({
    env,
    executionCtx,
  }),
  publishPathName = "/publish",
  wsConnectPathName = "/graphql",
}: {
  fetch?: T;
  schema: GraphQLSchema;
  getWSConnectionDO: (env: Env) => DurableObjectNamespace;
  getSubscriptionsDB: (env: Env) => D1Database;
  isAuthorized?: (
    request: Request,
    env: Env,
    executionCtx: ExecutionContext
  ) => boolean | Promise<boolean>;
  createContext?: (
    request: Request,
    env: Env,
    executionCtx: ExecutionContext,
    requestBody: any
  ) => any;
  publishPathName?: string;
  wsConnectPathName?: string;
}): T {
  const wrappedFetch = (async (request, env, executionCtx) => {
    const authorized =
      typeof isAuthorized === "function"
        ? await isAuthorized(request.clone(), env, executionCtx)
        : true;
    if (!authorized) return new Response("unauthorized", { status: 400 });

    const WS_CONNECTION = getWSConnectionDO(env);
    const SUBSCRIPTIONS_DB = getSubscriptionsDB(env);

    const upgradeHeader = request.headers.get("Upgrade");
    const path = new URL(request.url).pathname;

    if (path === publishPathName && request.method === "POST") {
      const reqBody: { topic: string; payload?: any } = await request.json();
      if (!reqBody.topic)
        return new Response("missing_topic_from_request", { status: 400 });
      const p = publish(
        WS_CONNECTION,
        SUBSCRIPTIONS_DB,
        schema,
        createContext(request, env, executionCtx, reqBody)
      );
      executionCtx.waitUntil(p(reqBody));

      return new Response("ok");
    } else if (path === wsConnectPathName && upgradeHeader === "websocket") {
      const subId = WS_CONNECTION.newUniqueId();
      const stub = WS_CONNECTION.get(subId);
      return stub.fetch("https://websocket.io/connect", request);
    }

    if (typeof fetch === "function") {
      return await fetch(request, env, executionCtx);
    }
    return new Response("not_found", { status: 404 });
  }) as T;
  return wrappedFetch;
}
