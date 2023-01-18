const getQuerySubscriptionsSql = (
  dbName: string,
  topic: string,
  filter: any
) => {
  return {
    sql: `SELECT * FROM ${dbName} WHERE topic = ?1 AND (filter is null OR json_patch(?2, filter) = ?2);`,
    binds: [topic, JSON.stringify(filter)],
  };
};

/**
 * Query all subscriptions in the db by topic and filter
 */
export const querySubscriptions = (
  db: D1Database,
  dbName: string,
  topic: string,
  filter: any
) => {
  const { sql, binds } = getQuerySubscriptionsSql(dbName, topic, filter);

  console.log(db);
  console.log(sql, binds);

  return db
    .prepare(sql)
    .bind(...binds)
    .all();
};
