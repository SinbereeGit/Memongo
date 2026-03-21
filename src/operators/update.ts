import type { JSONUpdate, JSONValue } from "../types/json.js";
import type { WidenLiteral } from "../types/utils.js";
import type { Collection } from "../types/collection.js";

import { REMOVE } from "../core/json/json-object-ops.js";

type ValueOf<T> = T[keyof T];

const clone = <T extends JSONValue>(val: T): T =>
  JSON.parse(JSON.stringify(val));

/**
 * Update helpers for building update operations in {@link Collection.update}.
 */
export const update = {
  set: (<T extends JSONValue>(val: WidenLiteral<T>): WidenLiteral<T> =>
    clone(val)) satisfies ValueOf<JSONUpdate>,

  /**
   * Removes the target field rather than setting it to `undefined`.
   */
  remove: (): typeof REMOVE => REMOVE satisfies ValueOf<JSONUpdate>,

  inc: (diff: number): ((val: number) => number) =>
    ((val) => (val += diff)) satisfies ValueOf<JSONUpdate>,

  mul: (diff: number): ((val: number) => number) =>
    ((val) => (val *= diff)) satisfies ValueOf<JSONUpdate>,

  push: <T extends JSONValue>(
    diff: WidenLiteral<T>,
  ): ((val: WidenLiteral<T>[]) => WidenLiteral<T>[]) =>
    ((val) => (val.push(clone(diff)), val)) satisfies ValueOf<JSONUpdate>,

  pop: (): ((val: WidenLiteral<JSONValue>[]) => WidenLiteral<JSONValue>[]) =>
    ((val) => (val.pop(), val)) satisfies ValueOf<JSONUpdate>,

  shift: (): ((val: WidenLiteral<JSONValue>[]) => WidenLiteral<JSONValue>[]) =>
    ((val) => (val.shift(), val)) satisfies ValueOf<JSONUpdate>,

  unshift: <T extends JSONValue>(
    diff: WidenLiteral<T>,
  ): ((val: WidenLiteral<T>[]) => WidenLiteral<T>[]) =>
    ((val) => (val.unshift(clone(diff)), val)) satisfies ValueOf<JSONUpdate>,
};
