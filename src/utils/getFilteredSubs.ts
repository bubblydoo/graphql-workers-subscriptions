import { Subscription } from "../models/subscription";
import { ENV } from "..";
import { isMatch } from "lodash";
export const getFilteredSubs = async (
  env: ENV,
  event: { topic: string; payload?: Record<string, any> }
): Promise<Subscription[]> => {
  const { results } = await env.SUBSCRIPTIONS_DEV.prepare(
    "SELECT * FROM Subscriptions WHERE topic = ?"
  )
    .bind(event.topic)
    .all();
  //   if (!event.payload || Object.keys(event.payload).length === 0) {
  const parsedResults = results?.map((res: any) => ({
    ...res,
    filter: typeof res.filter === "string" ? JSON.parse(res.filter) : undefined,
    subscription:
      typeof res.subscription === "string"
        ? JSON.parse(res.subscription)
        : undefined,
  })) as Subscription[] | [];

  const filteredResults = parsedResults.filter((sub) =>
    sub.filter && event.payload ? isMatch(event.payload, sub.filter) : true
  );
  return filteredResults;
  //   }
  //   const flattenPayload = collapseKeys(event.payload);

  //   const filterExpressions: string[] = [];
  //   const expressionAttributeValues: {
  //     [key: string]: string | number | boolean;
  //   } = {};
  //   const expressionAttributeNames: { [key: string]: string } = {};

  //   let attributeCounter = 0;
  //   for (const [key, value] of Object.entries(flattenPayload)) {
  //     const aliasNumber = attributeCounter++;
  //     expressionAttributeNames[`#${aliasNumber}`] = key;
  //     expressionAttributeValues[`:${aliasNumber}`] = value;
  //     filterExpressions.push(
  //       `(#filter.#${aliasNumber} = :${aliasNumber} OR attribute_not_exists(#filter.#${aliasNumber}))`
  //     );
  //   }

  //   server.log("getFilteredSubs", {
  //     event,
  //     expressionAttributeNames,
  //     expressionAttributeValues,
  //     filterExpressions,
  //   });

  //   const iterator = server.models.subscription.query({
  //     IndexName: "TopicIndex",
  //     ExpressionAttributeNames: {
  //       "#hashKey": "topic",
  //       "#filter": "filter",
  //       ...expressionAttributeNames,
  //     },
  //     ExpressionAttributeValues: {
  //       ":hashKey": event.topic,
  //       ...expressionAttributeValues,
  //     },
  //     KeyConditionExpression: "#hashKey = :hashKey",
  //     FilterExpression: filterExpressions.join(" AND ") || undefined,
  //   });

  //   return await collect(iterator);
  // };

  // export const collapseKeys = (
  //   obj: Record<string, any>
  // ): Record<string, number | string | boolean> => {
  //   const record = {};
  //   for (const [k1, v1] of Object.entries(obj)) {
  //     if (
  //       typeof v1 === "string" ||
  //       typeof v1 === "number" ||
  //       typeof v1 === "boolean"
  //     ) {
  //       record[k1] = v1;
  //       continue;
  //     }

  //     if (v1 && typeof v1 === "object") {
  //       const next = {};

  //       for (const [k2, v2] of Object.entries(v1)) {
  //         next[`${k1}.${k2}`] = v2;
  //       }

  //       for (const [k1, v1] of Object.entries(collapseKeys(next))) {
  //         record[k1] = v1;
  //       }
  //     }
  //   }
  //   return record;
};
