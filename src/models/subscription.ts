export interface Subscription {
  id: string;
  connectionId: string;
  filter?: string;
  subscription: { query: string; variables?: any; operationName: string };
  topic: string;
}
