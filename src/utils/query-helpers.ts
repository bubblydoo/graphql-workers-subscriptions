const traverse = (
  obj: any,
  cb: (path: (string | number)[], value: any) => void,
  path: (string | number)[] = []
) => {
  for (const k in obj) {
    const v = obj[k];
    const kWithType = Array.isArray(obj) ? +k : k;
    if (typeof v === "object") {
      traverse(v, cb, [...path, kWithType]);
    } else {
      cb([...path, kWithType], v);
    }
  }
};

const filterObjectToSqliteClauses = (obj: any) => {
  const whereClauses: string[] = [];
  const binds: string[] = [];

  whereClauses[0] = `json_patch(?1, filter) = ?1`;
  binds[0] = `'${JSON.stringify(obj)}'`;
  // traverse(obj, (path, value) => {
  //   const pathString = path.reduce(
  //     (p, c) => (typeof c === "number" ? `${p}[${c}]` : `${p}.${c}`),
  //     "$"
  //   );
  //   whereClauses.push(`json_extract(filter, '${pathString}') = ?`);
  //   binds.push(value);
  // });

  return { whereClauses, binds };
};

const getQuerySubscriptionsSql = (
  dbName: string,
  topic: string,
  filter: any
) => {
  const allWhereClauses = [`topic = ?1`, `json_patch(?2, filter) = ?2`];

  return {
    sql: `SELECT * FROM ${dbName} WHERE ${allWhereClauses.join(" AND ")};`,
    binds: [topic, JSON.stringify(filter)],
  };
};

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
