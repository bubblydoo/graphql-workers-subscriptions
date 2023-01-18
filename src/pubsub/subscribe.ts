import { parse } from "graphql";
import type { SubscribePseudoIterable, PubSubEvent } from "../types";
import {
  buildExecutionContext,
  ExecutionContext,
} from "graphql/execution/execute";
import { getResolverAndArgs } from "../utils/getResolverAndArgs";
import { GraphQLSchema } from "graphql";

export const createSubscription = async (
  connectionId: string,
  schema: GraphQLSchema,
  data: any,
  SUBSCRIPTIONS_DB: D1Database
) => {
  // extract subscriptoin related values based on schema
  const execContext = buildExecutionContext({
    schema,
    document: parse(data.payload.query),
    variableValues: data.payload.variables,
    operationName: data.payload.operationName,
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
    "INSERT INTO Subscriptions(id,connectionId, subscription, topic, filter) VALUES(?,?,?,?,?);"
  )
    .bind(
      data.id,
      connectionId,
      JSON.stringify({
        query: data.payload.query,
        variables: data.payload.variables,
        operationName: data.payload.operationName,
      }),
      topic,
      JSON.stringify(filterData)
    )
    .run()
    .then();
};
