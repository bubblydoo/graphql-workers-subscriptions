
import { GraphQLSchema } from "graphql";
import { createPublishFn } from "./pubsub/publish";

export { handleSubscriptions } from "./handler";
export { createWsConnectionClass } from "./wsConnection";
export { createFakeSubIterator as subscribe } from "./utils/createFakeSubIterator";

export type ContextPublishFn = (topic: string, payload: any) => Promise<void>;

export type DefaultPublishableContext<Env extends {} = {}> = {
  env: Env;
  executionCtx: ExecutionContext;
  publish: ContextPublishFn;
};

export function createDefaultPublishableContext<Env extends {} = {}>({
  env,
  executionCtx,
  schema,
  getWSConnectionDO,
  getSubscriptionsDB,
}: {
  env: Env;
  executionCtx: ExecutionContext;
  schema: GraphQLSchema;
  getWSConnectionDO: (env: Env) => DurableObjectNamespace;
  getSubscriptionsDB: (env: Env) => D1Database;
}) {
  const publishableCtx: DefaultPublishableContext<Env> = {
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
