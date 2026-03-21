import type {
  JSONValueOrUndefined,
  JSONContainer,
  JSONArray,
  JSONObject,
} from "../../types/json.js";

export function isJSONContainer(v: JSONValueOrUndefined): v is JSONContainer {
  return typeof v === "object" && v !== null;
}

export function isJSONArray(v: JSONValueOrUndefined): v is JSONArray {
  return Array.isArray(v);
}

export function isJSONObject(v: JSONValueOrUndefined): v is JSONObject {
  return isJSONContainer(v) && !isJSONArray(v);
}
