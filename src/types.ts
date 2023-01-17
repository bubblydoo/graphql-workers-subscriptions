// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/ban-types */
// import { ConnectionInitMessage, PingMessage, PongMessage } from "graphql-ws";

import { GraphQLError, GraphQLResolveInfo, GraphQLSchema } from "graphql";

// export interface ServerArgs {
//   /**
//    * A GraphQL Schema with resolvers
//    *
//    * You can use `makeExecutableSchema` from [`@graphql-tools/schema`](https://www.npmjs.com/package/@graphql-tools/schema), or `makeSchema` from [`nexus`](https://nexusjs.org/)
//    *
//    * ```ts
//    * import { makeExecutableSchema } from '@graphql-tools/schema
//    * // or
//    * import { makeSchema } from 'nexus'
//    * ```
//    */
//   schema: GraphQLSchema;
//   dynamodb: MaybePromise<DynamoDB>;
//   /**
//    * An optional ApiGatewayManagementApi object
//    */
//   apiGatewayManagementApi?: MaybePromise<ApiGatewayManagementApiSubset>;
//   /**
//    * An optional object or a promise for an object with DDB table names.
//    *
//    * Defaults to `{ connections: 'graphql_connections', subscriptions: 'graphql_subscriptions' }`
//    */
//   tableNames?: MaybePromise<{
//     connections?: string;
//     subscriptions?: string;
//   }>;
//   /**
//    * Makes the context object for all operations defaults to \{ connectionInitPayload, connectionId \}
//    */
//   context?:
//     | ((arg: {
//         connectionInitPayload: any;
//         connectionId: string;
//         publish: SubscriptionServer["publish"];
//         complete: SubscriptionServer["complete"];
//       }) => MaybePromise<object>)
//     | object;
//   /**
//    * If set you can use the `stepFunctionsHandler` and a step function to setup a per connection ping/pong cycle to detect disconnects sooner than the 10 minute idle timeout.
//    */
//   pingpong?: MaybePromise<{
//     /**
//      * The stateMachineArn for the step function for ping/pong support
//      */
//     machine: string;
//     delay: number;
//     timeout: number;
//   }>;
//   onConnect?: (e: { event: APIGatewayWebSocketEvent }) => MaybePromise<void>;
//   onDisconnect?: (e: { event: APIGatewayWebSocketEvent }) => MaybePromise<void>;
//   /*
//     Takes connection_init event and returns the connectionInitPayload to be persisted. Throw if you'd like the connection to be disconnected. Useful for auth.
//   */
//   onConnectionInit?: (e: {
//     event: APIGatewayWebSocketEvent;
//     message: ConnectionInitMessage;
//   }) => MaybePromise<Record<string, any>>;
//   onPing?: (e: {
//     event: APIGatewayWebSocketEvent;
//     message: PingMessage;
//   }) => MaybePromise<void>;
//   onPong?: (e: {
//     event: APIGatewayWebSocketEvent;
//     message: PongMessage;
//   }) => MaybePromise<void>;
//   onError?: (error: any, context: any) => MaybePromise<void>;
//   /**
//    * Defaults to debug('graphql-lambda-subscriptions') from https://www.npmjs.com/package/debug
//    */
//   log?: LoggerFunction;
// }

export type MaybePromise<T> = T | Promise<T>;

// /**
//  * @internal
//  */
// export type ServerClosure = {
//   dynamodb: DynamoDB;
//   models: {
//     subscription: DDBClient<Subscription, { id: string }>;
//     connection: DDBClient<Connection, { id: string }>;
//   };
//   log: LoggerFunction;
//   apiGatewayManagementApi?: ApiGatewayManagementApiSubset;
//   pingpong?: {
//     machine: string;
//     delay: number;
//     timeout: number;
//   };
// } & Omit<ServerArgs, "tableNames">;

// export interface SubscriptionServer {
//   /**
//    * The handler for your websocket functions
//    */
//   webSocketHandler: (
//     event: APIGatewayWebSocketEvent
//   ) => Promise<WebSocketResponse>;
//   /**
//    * The handler for your step functions powered ping/pong support
//    */
//   stepFunctionsHandler: (
//     input: StateFunctionInput
//   ) => Promise<StateFunctionInput>;
//   /**
//    * Publish an event to all relevant subscriptions. This might take some time depending on how many subscriptions there are.
//    *
//    * The payload if present will be used to match against any filters the subscriptions might have.
//    */
//   publish: (event: {
//     topic: string;
//     payload: Record<string, any>;
//   }) => Promise<void>;
//   /**
//    * Send a complete message and end all relevant subscriptions. This might take some time depending on how many subscriptions there are.
//    *
//    * The payload if present will be used to match against any filters the subscriptions might have.
//    */
//   complete: (event: {
//     topic: string;
//     payload?: Record<string, any>;
//   }) => Promise<void>;
// }

// /**
//  * Log operational events with a logger of your choice. It will get a message and usually object with relevant data
//  */
// export type LoggerFunction = (
//   message: string,
//   obj: Record<string, any>
// ) => void;

// export type WebSocketResponse = {
//   statusCode: number;
//   headers?: Record<string, string>;
//   body: string;
// };

export type SubscribeArgs<
  TRoot = unknown,
  TArgs = Record<string, any>,
  TContext = unknown
