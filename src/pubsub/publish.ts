import { Subscription } from "@/models/subscription";
import { querySubscriptions } from "@/utils/query-helpers";
import { GraphQLSchema, parse, execute } from "graphql";
import { MessageType, NextMessage } from "graphql-ws";

export const publish =
  <Env extends {} = {}>(
    WS_CONNECTION: DurableObjectNamespace,
    SUBSCRIPTIONS_DB: D1Database,
    schema: GraphQLSchema,
    graphqlContext: any
  ) =>
  async (event: { topic: string; payload?: any }) => {
    const { results } = await querySubscriptions(
      SUBSCRIPTIONS_DB,
      "Subscriptions",
      event.topic,
      event.payload
    );

    const subscriptions = results?.map((res: any) => ({
      ...res,
      filter:
        typeof res.filter === "string" ? JSON.parse(res.filter) : undefined,
      subscription:
        typeof res.subscription === "string"
          ? JSON.parse(res.subscription)
          : undefined,
    })) as Subscription[];

    // promises of sent subscription messages
    const iters = subscriptions.map(async (sub) => {
      // execution of subscription with payload as the root (can be modified within the resolve callback defined in schema)
      // will return the payload as is by default
      const payload = await execute({
        schema: schema,
        document: parse(sub.subscription.query),
        rootValue: event.payload,
        contextValue: graphqlContext,
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
      const DOId = WS_CONNECTION.idFromString(sub.connectionId);
      const DO = WS_CONNECTION.get(DOId);
      DO.fetch("https://websocket.io/publish", {
        method: "POST",
        body: JSON.stringify(message),
      });
    });
    await Promise.all(iters);
  };
