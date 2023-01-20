import { parse } from "graphql";
import type { SubscribePseudoIterable, PubSubEvent } from "./types";
import {
  buildExecutionContext,
  ExecutionContext,
} from "graphql/execution/execute";
import { getResolverAndArgs } from "./getResolverAndArgs";
import { GraphQLSchema } from "graphql";
import { SubscribeMessage } from "graphql-ws";

/** Creates a subscription in the database */
export const createSubscription = async (
  connectionPoolId: string,
  connectionId: string,
  schema: GraphQLSchema,
  message: SubscribeMessage,
  SUBSCRIPTIONS_DB: D1Database
) => {
  // extract subscription related values based on schema
  const execContext = buildExecutionContext({
    schema,
    document: parse(message.payload.query),
    variableValues: message.payload.variables,
    operationName: message.payload.operationName,
  }) as ExecutionContext;
  const { field, root, args, context, info } = getResolverAndArgs({
    execContext,
  });

  if (!field) {
    throw new Error("No field");
  }

  const { topic, filter } =
    field.subscribe as SubscribePseudoIterable<PubSubEvent>;
  // execute filter callback if defined (return filter data saved to D1)
  const filterData =
    typeof filter === "function" ? filter(root, args, context, info) : filter;

  // write subscription to D1

  await SUBSCRIPTIONS_DB.prepare(
    "INSERT INTO Subscriptions(id,connectionPoolId,connectionId,subscription,topic,filter) VALUES(?,?,?,?,?,?);"
  )
    .bind(
      message.id,
      connectionPoolId,
      connectionId,
      JSON.stringify({
        query: message.payload.query,
        variables: message.payload.variables,
        operationName: message.payload.operationName,
      }),
      topic,
      JSON.stringify(filterData)
    )
    .run()
    .then();
};

export const deleteSubscription = async (connectionId: string, SUBSCRIPTIONS_DB: D1Database) => {
  await SUBSCRIPTIONS_DB.prepare(
    "DELETE FROM Subscriptions WHERE connectionId = ?;"
  )
    .bind(connectionId)
    .run();
}