export interface Subscription {
  connectionId: string;
  filter?: string;
  subscription: { query: string; variables?: any; operationName: string };
  topic: string;
}
