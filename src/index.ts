import { GraphQLSchema } from "graphql";
import { publish } from "./pubsub/publish";

export { handleSubscriptions } from "./handler";
export { createWsConnectionClass } from "./wsConnection";
export { createFakeSubIterator as subscribe } from "./utils/createFakeSubIterator";

export type PublishableContext = {
  publish: (topic: string, payload: any) => void;
};

export type DefaultPublishableContext<Env extends {} = {}> = {
  env: Env;
  executionCtx: ExecutionContext;
} & PublishableContext;

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
      const publishFn = publish(
        getWSConnectionDO(env),
        getSubscriptionsDB(env),
        schema,
        publishableCtx
      );
      executionCtx.waitUntil(publishFn({ topic, payload }));
    },
  };
  return publishableCtx;
}
