import { GraphQLSchema } from "graphql";
import { createPublishFn } from "./createPublishFn";
import { createDefaultPublishableContext } from "./publishableContext";

export function handleSubscriptions<
  Env extends {} = {},
  T extends ExportedHandlerFetchHandler<Env> = any
>({
  fetch,
  schema,
  wsConnection,
  subscriptionsDb,
  isAuthorized,
  context: createContext = (request, env, executionCtx, requestBody) =>
    createDefaultPublishableContext({
      env,
      executionCtx,
      schema,
      wsConnection,
      subscriptionsDb,
    }),
  publishPathName = () => "/publish",
  wsConnectPathName = () => "/graphql",
}: {
  fetch?: T;
  schema: GraphQLSchema;
  wsConnection: (env: Env) => DurableObjectNamespace;
  subscriptionsDb: (env: Env) => D1Database;
  isAuthorized?: (
    request: Request,
    env: Env,
    executionCtx: ExecutionContext
  ) => boolean | Promise<boolean>;
  context?: (
    request: Request,
    env: Env,
    executionCtx: ExecutionContext,
    requestBody: any
  ) => any;
  publishPathName?: (
    request: Request,
    env: Env,
    executionCtx: ExecutionContext
  ) => string;
  wsConnectPathName?: (
    request: Request,
    env: Env,
    executionCtx: ExecutionContext
  ) => string;
}): T {
  const wrappedFetch = (async (request, env, executionCtx) => {
    const authorized =
      typeof isAuthorized === "function"
        ? await isAuthorized(request.clone(), env, executionCtx)
        : true;
    if (!authorized) return new Response("unauthorized", { status: 400 });

    const WS_CONNECTION = wsConnection(env);
    const SUBSCRIPTIONS_DB = subscriptionsDb(env);

    const upgradeHeader = request.headers.get("Upgrade");
    const path = new URL(request.url).pathname;

    if (
      path === publishPathName(request, env, executionCtx) &&
      request.method === "POST"
    ) {
      const reqBody: { topic: string; payload?: any } = await request.json();
      if (!reqBody.topic)
        return new Response("missing_topic_from_request", { status: 400 });
      const publish = createPublishFn(
        WS_CONNECTION,
        SUBSCRIPTIONS_DB,
        schema,
        createContext(request, env, executionCtx, reqBody)
      );
      executionCtx.waitUntil(publish(reqBody));

      return new Response("ok");
    } else if (
      path === wsConnectPathName(request, env, executionCtx) &&
      upgradeHeader === "websocket"
    ) {
      const stubId = WS_CONNECTION.newUniqueId();
      const stub = WS_CONNECTION.get(stubId);
      return stub.fetch(
        "https://ws-connection-durable-object.internal/connect",
        request
      );
    }

    if (typeof fetch === "function") {
      return await fetch(request, env, executionCtx);
    }
    return new Response("not_found", { status: 404 });
  }) as T;
  return wrappedFetch;
}
