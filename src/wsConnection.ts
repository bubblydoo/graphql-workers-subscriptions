import { GraphQLSchema } from "graphql";
import { handleProtocols } from "graphql-ws";
import { useWebsocket } from "./useWebsocket";

export function createWsConnection(
  schema: GraphQLSchema,
  getSubscriptionsDB: (env: any) => D1Database = (env) =>
    env["SUBSCRIPTIONS_DB"]
) {
  return class WsConnection implements DurableObject {
    private server: WebSocket | undefined;
    // private SUBSCRIPTIONS_DB: D1Database | undefined;
    constructor(private state: DurableObjectState, private env: any) {
      // if there is a D1Database prefix, assign it to the original key too
      //   const defaultToD1BetaPrefix = (namespace: keyof ENV) => {
      //     const d1BetaPrefix = "__D1_BETA__";
      //     return env[namespace] || (env as any)[d1BetaPrefix + namespace].prepare
      //       ? (env as any)[d1BetaPrefix + namespace]
      //       : new D1Database((env as any)[d1BetaPrefix + namespace]);
      //   };
      const _env = { ...env };
      const prefix = "__D1_BETA__";
      for (const k in env) {
        if (k.startsWith(prefix)) {
          _env[k.slice(prefix.length)] = _env[k];
        }
      }
      this.env = _env;
      this.state = state;

      //   this.SUBSCRIPTIONS_DB = getSubscriptionsDB(_env);
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

          await useWebsocket(
            server,
            request,
            protocol,
            schema,
            getSubscriptionsDB(this.env),
            this.state
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
