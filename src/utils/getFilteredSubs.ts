import { Subscription } from "../models/subscription";
import { isMatch } from "lodash";

// queries and returns a set (filtered) of subscriptions from D1
export const getFilteredSubs = async (
  SUBSCRIPTIONS_DB: D1Database,
  event: { topic: string; payload?: Record<string, any> }
): Promise<Subscription[]> => {
  // build and execute query
  const { results } = await SUBSCRIPTIONS_DB.prepare(
    "SELECT * FROM Subscriptions WHERE topic = ?"
  )
    .bind(event.topic)
    .all();
  // parsing stringified JSON fields
  const parsedResults = results?.map((res: any) => ({
    ...res,
    filter: typeof res.filter === "string" ? JSON.parse(res.filter) : undefined,
    subscription:
      typeof res.subscription === "string"
        ? JSON.parse(res.subscription)
        : undefined,
  })) as Subscription[] | [];

  // compare payload with filter if defined (filter must be a subset of payload)
  const filteredResults = parsedResults.filter((sub) =>
    sub.filter && event.payload ? isMatch(event.payload, sub.filter) : true
  );
  return filteredResults;
};
