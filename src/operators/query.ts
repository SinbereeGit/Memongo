import type { JSONValue } from "../types/json.js";
import type { WidenLiteral } from "../types/utils.js";
import type { QueryCommand } from "../types/query-command.js";
import type { Collection } from "../types/collection.js";

import { MemongoQueryCommand } from "../core/memongo/query-command.js";

/**
 * Query helpers for building query conditions in {@link Collection.where}.
 */
export const query = {
  /**
   * Matches values using strict equality (`===`).
   */
  eq: <T extends JSONValue>(queryCondition: T): QueryCommand<WidenLiteral<T>> =>
    new MemongoQueryCommand<WidenLiteral<T>>((val) => val === queryCondition),

  /**
   * Matches values using strict inequality (`!==`).
   */
  neq: <T extends JSONValue>(
    queryCondition: T,
  ): QueryCommand<WidenLiteral<T>> =>
    new MemongoQueryCommand<WidenLiteral<T>>((val) => val !== queryCondition),

  lt: (queryCondition: number): QueryCommand<number> =>
    new MemongoQueryCommand<number>((val) => val < queryCondition),

  lte: (queryCondition: number): QueryCommand<number> =>
    new MemongoQueryCommand<number>((val) => val <= queryCondition),

  gt: (queryCondition: number): QueryCommand<number> =>
    new MemongoQueryCommand<number>((val) => val > queryCondition),

  gte: (queryCondition: number): QueryCommand<number> =>
    new MemongoQueryCommand<number>((val) => val >= queryCondition),

  /**
   * Matches values included in the given array using [Array.prototype.includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).
   *
   */
  in: <T extends JSONValue>(
    queryCondition: WidenLiteral<T>[],
  ): QueryCommand<WidenLiteral<T>> =>
    new MemongoQueryCommand<WidenLiteral<T>>((val) =>
      queryCondition.includes(val),
    ),

  /**
   * Matches values NOT included in the given array using [Array.prototype.includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).
   */
  nin: <T extends JSONValue>(
    queryCondition: WidenLiteral<T>[],
  ): QueryCommand<WidenLiteral<T>> =>
    new MemongoQueryCommand<WidenLiteral<T>>(
      (val) => !queryCondition.includes(val),
    ),

  exists: (): QueryCommand<any> =>
    new MemongoQueryCommand<any>((val) => (val === undefined ? false : true)),

  nexists: (): QueryCommand<any> =>
    new MemongoQueryCommand<any>((val) => (val === undefined ? true : false)),

  and: <T extends JSONValue>(...cmds: QueryCommand<T>[]): QueryCommand<T> =>
    new MemongoQueryCommand<T>((val) => cmds.every((cmd) => cmd.exec(val))),

  or: <T extends JSONValue>(...cmds: QueryCommand<T>[]): QueryCommand<T> =>
    new MemongoQueryCommand<T>((val) => cmds.some((cmd) => cmd.exec(val))),

  not: <T extends JSONValue>(cmd: QueryCommand<T>): QueryCommand<T> =>
    new MemongoQueryCommand<T>((val) => !cmd.exec(val)),
};
