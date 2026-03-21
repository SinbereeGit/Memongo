import type { JSONValueOrUndefined } from "./json.js";

export type QueryFunction<
  T extends JSONValueOrUndefined = JSONValueOrUndefined,
> = (value: T) => boolean;

export interface QueryCommand<
  T extends JSONValueOrUndefined = JSONValueOrUndefined,
> {
  and(queryCommand: QueryCommand<T>): QueryCommand<T>;
  or(queryCommand: QueryCommand<T>): QueryCommand<T>;
  not(): QueryCommand<T>;
  exec(val: T): boolean;
}
