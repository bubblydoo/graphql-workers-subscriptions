import { IFieldResolver } from "@graphql-tools/utils";
import { PubSubEvent, SubscribeOptions, SubscribePseudoIterable, SubscriptionFilter } from "@/types";

export const createFakeSubIterator = <
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
