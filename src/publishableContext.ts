import { GraphQLSchema } from "graphql";
import { createPublishFn } from "./createPublishFn";

export { handleSubscriptions } from "./handler";
export { createWsConnectionClass } from "./wsConnection";
export { createSubscriptionHandler as subscribe } from "./createSubscriptionHandler";

export type ContextPublishFn = (topic: string, payload: any) => Promise<void>;

export type DefaultPublishableContext<Env extends {} = {}, TExecutionContext = ExecutionContext> = {
  env: Env;
  executionCtx: TExecutionContext;
  publish: ContextPublishFn;
};

/**
 * Creates a context with 3 keys: `env`, `executionCtx`, and `publish`.
 * The context used to resolve the subscriptions on publish also has these 3 keys.
 * If you want to change the context, you will have to copy this function code.
 */
export function createDefaultPublishableContext<Env extends {} = {}, TExecutionContext = ExecutionContext>({
  env,
  executionCtx,
  schema,
  wsConnection: getWSConnectionDO,
  subscriptionsDb: getSubscriptionsDB,
}: {
  env: Env;
  executionCtx: TExecutionContext
  schema: GraphQLSchema;
  wsConnection: (env: Env) => DurableObjectNamespace;
  subscriptionsDb: (env: Env) => D1Database;
}) {
  const publishableCtx: DefaultPublishableContext<Env, TExecutionContext> = {
    env,
    executionCtx,
    publish: (topic, payload) => {
      const publishFn = createPublishFn(
        getWSConnectionDO(env),
        getSubscriptionsDB(env),
        schema,
        publishableCtx
      );

      return publishFn({ topic, payload });
    },
  };
  return publishableCtx;
}
