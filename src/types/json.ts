import type { REMOVE } from "../core/json/json-object-ops.js";

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONContainer = JSONObject | JSONArray;
export type JSONRoot = JSONContainer;

export type JSONValueOrUndefined = JSONValue | undefined;

/**
 * Dot separated path with optional array indices used to access nested JSON values.
 *
 * @example
 * ```typescript
 * const path: JSONPath = "user.profile.friends.0.name";
 * ```
 */
export type JSONPath = string;

export type JSONPatchFunction<T extends JSONValueOrUndefined = JSONValueOrUndefined> =
  (prev: T) => JSONValue;

/**
 * A map of dot-notation paths to update patches.
 *
 * Each patch may be:
 * - a direct value to write at the path
 * - a function that receives the current value at the path and returns the next value
 * - `undefined`, in which case the patch should be ignored
 * - the unique symbol {@link REMOVE}, in which case the property at the path should be deleted
 *
 * @example
 * ```typescript
 * const update: JSONUpdate = {
 *   "user.profile.name": "Sinber", // Direct value
 *   "user.profile.age": (oldAge: number) => oldAge + 1, // Functional patch
 *   "items.1.discount": undefined, // Which should be skipped
 *   "user.profile.email": REMOVE, // Remove the email property
 * };
 * ```
 */
export type JSONUpdate = {
  [key: string]: JSONValueOrUndefined | JSONPatchFunction<any> | typeof REMOVE;
};
