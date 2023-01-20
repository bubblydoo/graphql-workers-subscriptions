import { parse } from "graphql";
import type { SubscribePseudoIterable, PubSubEvent } from "./types";
import {
  buildExecutionContext,
  ExecutionContext,
} from "graphql/execution/execute";
import { getResolverAndArgs } from "./getResolverAndArgs";
import { GraphQLSchema } from "graphql";
import { SubscribeMessage } from "graphql-ws";
import { log } from "./log";

/** Creates a subscription in the database */
export const createSubscription = async (
  connectionPoolId: string,
  connectionId: string,
  schema: GraphQLSchema,
  message: SubscribeMessage,
  db: D1Database
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

  log(
    "Inserting connection into db",
    connectionId,
    "pool:",
    connectionPoolId,
    "topic:",
    topic
  );
  await db.prepare(
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

export const deleteSubscription = async (
  connectionId: string,
  db: D1Database
) => {
  log("Deleting connection from db", connectionId);
  await db.prepare(
    "DELETE FROM Subscriptions WHERE connectionId = ?;"
  )
    .bind(connectionId)
    .run();
};

const getQuerySubscriptionsSql = (
  dbName: string,
  topic: string,
  filter: any
) => {
  return {
    sql: `SELECT * FROM ${dbName} WHERE topic = ?1 AND (filter is null OR json_patch(?2, filter) = ?2);`,
    binds: [topic, JSON.stringify(filter)],
  };
};

/**
 * Query all subscriptions in the db by topic and filter
 */
export const querySubscriptions = (
  db: D1Database,
  dbName: string,
  topic: string,
  filter: any
) => {
  log("Querying db", topic, filter);

  const { sql, binds } = getQuerySubscriptionsSql(dbName, topic, filter);

  return db
    .prepare(sql)
    .bind(...binds)
    .all();
};
