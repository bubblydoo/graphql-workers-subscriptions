import { GraphQLSchema } from "graphql";
import { handleProtocols } from "graphql-ws";
import { fixD1BetaEnv } from "./fixD1BetaEnv";
import { createDefaultPublishableContext } from "./publishableContext";
import { CreateContextFn } from "./types";
import { useWebsocket } from "./useWebsocket";

type ConstructableDurableObject<Env> = {
  new (state: DurableObjectState, env: Env): DurableObject;
};

/** Creates a WsConnection DurableObject class */
export function createWsConnectionPoolClass<Env extends {} = {}>({
  schema,
  subscriptionsDb,
  wsConnectionPool,
  context = (req, env) =>
    createDefaultPublishableContext<Env, undefined>({
      env,
      executionCtx: undefined,
      subscriptionsDb,
      wsConnectionPool,
      schema,
    }),
}: {
  schema: GraphQLSchema;
  subscriptionsDb: (env: Env) => D1Database;
  wsConnectionPool: (env: Env) => DurableObjectNamespace;
  context?: CreateContextFn<Env, ExecutionContext | undefined>;
}): ConstructableDurableObject<Env> {
  return class WsConnectionPool implements DurableObject {
    private connections = new Map<string, WebSocket>();
    private env: Env;
    constructor(private state: DurableObjectState, env: Env) {
      this.env = fixD1BetaEnv(env);
    }
    async fetch(request: Request) {
      const path = new URL(request.url).pathname.slice(1);
      const [action, connectionId] = path.split("/");
      const connectionPoolId = this.state.id.toString();

      // DO router
      switch (action) {
        // connection will be established here
        case "connect": {
          // creating ws pair (we use server to send to the client and we return the client in the response)
          const [client, connection] = Object.values(
            new WebSocketPair()
          ) as any[];
          this.connections.set(connectionId, connection);
          const protocol = handleProtocols(
            request.headers.get("Sec-WebSocket-Protocol")!
          );

          await useWebsocket<Env>(
            connection,
            request,
            protocol,
            schema,
            subscriptionsDb(this.env),
            connectionPoolId,
            this.env,
            context,
            connectionId
          );
          return new Response(null, {
            status: 101,
            webSocket: client,
            headers: protocol
              ? {
                  // As per the WS spec, if the server does not accept any subprotocol - it should omit this header.
                  // Beware that doing so will have Chrome abruptly close the WebSocket connection with a 1006 code.
                  "Sec-WebSocket-Protocol": protocol,
                }
              : {},
          });
        }
        case "close": {
          // delete from D1 handled internally
          const connection = this.connections.get(connectionId);
          if (!connection)
            throw new Error(
              `Connection not found in: ${connectionId} in ${connectionPoolId}`
            );
          return new Response("ok");
        }
        case "publish": {
          // POST request with topic and payload transformed into a ws message via the publish handler
          const req = await request.text();
          const connection = this.connections.get(connectionId);
          if (!connection)
            throw new Error(
              `Connection not found in: ${connectionId} in ${connectionPoolId}`
            );
          connection.send(req);
          return new Response("ok");
        }
        default:
          throw new Error("bad_request");
      }
    }
  };
}
