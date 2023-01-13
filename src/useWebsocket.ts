import {
  handleProtocols,
  makeServer,
  MessageType,
  stringifyMessage,
} from "graphql-ws";
import { GraphQLSchema } from "graphql";
import type { WebSocket } from "@cloudflare/workers-types";
import { ENV } from ".";
import { subscribe } from "./pubsub/subscribe";

// use cloudflare server websocket for graphql-ws
export async function useWebsocket(
  socket: WebSocket,
  request: Request,
  protocol: ReturnType<typeof handleProtocols>,
  schema: GraphQLSchema,
  env: ENV,
  state: DurableObjectState
) {
  // configure and make server
  const server = makeServer({
    schema,
  });

  // accept socket to begin
  socket.accept();

  // subprotocol pinger because WS level ping/pongs are not be available
  let pinger: any, pongWait: any;
  const connectionId = state.id.toString();
  function ping() {
    if (socket.readyState === 1) {
      // READY_STATE_OPEN value
      // send the subprotocol level ping message
      socket.send(stringifyMessage({ type: MessageType.Ping }));

      // wait for the pong for 6 seconds and then terminate
      pongWait = setTimeout(() => {
        clearInterval(pinger);
        socket.close();
      }, 6000);
    }
  }

  // ping the client on an interval every 12 seconds
  pinger = setInterval(() => ping(), 12000);
  if (!protocol) {
    throw new Error("invalid_ws_protocol");
  }
  // use the server
  const callOnClosed = server.opened(
    {
      protocol, // will be validated
      send: (data) => {
        console.log("send", data);

        socket.send(data);
      },
      close: (code, reason) => {
        console.log(code);

        if (code === 4400) console.error(reason);
        socket.close(code, reason);
      },
      onMessage: (cb) =>
        socket.addEventListener("message", async (event) => {
          try {
            // wait for the the operation to complete
            // - if init message, waits for connect
            // - if query/mutation, waits for result
            // - if subscription, waits for complete

            //TODO: if subscription write to D1 and do not call the callback!
            // FIXME: should be checked wether it is an array buffer
            console.log(event.data);

            const data = JSON.parse(event.data.valueOf() as any);
            if (data.type === "subscribe") {
              subscribe(connectionId, schema, data, state, env);
            } else {
              console.log(data.payload);

              cb(JSON.stringify(data));
            }
            // if ((event.data.valueOf() as string) === "subscribe") {
            // }
          } catch (err) {
            console.error(err);
            // all errors that could be thrown during the
            // execution of operations will be caught here
            //TODO: delete from D1 (need the subscription ID)
            //need: connection ID, topic, filter (null for now)
            socket.close(1011, (err as any).message);
          }
        }),
      // pong received, clear termination timeout
      onPong: () => clearTimeout(pongWait),
    },
    // pass values to the `extra` field in the context
    { socket, request }
  );

  // notify server that the socket closed and stop the pinger
  socket.addEventListener("close", ((code: number, reason: any) => {
    clearTimeout(pongWait);
    clearInterval(pinger);

    state.waitUntil(
      env.SUBSCRIPTIONS_DEV.prepare(
        "DELETE FROM Subscriptions WHERE connectionId = ? ;"
      )
        .bind(connectionId)
        .run()
        .then()
    );
    callOnClosed(code, reason);
  }) as any);
}
