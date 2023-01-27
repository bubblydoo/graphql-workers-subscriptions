import { GraphQLSchema } from "graphql";
import { handleProtocols } from "graphql-ws";
import { fixD1BetaEnv } from "./fixD1BetaEnv";
import { createDefaultPublishableContext } from "./publishableContext";
import { CreateContextFn } from "./types";
import { useWebsocket } from "./useWebsocket";
import type { WebSocket, MessageEvent } from "@cloudflare/workers-types";

type ConstructableDurableObject<Env> = {
  new (state: DurableObjectState, env: Env): DurableObject;
};

/** Creates a WsConnection DurableObject class */
export function createWsConnectionClass<Env extends {} = {}>(
  {
    schema,
    subscriptionsDb,
    wsConnection,
    context = (req, env) =>
      createDefaultPublishableContext<Env, undefined>({
        env,
        executionCtx: undefined,
        subscriptionsDb,
        wsConnection,
        schema,
      }),
    onConnect,
  }: {
    schema: GraphQLSchema,
    subscriptionsDb: (env: Env) => D1Database,
    wsConnection: (env: Env) => DurableObjectNamespace,
    context?: CreateContextFn<Env, ExecutionContext | undefined>,
    onConnect?: (ctx: any) => void,
}): ConstructableDurableObject<Env> {
  return class WsConnection implements DurableObject {
    private server: WebSocket | undefined;
    private env: Env;
    constructor(private state: DurableObjectState, env: Env) {
      this.env = fixD1BetaEnv(env);
    }
    async fetch(request: Request) {
      const path = new URL(request.url).pathname;
      // DO router
      switch (path) {
        // connection will be established here
        case "/connect":
          // creating ws pair (we use server to send to the client and we return the client in the response)
          const [client, server] = Object.values(new WebSocketPair()) as any[];
          this.server = server;
          const protocol = handleProtocols(
            request.headers.get("Sec-WebSocket-Protocol")!
          );

          await useWebsocket<Env>(
            server,
            request,
            protocol,
            schema,
            subscriptionsDb(this.env),
            this.state,
            this.env,
            context,
            onConnect
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
        case "/close":
          // delete from D1 handled internally
          this.server?.close();
        case "/publish":
          // POST request with topic and payload transformed into a ws message via the publish handler
          const req = await request.text();
          this.server?.send(req);
          return new Response("ok");
        default:
          throw new Error("bad_request");
      }
    }
  };
}
