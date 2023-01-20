export interface Subscription {
  id: string;
  connectionPoolId: string;
  connectionId: string;
  filter?: any;
  subscription: { query: string; variables?: any; operationName: string };
  topic: string;
}
