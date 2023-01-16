import { Subscription } from "@/models/subscription";
import { getFilteredSubs } from "@/utils/getFilteredSubs";
import { GraphQLSchema, parse, execute } from "graphql";
import { MessageType, NextMessage } from "graphql-ws";
import { ENV } from "..";

export const publish =
  (env: ENV, schema: GraphQLSchema) => async (event: any) => {
    const subscriptions: Subscription[] = await getFilteredSubs(env, event);

    // promises of sent subscription messages
    const iters = subscriptions.map(async (sub) => {
      // execution of subscription with payload as the root (can be modified within the resolve callback defined in schema)
      // will return the payload as is by default
      const payload = await execute({
        schema: schema,
        document: parse(sub.subscription.query),
        rootValue: event.payload,
        // contextValue: await buildContext({
        //   server,
        //   connectionInitPayload: sub.connectionInitPayload,
        //   connectionId: sub.connectionId,
        // }),
        variableValues: sub.subscription.variables,
        operationName: sub.subscription.operationName,
      });

      // transform it into ws message (id is not specific to connection but to subscription)
      const message: NextMessage = {
        id: sub.id,
        type: MessageType.Next,
        payload,
      };
      // request to already existing DO
      const DOId = env.WS_CONNECTION.idFromString(sub.connectionId);
      const DO = env.WS_CONNECTION.get(DOId);
      DO.fetch("https://websocket.io/publish", {
        method: "POST",
        body: JSON.stringify(message),
      });
    });
    await Promise.all(iters);
  };
