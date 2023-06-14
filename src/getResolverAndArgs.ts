import { GraphQLError } from "graphql";
import {
  buildResolveInfo,
  type ExecutionContext,
  getFieldDef,
  collectFields, 
  getArgumentValues,
  addPath,
} from "./graphqlInternals";

interface ResolverAndArgs {
  field: ReturnType<typeof getFieldDef>;
  root: null;
  args: ExecutionContext["variableValues"];
  context: ExecutionContext["contextValue"];
  info: ReturnType<typeof buildResolveInfo>;
}

export const getResolverAndArgs = ({
  execContext,
}: {
  execContext: ExecutionContext;
}): ResolverAndArgs => {
  // Taken from graphql-js executeSubscription - https://github.com/graphql/graphql-js/blob/main/src/execution/subscribe.ts#L187
  // TODO: update with https://github.dev/graphql/graphql-js/blob/8be83d8d528991aed04ca17434b7e26e56f649cf/src/execution/execute.ts#L1680
  const { schema, fragments, operation, variableValues, contextValue } =
    execContext;

  const rootType = schema.getSubscriptionType();
  if (rootType == null) {
    throw new GraphQLError(
      "Schema is not configured to execute subscription operation.",
      operation
    );
  }

  const rootFields = collectFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet
  );
  const [responseName, fieldNodes] = [...rootFields.entries()][0];
  const fieldDef = getFieldDef(schema, rootType, fieldNodes[0]);

  if (!fieldDef) {
    const fieldName = fieldNodes[0].name.value;
    throw new GraphQLError(
      `The subscription field "${fieldName}" is not defined.`,
      fieldNodes
    );
  }

  const path = addPath(undefined, responseName, rootType.name);
  const info = buildResolveInfo(
    execContext,
    fieldDef,
    fieldNodes,
    rootType,
    path
  );

  const args = getArgumentValues(fieldDef, fieldNodes[0], variableValues);

  return {
    field: fieldDef,
    root: null,
    args,
    context: contextValue,
    info,
  };
};
