import type {
  JSONContainer,
  JSONObject,
  JSONPath,
  JSONUpdate,
  JSONValue,
  JSONValueOrUndefined,
} from "../../types/json.js";

import { PathConflictError } from "../../errors.js";
import { isJSONArray, isJSONContainer, isJSONObject } from "./json-guards.js";

function isArrayIndex(key: string): boolean {
  return /^\d+$/.test(key);
}

/**
 * A unique sentinel value representing a removal.
 *
 * This value is used to explicitly indicate that something
 * should be removed, rather than assigned a value.
 */
export const REMOVE = Symbol("remove");

export const JSONObjectOps = {
  /**
   * Returns `undefined` if the path does not exist.
   * Object and array values are returned by reference, not cloned.
   */
  getByPath(obj: JSONObject, path: JSONPath): JSONValueOrUndefined {
    const keys = path.split(".");

    let cur: JSONValueOrUndefined = obj;

    for (const k of keys) {
      if (isJSONArray(cur)) {
        cur = cur[Number(k)];
        continue;
      }
      if (isJSONObject(cur)) {
        cur = cur[k];
        continue;
      } else return undefined;
    }

    return cur;
  },

  /**
   * Creates missing intermediate containers automatically.
   * Mutates `obj` in place.
   *
   * This operation is transactional: if it throws, the object is left unchanged.
   *
   * @throws
   * - {@link PathConflictError}: If the path conflicts with an existing non-container value or an invalid array index.
   */
  setByPath(obj: JSONObject, path: JSONPath, value: JSONValue): void {
    const keys = path.split(".");

    const makeContainer = (k: string): JSONContainer =>
      isArrayIndex(k) ? [] : {};

    const parent = keys.slice(0, -1).reduce<JSONContainer>((cur, k, i) => {
      const nextK = keys[i + 1] as string;

      if (isJSONArray(cur)) {
        if (!isArrayIndex(k)) throw new PathConflictError(path, k);

        const index = Number(k);

        if (cur[index] === undefined) {
          cur[index] = makeContainer(nextK);
          return cur[index] as JSONContainer;
        } else if (!isJSONContainer(cur[index])) {
          throw new PathConflictError(path, nextK);
        }

        return cur[index] as JSONContainer;
      }

      if (cur[k] === undefined) {
        cur[k] = makeContainer(nextK);
        return cur[k] as JSONContainer;
      } else if (!isJSONContainer(cur[k])) {
        throw new PathConflictError(path, nextK);
      }

      return cur[k] as JSONContainer;
    }, obj);

    const last = keys[keys.length - 1] as string;

    if (Array.isArray(parent)) {
      if (!isArrayIndex(last)) throw new PathConflictError(path, last);
      parent[Number(last)] = value;
    } else {
      parent[last] = value;
    }
  },

  /**
   * Creates a deep copy of a JSON object via JSON serialization.
   */
  clone<T extends JSONObject = JSONObject>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Mutates `obj` in place.
   *
   * This operation is non-transactional: updates are applied one by one,
   * and if a later update throws, earlier changes remain in place.
   *
   * @throws Propagates errors thrown by {@link setByPath}.
   */
  update(obj: JSONObject, update: JSONUpdate): void {
    for (const key in update) {
      const patch = update[key];
      if (patch === undefined) continue;

      const value =
        typeof patch === "function"
          ? patch(JSONObjectOps.getByPath(obj, key))
          : patch === REMOVE
            ? null
            : patch;

      JSONObjectOps.setByPath(obj, key, value);

      if (patch === REMOVE) {
        const keys = key.split(".");

        const parent = keys.slice(0, -1).reduce<JSONContainer>((cur, k) => {
          return (cur as JSONObject)[k] as JSONContainer;
        }, obj);

        delete (parent as JSONObject)[keys[keys.length - 1]!];
      }
    }
  },
};
