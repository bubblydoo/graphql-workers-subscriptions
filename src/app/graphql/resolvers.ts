import { createFakeSubIterator } from "../../utils/createFakeSubIterator";

export const resolvers = {
  Query: {
    hello: () => "Hello World!",
  },
  Subscription: {
    greetings: {
      subscribe: createFakeSubIterator("LIST_GREETINGS", {
        filter: () => {
          return { greetings: "hehe" };
        },
      }),
    },
  },
};
