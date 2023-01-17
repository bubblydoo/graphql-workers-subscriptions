import { GraphQLSchema } from "graphql";
import { handleProtocols } from "graphql-ws";
import { SetGraphqlContextCallBack } from "./types";
import { useWebsocket } from "./useWebsocket";

export function createWsConnectionClass<Env extends {} = {}>(
  schema: GraphQLSchema,
  getSubscriptionsDB: (env: Env) => D1Database,
  setGraphqlContext?: SetGraphqlContextCallBack<Env>
): { new (state: DurableObjectState, env: Env): DurableObject } {
  return class WsConnection implements DurableObject {
    private server: WebSocket | undefined;
    constructor(private state: DurableObjectState, private env: Env) {
      const _env: any = { ...env };
      const prefix = "__D1_BETA__";
      for (const k in env) {
        if (k.startsWith(prefix)) {
          _env[k.slice(prefix.length)] = _env[k];
        }
      }
      this.env = _env as Env;
      this.state = state;
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
            getSubscriptionsDB(this.env),
            this.state,
            this.env,
            setGraphqlContext
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