> = [root: TRoot, args: TArgs, context: TContext, info: GraphQLResolveInfo];

export type SubscriptionFilter<
  TSubscribeArgs extends SubscribeArgs = SubscribeArgs,
  TReturn extends Record<string, any> = Record<string, any>
> =
  | Partial<TReturn>
  | void
  | ((...args: TSubscribeArgs) => MaybePromise<Partial<TReturn> | void>);

// export type SubscribeHandler = <T extends PubSubEvent>(
//   ...args: any[]
// ) => SubscribePseudoIterable<T>;

export interface SubscribePseudoIterable<
  T extends PubSubEvent,
  TSubscribeArgs extends SubscribeArgs = SubscribeArgs
> {
  (...args: TSubscribeArgs): AsyncGenerator<T, never, unknown>;
  topic: string;
  filter?: SubscriptionFilter<TSubscribeArgs, T["payload"]>;
  onSubscribe?: (
    ...args: TSubscribeArgs
  ) => MaybePromise<void | GraphQLError[]>;
  onAfterSubscribe?: (...args: TSubscribeArgs) => MaybePromise<void>;
  onComplete?: (...args: TSubscribeArgs) => MaybePromise<void>;
}

// export interface SubscribeOptions<
//   T extends PubSubEvent,
//   TSubscribeArgs extends SubscribeArgs = SubscribeArgs
// > {
//   /**
//    * An object or a function that returns an object that will be matched against the `payload` of a published event. If the payload's field equals the filter the subscription will receive the event. If the payload is missing the filter's field the subscription will receive the event.
//    */
//   filter?: SubscriptionFilter<TSubscribeArgs, T["payload"]>;
//   /**
//    * Gets resolver arguments to perform work before a subscription is allowed. This is useful for checking arguments or
//    * validating permissions. Return an array of GraphqlErrors if you don't want the subscription to subscribe.
//    */
//   onSubscribe?: (
//     ...args: TSubscribeArgs
//   ) => MaybePromise<void | GraphQLError[]>;
//   /**
//    * Gets resolver arguments to perform work after a subscription saved. This is useful for sending out initial events.
//    */
//   onAfterSubscribe?: (...args: TSubscribeArgs) => MaybePromise<void>;
//   /**
//    * Called at least once. Gets resolver arguments to perform work after a subscription has ended. This is useful for bookkeeping or logging. This callback will fire
//    *
//    * If the client disconnects, sends a `complete` message, or the server sends a `complete` message via the pub/sub system. Because of the nature of aws lambda, it's possible for a client to send a "complete" message immediately disconnect and have those events execute on lambda out of order. Which why this function can be called up to twice.
//    */
//   onComplete?: (...args: TSubscribeArgs) => MaybePromise<void>;
// }

// export interface StateFunctionInput {
//   connectionId: string;
//   domainName: string;
//   stage: string;
//   state: "PING" | "REVIEW" | "ABORT";
//   seconds: number;
// }

// export interface APIGatewayWebSocketRequestContext
//   extends APIGatewayEventRequestContext {
//   connectionId: string;
//   domainName: string;
// }

// export interface APIGatewayWebSocketEvent extends APIGatewayProxyEvent {
//   requestContext: APIGatewayWebSocketRequestContext;
// }

export interface PubSubEvent {
  topic: string;
  payload: Record<string, any>;
}

export type SetGraphqlContextCallBack<Env extends {} = {}> = (
  request: Request,
  env: Env,
  executionContext?: ExecutionContext
) => Promise<any>;
// export type MessageHandler<T> = (arg: {
//   server: ServerClosure;
//   event: APIGatewayWebSocketEvent;
//   message: T;
// }) => Promise<void>;

// /*
//   Matches the ApiGatewayManagementApi class from aws-sdk but only provides the methods we use
// */
// export interface ApiGatewayManagementApiSubset {
//   postToConnection(input: { ConnectionId: string; Data: string }): {
//     promise: () => Promise<any>;
//   };
//   deleteConnection(input: { ConnectionId: string }): {
//     promise: () => Promise<any>;
//   };
// }

// /**
//  * Connection established with `connection_init`
//  * @internal
//  */
// export interface Connection {
//   /** ConnectionID **/
//   id: string;
//   createdAt: number;
//   /** Request context from $connect event */
//   requestContext: APIGatewayWebSocketRequestContext;
//   /** connection_init payload (post-parse) */
//   payload: Record<string, any>;
//   /** has a pong been returned */
//   hasPonged: boolean;
//   ttl: number;
// }

// /**
//  * Active subscriptions
//  * @internal
//  */
// export interface Subscription {
//   /*
//    * connectionId|subscriptionId
//    */
//   id: string;
//   topic: string;
//   createdAt: number;
//   filter: Record<string, unknown>;
//   connectionId: string;
//   subscriptionId: string;
//   connectionInitPayload: Record<string, unknown>;
//   requestContext: APIGatewayWebSocketRequestContext;
//   subscription: {
//     query: string;
//     /** Actual value of variables for given field */
//     variables?: any;
//     /** Value of variables for user provided subscription */
//     variableValues?: any;
//     operationName?: string | null;
//   };
//   ttl: number;
// }

// /**
//  * All dynamodb tables
//  * @internal
//  */
// export type DDBType = Connection | Subscription;
