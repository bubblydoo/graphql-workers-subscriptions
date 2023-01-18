import { Subscription } from "@/subscription";
import { querySubscriptions } from "@/querySubscriptions";
import { GraphQLSchema, parse, execute } from "graphql";
import { MessageType, NextMessage } from "graphql-ws";

type PublishFn = (event: { topic: string; payload?: any }) => Promise<void>;

/**
 * Creates a publish function that will query the database for applicable subscriptions,
 * and publish to each of them
 */
export const createPublishFn =
  (
    WS_CONNECTION: DurableObjectNamespace,
    SUBSCRIPTIONS_DB: D1Database,
    schema: GraphQLSchema,
    graphqlContext: any,
    executionCtx: ExecutionContext | undefined
  ): PublishFn =>
  async (event: { topic: string; payload?: any }) => {
    // we should be able to put this in event.waitUntil as well, but this doesn't seem to work yet
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

    const promise = publishToConnections(
      subscriptions,
      WS_CONNECTION,
      schema,
      event.payload,
      graphqlContext
    );

    executionCtx?.waitUntil(promise) || (await promise);
  };

async function publishToConnections(
  subscriptions: Subscription[],
  WS_CONNECTION: DurableObjectNamespace,
  schema: GraphQLSchema,
  eventPayload: any,
  graphqlContext: any
) {
  // promises of sent subscription messages
  const promises = subscriptions.map(async (sub) => {
    // execution of subscription with payload as the root (can be modified within the resolve callback defined in schema)
    // will return the payload as is by default
    const payload = await execute({
      schema: schema,
      document: parse(sub.subscription.query),
      rootValue: eventPayload,
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
    const stubId = WS_CONNECTION.idFromString(sub.connectionId);
    const stub = WS_CONNECTION.get(stubId);
    await stub.fetch("https://ws-connection-durable-object.internal/publish", {
      method: "POST",
      body: JSON.stringify(message),
    });
  });
  return await Promise.all(promises).then(() => undefined);
}
