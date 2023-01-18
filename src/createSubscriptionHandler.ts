import { IFieldResolver } from "@graphql-tools/utils";
import { PubSubEvent, SubscribeOptions, SubscribePseudoIterable } from "@/types";

/**
 * Create a subscription handler for usage in the GraphQL schema.
 * 
 * This function implementation is confusing, but it is needed for the GraphQL schema to allow it.
 * It creates an async generator function that will never be executed, but
 * the GraphQL schema only accepts async generator functions for subscriptions.
 * It is never executed because we intercept the websocket connections in `handleSubscriptions` and
 * apply our own logic to parse the incoming subscription request.
 * We merely use this function to store the settings that the user defined in the schema (topic and filter).
 * We can then later use `fn.topic` and `fn.filter` in `handleSubscriptions`
 */
export const createSubscriptionHandler = <
  TEvent extends PubSubEvent,
  TSource = any,
  TArgs = Record<string, any>,
  TContext = any
>(
  topic: TEvent["topic"],
  options: SubscribeOptions<TEvent, TSource, TArgs, TContext> = {}
): IFieldResolver<TSource, TContext, TArgs, TEvent["payload"]> => {
  const { filter } = options;
  const handler = createHandler<SubscribePseudoIterable<TEvent, TSource, TArgs, TContext>>();
  handler.topic = topic;
  handler.filter = filter;
  // TODO: can be implemented
  // handler.onSubscribe = onSubscribe;
  // handler.onComplete = onComplete;
  // handler.onAfterSubscribe = onAfterSubscribe;

  return handler;
};

const createHandler = <T>() => {
  const handler: any = async function* () {
    throw new Error("Subscription handler should not have been called");
  };
  return handler as T;
};
