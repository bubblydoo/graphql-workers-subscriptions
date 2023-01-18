import { GraphQLResolveInfo } from "graphql";
import { PubSubEvent, SubscriptionFilter } from "../src/types";
import { IFieldResolver } from "@graphql-tools/utils";

export interface SubscribePseudoIterable<
  TEvent extends PubSubEvent,
  TSource = any,
  TArgs = Record<string, any>,
  TContext = any
> extends IFieldResolver<TSource, TContext, TArgs, TEvent["payload"]> {
  (
    root: TSource,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
  ): AsyncGenerator<TEvent, never, unknown>;
  topic: string;
  filter?: SubscriptionFilter<TSource, TArgs, TContext, TEvent["payload"]>;
  // onSubscribe?: (
  //   ...args: TSubscribeArgs
  // ) => MaybePromise<void | GraphQLError[]>;
  // onAfterSubscribe?: (...args: TSubscribeArgs) => MaybePromise<void>;
  // onComplete?: (...args: TSubscribeArgs) => MaybePromise<void>;
}
