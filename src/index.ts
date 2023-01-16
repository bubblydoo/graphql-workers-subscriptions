import { handleProtocols, MessageType } from "graphql-ws";
import { createYoga, createSchema } from "graphql-yoga";
import { useWebsocket } from "./useWebsocket";
import { D1Database } from "./utils/D1Database";
import { publish } from "./pubsub/publish";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./graphql/typeDefs";
import { resolvers } from "./graphql/resolvers";
export interface ENV {
  WS_CONNECTION: DurableObjectNamespace;
  SUBSCRIPTIONS_DEV: D1Database;
}

const schema = makeExecutableSchema({ typeDefs, resolvers });
const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
  },
});
export default {
  async fetch(request, env, context) {
    // const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");
    const path = new URL(request.url).pathname;

    // non ws requests
    if (upgradeHeader !== "websocket") {
      if (path === "/api") {
        const query = env.SUBSCRIPTIONS_DEV.prepare(
          `SELECT * FROM Subscriptions`
        );
        const result = await query.all();
        return new Response(JSON.stringify(result.results));
      } else if (path === "/publish") {
        const p = publish(env, schema);
        context.waitUntil(p(await request.json()));
        return new Response("ok");
      }

      return yoga.fetch(request, env, context);
    }

    // ws request forwarded to a durable object
    const subId = env.WS_CONNECTION.newUniqueId();
    const stub = env.WS_CONNECTION.get(subId);
    return await stub.fetch("https://websocket.io/connect", request.clone());
  },
} as ExportedHandler<ENV>;

export class WsConnection implements DurableObject {
  private server: WebSocket | undefined;
  constructor(private state: DurableObjectState, private env: ENV) {
    // if there is a D1Database prefix, assign it to the original key too
    const defaultToD1BetaPrefix = (namespace: keyof ENV) => {
      const d1BetaPrefix = "__D1_BETA__";
      return env[namespace] || (env as any)[d1BetaPrefix + namespace].prepare
        ? (env as any)[d1BetaPrefix + namespace]
        : new D1Database((env as any)[d1BetaPrefix + namespace]);
    };

    this.state = state;
    this.env = {
      ...env,
      SUBSCRIPTIONS_DEV: defaultToD1BetaPrefix(
        "SUBSCRIPTIONS_DEV"
      ) as D1Database,
    };
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
          this.env,
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
}
