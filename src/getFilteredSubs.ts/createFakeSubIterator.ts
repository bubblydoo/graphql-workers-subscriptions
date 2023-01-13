import { PubSubEvent, SubscribePseudoIterable } from "../types";

export const createFakeSubIterator = <
  T extends PubSubEvent,
  TRoot extends any = any,
  TArgs extends Record<string, any> = any,
  TContext extends any = any
>(
  topic: T["topic"],
  options: { filter?: () => any } = {}
): SubscribePseudoIterable<T, any> => {
  const { filter } = options;
  const handler = createHandler<T>();
  handler.topic = topic;
  handler.filter = filter;
  //   handler.onSubscribe = onSubscribe;
  //   handler.onComplete = onComplete;
  //   handler.onAfterSubscribe = onAfterSubscribe;

  return handler;
};

const createHandler = <T extends PubSubEvent>() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,require-yield
  const handler: any = async function* () {
    throw new Error("Subscription handler should not have been called");
  };
  return handler as SubscribePseudoIterable<T>;
};
