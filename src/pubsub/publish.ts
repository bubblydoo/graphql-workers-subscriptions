import { Subscription } from "@/models/subscription";
import { getFilteredSubs } from "@/utils/getFilteredSubs";
import { GraphQLSchema, parse, execute } from "graphql";
import { MessageType, NextMessage } from "graphql-ws";
import { ENV } from "..";

export const publish =
  (env: ENV, schema: GraphQLSchema) => async (event: any) => {
    const subscriptions: Subscription[] = await getFilteredSubs(env, event);

    const iters = subscriptions.map(async (sub) => {
      const payload = await execute({
        schema: schema,
        document: parse(sub.subscription.query),
        // contextValue: await buildContext({
        //   server,
        //   connectionInitPayload: sub.connectionInitPayload,
        //   connectionId: sub.connectionId,
        // }),
        variableValues: sub.subscription.variables,
        operationName: sub.subscription.operationName,
      });
      debugger;

      const message: NextMessage = {
        id: sub.connectionId,
        type: MessageType.Next,
        payload,
      };

      const DOId = env.WS_CONNECTION.idFromString(sub.connectionId);
      const DO = env.WS_CONNECTION.get(DOId);
      DO.fetch("https://websocket.io/publish", {
        method: "POST",
        body: JSON.stringify({ data: message }),
      });

      // ((server)({
      // //   ...sub.requestContext,
      // //   message,
      // })
    });
    await Promise.all(iters);
  };
